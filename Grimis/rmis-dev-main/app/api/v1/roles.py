from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleWithUsers,
    RoleUserResponse,
    Permission,
    RolePermissionUpdate
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()


async def user_has_permission(user: dict, required_permission: Permission) -> bool:
    """Check if user has required permission through their roles or groups"""
    if user.get("role") == UserRole.SUPER_ADMIN:
        return True

    db = await Database.get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})

    if not user_doc:
        return False

    # Check role permissions first
    role_ids = user_doc.get("role_ids", [])
    if role_ids:
        async for role in db.roles.find({"_id": {"$in": [ObjectId(rid) for rid in role_ids]}}):
            if required_permission in role.get("permissions", []):
                return True

    # Fall back to group permissions
    group_ids = user_doc.get("group_ids", [])
    if group_ids:
        async for group in db.groups.find({"_id": {"$in": [ObjectId(gid) for gid in group_ids]}}):
            if required_permission in group.get("permissions", []):
                return True

    return False


@router.post("", response_model=RoleResponse)
async def create_role(
    role: RoleCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new role.

    Permissions:
    - SUPER_ADMIN can create any role
    - Users with MANAGE_ROLES permission can create roles
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to create roles"
            )

    db = await Database.get_db()

    # Check if role name already exists
    existing = await db.roles.find_one({"name": role.name})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Role name already exists"
        )

    role_dict = role.dict()
    role_dict["created_at"] = datetime.utcnow()
    role_dict["updated_at"] = datetime.utcnow()

    result = await db.roles.insert_one(role_dict)
    created = await db.roles.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    created["user_count"] = len(created.get("user_ids", []))

    return RoleResponse(**created)


@router.get("", response_model=List[RoleResponse])
async def get_roles(
    search: Optional[str] = Query(None, description="Search role by name"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of all roles.

    Permissions:
    - SUPER_ADMIN can view all roles
    - Users with VIEW_ROLES permission can view roles
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.VIEW_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to view roles"
            )

    db = await Database.get_db()

    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    roles = []
    async for role in db.roles.find(query).sort("name", 1):
        role["id"] = str(role.pop("_id"))
        role["user_count"] = len(role.get("user_ids", []))
        roles.append(RoleResponse(**role))

    return roles


@router.get("/{role_id}", response_model=RoleWithUsers)
async def get_role_by_id(
    role_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific role by ID with user details.
    """
    db = await Database.get_db()

    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    role["id"] = str(role.pop("_id"))

    # Get user details
    users = []
    user_ids = role.get("user_ids", [])
    for user_id in user_ids:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                users.append(RoleUserResponse(
                    user_id=str(user["_id"]),
                    username=user["username"],
                    email=user["email"],
                    nama_depan=user["nama_depan"],
                    nama_belakang=user["nama_belakang"],
                    role=user["role"]
                ))
        except:
            continue

    role["users"] = users
    role["user_count"] = len(users)

    return RoleWithUsers(**role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    role: RoleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a role.

    Permissions:
    - SUPER_ADMIN can update any role
    - Users with MANAGE_ROLES permission can update roles
    """
    db = await Database.get_db()

    try:
        existing = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to update roles"
            )

    update_data = role.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    # If updating user_ids, we need to update users' role_ids as well
    if "user_ids" in update_data:
        new_user_ids = update_data["user_ids"] or []
        old_user_ids = existing.get("user_ids", [])

        # Remove role_id from users no longer having this role
        for old_id in old_user_ids:
            if old_id not in new_user_ids:
                try:
                    await db.users.update_one(
                        {"_id": ObjectId(old_id)},
                        {"$pull": {"role_ids": role_id}}
                    )
                except:
                    pass

        # Add role_id to new users
        for new_id in new_user_ids:
            if new_id not in old_user_ids:
                try:
                    await db.users.update_one(
                        {"_id": ObjectId(new_id)},
                        {"$addToSet": {"role_ids": role_id}}
                    )
                except:
                    pass

    await db.roles.update_one(
        {"_id": ObjectId(role_id)},
        {"$set": update_data}
    )

    updated = await db.roles.find_one({"_id": ObjectId(role_id)})
    updated["id"] = role_id
    updated["user_count"] = len(updated.get("user_ids", []))

    return RoleResponse(**updated)


@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a role.

    Permissions:
    - SUPER_ADMIN can delete any role
    - Users with MANAGE_ROLES permission can delete roles
    """
    db = await Database.get_db()

    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to delete roles"
            )

    # Remove role_id from all users
    user_ids = role.get("user_ids", [])
    for user_id in user_ids:
        try:
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"role_ids": role_id}}
            )
        except:
            pass

    result = await db.roles.delete_one({"_id": ObjectId(role_id)})

    return {"message": "Role deleted successfully"}


@router.post("/{role_id}/users/{user_id}")
async def assign_role_to_user(
    role_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a role to a user.
    """
    db = await Database.get_db()

    # Validate role exists
    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Validate user exists
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent root users from being assigned roles (they have all permissions anyway)
    if user.get("is_root", False):
        raise HTTPException(
            status_code=403,
            detail="Root users already have all permissions, roles cannot be assigned"
        )

    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage role assignments"
            )

    # Add user to role
    await db.roles.update_one(
        {"_id": ObjectId(role_id)},
        {"$addToSet": {"user_ids": user_id}}
    )

    # Add role to user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"role_ids": role_id}}
    )

    return {"message": "Role assigned to user successfully"}


@router.delete("/{role_id}/users/{user_id}")
async def remove_role_from_user(
    role_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a role from a user.
    """
    db = await Database.get_db()

    # Validate role exists
    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage role assignments"
            )

    # Remove user from role
    await db.roles.update_one(
        {"_id": ObjectId(role_id)},
        {"$pull": {"user_ids": user_id}}
    )

    # Remove role from user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"role_ids": role_id}}
    )

    return {"message": "Role removed from user successfully"}


@router.get("/{role_id}/permissions", response_model=List[Permission])
async def get_role_permissions(
    role_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get permissions for a specific role.
    """
    db = await Database.get_db()

    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return role.get("permissions", [])


@router.put("/{role_id}/permissions")
async def update_role_permissions(
    role_id: str,
    data: RolePermissionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update permissions for a role.
    """
    db = await Database.get_db()

    # Validate role exists
    try:
        role = await db.roles.find_one({"_id": ObjectId(role_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid role ID")

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_ROLES)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage role permissions"
            )

    await db.roles.update_one(
        {"_id": ObjectId(role_id)},
        {"$set": {"permissions": data.permissions, "updated_at": datetime.utcnow()}}
    )

    return {"message": "Role permissions updated successfully"}
