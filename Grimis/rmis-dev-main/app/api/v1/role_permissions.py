"""
Role Permissions Manager

Manages permissions for built-in UserRole values (SUPER_ADMIN, ADMIN_KLP, etc.)
Stored in role_permissions collection to override or extend hardcoded ROLE_PERMISSIONS
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from datetime import datetime
from bson import ObjectId

from app.schemas.group import Permission
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

# Role display names in Indonesian
ROLE_DISPLAY_NAMES = {
    UserRole.SUPER_ADMIN: "Super Admin",
    UserRole.ADMIN_KLP: "Admin KLP",
    UserRole.UNIT_MANAJEMEN_RISIKO: "Unit Manajemen Risiko",
    UserRole.PEMILIK_RISIKO: "Pemilik Risiko",
    UserRole.PENGELOLA_RISIKO: "Pengelola Risiko",
    UserRole.PENGAWAS_INTERN: "Pengawas Intern",
    UserRole.PEGAWAI: "Pegawai"
}

# Default permissions from permissions.py (for reference)
DEFAULT_ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: {"all": True},
    UserRole.ADMIN_KLP: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP,
            Permission.VIEW_ORGANIZATION, Permission.MANAGE_USERS, Permission.VIEW_USERS,
            Permission.CREATE_USERS, Permission.EDIT_USERS, Permission.VIEW_PARAMETERS,
            Permission.MANAGE_PARAMETERS, Permission.VIEW_RISK, Permission.MANAGE_RISK,
            Permission.APPROVE_RISK, Permission.APPROVE_PROPOSALS, Permission.VIEW_APPROVALS,
            Permission.VIEW_IDENTIFICATION, Permission.MANAGE_IDENTIFICATION,
            Permission.VIEW_ANALYSIS, Permission.MANAGE_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.MANAGE_EVALUATION,
            Permission.VERIFY_EVALUATION, Permission.VIEW_MONITORING,
            Permission.MANAGE_REPORTING, Permission.VIEW_GROUPS, Permission.MANAGE_GROUPS,
        ]
    },
    UserRole.UNIT_MANAJEMEN_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP, Permission.VIEW_ORGANIZATION,
            Permission.VIEW_PARAMETERS, Permission.VIEW_RISK, Permission.MANAGE_RISK,
            Permission.VIEW_IDENTIFICATION, Permission.MANAGE_IDENTIFICATION,
            Permission.CREATE_IDENTIFICATION, Permission.EDIT_IDENTIFICATION,
            Permission.VIEW_ANALYSIS, Permission.MANAGE_ANALYSIS,
            Permission.CREATE_ANALYSIS, Permission.EDIT_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.MANAGE_EVALUATION,
            Permission.CREATE_EVALUATION, Permission.EDIT_EVALUATION,
            Permission.VIEW_MONITORING, Permission.MANAGE_MONITORING, Permission.MANAGE_REPORTING,
        ]
    },
    UserRole.PEMILIK_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP, Permission.VIEW_PARAMETERS,
            Permission.PROPOSE_PARAMETERS, Permission.VIEW_RISK, Permission.PROPOSE_RISK,
            Permission.VIEW_IDENTIFICATION, Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION, Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION, Permission.VIEW_MONITORING,
            Permission.CREATE_MONITORING, Permission.VIEW_APPROVALS,
        ]
    },
    UserRole.PENGELOLA_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP, Permission.VIEW_PARAMETERS,
            Permission.PROPOSE_PARAMETERS, Permission.VIEW_RISK, Permission.PROPOSE_RISK,
            Permission.VIEW_IDENTIFICATION, Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION, Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION, Permission.VIEW_MONITORING,
            Permission.CREATE_MONITORING, Permission.VIEW_APPROVALS,
        ]
    },
    UserRole.PENGAWAS_INTERN: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION, Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.VIEW_MONITORING,
        ]
    },
    UserRole.PEGAWAI: {
        "permissions": [
            Permission.VIEW_DASHBOARD, Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION, Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION, Permission.VIEW_MONITORING,
        ]
    }
}


@router.get("", response_model=List[Dict])
async def get_roles(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of all built-in roles (Peran) with their permissions.

    Returns the existing UserRole values with their configurable permissions.
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can view role permissions"
        )

    db = await Database.get_db()

    roles = []
    for role in UserRole:
        # Get custom permissions from database if exists
        custom_perms = await db.role_permissions.find_one({"role": role.value})

        role_data = {
            "id": role.value,
            "name": role.value,
            "display_name": ROLE_DISPLAY_NAMES.get(role, role.value),
            "is_system_role": True,
            "has_all_permissions": role == UserRole.SUPER_ADMIN,
            "user_count": 0  # Will be populated below
        }

        # Use custom permissions if defined, otherwise use defaults
        if custom_perms:
            role_data["permissions"] = custom_perms.get("permissions", [])
            role_data["is_customized"] = True
        else:
            default_perms = DEFAULT_ROLE_PERMISSIONS.get(role, {}).get("permissions", [])
            if role == UserRole.SUPER_ADMIN:
                default_perms = [p.value for p in Permission]  # All permissions
            role_data["permissions"] = default_perms
            role_data["is_customized"] = False

        # Count users with this role
        user_count = await db.users.count_documents({"role": role.value})
        role_data["user_count"] = user_count

        roles.append(role_data)

    return roles


@router.get("/{role_name}/permissions", response_model=Dict)
async def get_role_permissions(
    role_name: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get permissions for a specific role (Peran).
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can view role permissions"
        )

    # Validate role name
    try:
        role = UserRole(role_name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role name")

    db = await Database.get_db()

    # Get custom permissions from database
    custom_perms = await db.role_permissions.find_one({"role": role.value})

    if custom_perms:
        return {
            "role": role.value,
            "display_name": ROLE_DISPLAY_NAMES.get(role, role.value),
            "permissions": custom_perms.get("permissions", []),
            "is_customized": True
        }

    # Return default permissions
    if role == UserRole.SUPER_ADMIN:
        return {
            "role": role.value,
            "display_name": ROLE_DISPLAY_NAMES.get(role, role.value),
            "permissions": [p.value for p in Permission],
            "is_customized": False
        }

    default_perms = DEFAULT_ROLE_PERMISSIONS.get(role, {}).get("permissions", [])
    return {
        "role": role.value,
        "display_name": ROLE_DISPLAY_NAMES.get(role, role.value),
        "permissions": [p.value for p in default_perms],
        "is_customized": False
    }


@router.put("/{role_name}/permissions")
async def update_role_permissions(
    role_name: str,
    permissions: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Update permissions for a role (Peran).

    This overrides the default permissions for this role.
    All users with this role will get these permissions.
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update role permissions"
        )

    # Validate role name
    try:
        role = UserRole(role_name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role name")

    # Don't allow modifying SUPER_ADMIN permissions
    if role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify SUPER_ADMIN permissions - they always have all permissions"
        )

    # Validate permissions
    valid_permissions = {p.value for p in Permission}
    invalid_perms = [p for p in permissions if p not in valid_permissions]
    if invalid_perms:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid permissions: {invalid_perms}"
        )

    db = await Database.get_db()

    # Update or insert role permissions
    await db.role_permissions.update_one(
        {"role": role.value},
        {
            "$set": {
                "permissions": permissions,
                "updated_at": datetime.utcnow(),
                "updated_by": current_user["id"]
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return {
        "message": f"Permissions updated for role {ROLE_DISPLAY_NAMES.get(role, role.value)}",
        "role": role.value,
        "permissions_count": len(permissions)
    }


@router.delete("/{role_name}/permissions")
async def reset_role_permissions(
    role_name: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Reset role permissions to defaults.

    Removes custom permissions and reverts to system defaults.
    """
    # Check permission
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can reset role permissions"
        )

    # Validate role name
    try:
        role = UserRole(role_name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role name")

    db = await Database.get_db()

    # Delete custom permissions
    result = await db.role_permissions.delete_one({"role": role.value})

    if result.deleted_count == 0:
        return {"message": "Role was already using default permissions"}

    return {
        "message": f"Permissions reset to defaults for role {ROLE_DISPLAY_NAMES.get(role, role.value)}"
    }
