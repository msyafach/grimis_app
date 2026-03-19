from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupWithMembers,
    GroupMemberResponse,
    Permission
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()


async def user_has_permission(user: dict, required_permission: Permission) -> bool:
    """Check if user has required permission through their groups"""
    if user["role"] == UserRole.SUPER_ADMIN:
        return True

    db = await Database.get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})

    if not user_doc:
        return False

    group_ids = user_doc.get("group_ids", [])
    if not group_ids:
        return False

    # Check if any of user's groups has the required permission
    async for group in db.groups.find({"_id": {"$in": [ObjectId(gid) for gid in group_ids]}}):
        if required_permission in group.get("permissions", []):
            return True

    return False


@router.post("", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new user group.

    Permissions:
    - SUPER_ADMIN can create any group
    - Users with MANAGE_GROUPS permission can create groups
    """
    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to create groups"
            )

    db = await Database.get_db()

    # Check if group name already exists
    existing = await db.groups.find_one({"name": group.name})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Group name already exists"
        )

    group_dict = group.dict()
    group_dict["created_at"] = datetime.utcnow()
    group_dict["updated_at"] = datetime.utcnow()

    result = await db.groups.insert_one(group_dict)
    created = await db.groups.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    created["member_count"] = len(created.get("member_ids", []))

    return GroupResponse(**created)


@router.get("", response_model=List[GroupResponse])
async def get_groups(
    search: Optional[str] = Query(None, description="Search group by name"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of all groups.

    Permissions:
    - SUPER_ADMIN can view all groups
    - Users with VIEW_GROUPS permission can view groups
    """
    db = await Database.get_db()

    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    groups = []
    async for group in db.groups.find(query).sort("name", 1):
        group["id"] = str(group.pop("_id"))
        group["member_count"] = len(group.get("member_ids", []))
        groups.append(GroupResponse(**group))

    return groups


@router.get("/{group_id}", response_model=GroupWithMembers)
async def get_group_by_id(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific group by ID with member details.
    """
    db = await Database.get_db()

    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group["id"] = str(group.pop("_id"))

    # Get member details
    members = []
    member_ids = group.get("member_ids", [])
    for member_id in member_ids:
        try:
            user = await db.users.find_one({"_id": ObjectId(member_id)})
            if user:
                members.append(GroupMemberResponse(
                    user_id=str(user["_id"]),
                    username=user["username"],
                    email=user["email"],
                    nama_depan=user["nama_depan"],
                    nama_belakang=user["nama_belakang"],
                    role=user["role"]
                ))
        except:
            continue

    group["members"] = members
    group["member_count"] = len(members)

    return GroupWithMembers(**group)


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group: GroupUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a group.

    Permissions:
    - SUPER_ADMIN can update any group
    - Users with MANAGE_GROUPS permission can update groups
    """
    db = await Database.get_db()

    try:
        existing = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to update groups"
            )

    update_data = group.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    # If updating member_ids, we need to update users' group_ids as well
    if "member_ids" in update_data:
        new_member_ids = update_data["member_ids"] or []
        old_member_ids = existing.get("member_ids", [])

        # Remove group_id from users no longer in the group
        for old_id in old_member_ids:
            if old_id not in new_member_ids:
                try:
                    await db.users.update_one(
                        {"_id": ObjectId(old_id)},
                        {"$pull": {"group_ids": group_id}}
                    )
                except:
                    pass

        # Add group_id to new members
        for new_id in new_member_ids:
            if new_id not in old_member_ids:
                try:
                    await db.users.update_one(
                        {"_id": ObjectId(new_id)},
                        {"$addToSet": {"group_ids": group_id}}
                    )
                except:
                    pass

    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": update_data}
    )

    updated = await db.groups.find_one({"_id": ObjectId(group_id)})
    updated["id"] = group_id
    updated["member_count"] = len(updated.get("member_ids", []))

    return GroupResponse(**updated)


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a group.

    Permissions:
    - SUPER_ADMIN can delete any group
    - Users with MANAGE_GROUPS permission can delete groups
    """
    db = await Database.get_db()

    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to delete groups"
            )

    # Remove group_id from all members
    member_ids = group.get("member_ids", [])
    for member_id in member_ids:
        try:
            await db.users.update_one(
                {"_id": ObjectId(member_id)},
                {"$pull": {"group_ids": group_id}}
            )
        except:
            pass

    result = await db.groups.delete_one({"_id": ObjectId(group_id)})

    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/members/{user_id}")
async def add_member_to_group(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a user to a group.
    """
    db = await Database.get_db()

    # Validate group exists
    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Validate user exists
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage group members"
            )

    # Add user to group
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$addToSet": {"member_ids": user_id}}
    )

    # Add group to user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"group_ids": group_id}}
    )

    return {"message": "User added to group successfully"}


@router.delete("/{group_id}/members/{user_id}")
async def remove_member_from_group(
    group_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a user from a group.
    """
    db = await Database.get_db()

    # Validate group exists
    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage group members"
            )

    # Remove user from group
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$pull": {"member_ids": user_id}}
    )

    # Remove group from user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"group_ids": group_id}}
    )

    return {"message": "User removed from group successfully"}


@router.get("/{group_id}/permissions", response_model=List[Permission])
async def get_group_permissions(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get permissions for a specific group.
    """
    db = await Database.get_db()

    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return group.get("permissions", [])


@router.put("/{group_id}/permissions")
async def update_group_permissions(
    group_id: str,
    permissions: List[Permission],
    current_user: dict = Depends(get_current_user)
):
    """
    Update permissions for a group.
    """
    db = await Database.get_db()

    # Validate group exists
    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check permission
    if current_user["role"] != UserRole.SUPER_ADMIN:
        has_perm = await user_has_permission(current_user, Permission.MANAGE_GROUPS)
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions to manage group permissions"
            )

    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"permissions": permissions, "updated_at": datetime.utcnow()}}
    )

    return {"message": "Permissions updated successfully"}
