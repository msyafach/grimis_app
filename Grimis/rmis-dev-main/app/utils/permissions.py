"""
Permission Helper Utility

This module provides utilities for checking user permissions based on groups.
It supports both role-based and group-based access control for backwards compatibility.
"""

from typing import List, Optional, Union
from bson import ObjectId
from app.database import Database
from app.schemas.user import UserRole
from app.schemas.group import Permission


# Permission mappings for legacy roles (for backwards compatibility)
# These map old role-based permissions to new permission system
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: {
        "all": True  # Super admin has all permissions
    },
    UserRole.ADMIN_KLP: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_ORGANIZATION,
            Permission.MANAGE_USERS,
            Permission.VIEW_USERS,
            Permission.CREATE_USERS,
            Permission.EDIT_USERS,
            Permission.VIEW_PARAMETERS,
            Permission.MANAGE_PARAMETERS,
            Permission.VIEW_RISK,
            Permission.MANAGE_RISK,
            Permission.APPROVE_RISK,
            Permission.APPROVE_PROPOSALS,
            Permission.VIEW_APPROVALS,
            Permission.VIEW_IDENTIFICATION,
            Permission.MANAGE_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.MANAGE_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.MANAGE_EVALUATION,
            Permission.VERIFY_EVALUATION,
            Permission.VIEW_MONITORING,
            Permission.MANAGE_REPORTING,
            Permission.VIEW_GROUPS,
            Permission.MANAGE_GROUPS,
        ]
    },
    UserRole.UNIT_MANAJEMEN_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_ORGANIZATION,
            Permission.VIEW_PARAMETERS,
            Permission.VIEW_RISK,
            Permission.MANAGE_RISK,
            Permission.VIEW_IDENTIFICATION,
            Permission.MANAGE_IDENTIFICATION,
            Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.MANAGE_ANALYSIS,
            Permission.CREATE_ANALYSIS,
            Permission.EDIT_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.MANAGE_EVALUATION,
            Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION,
            Permission.VIEW_MONITORING,
            Permission.MANAGE_MONITORING,
            Permission.MANAGE_REPORTING,
        ]
    },
    UserRole.PEMILIK_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_PARAMETERS,
            Permission.PROPOSE_PARAMETERS,
            Permission.VIEW_RISK,
            Permission.PROPOSE_RISK,
            Permission.VIEW_IDENTIFICATION,
            Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION,
            Permission.VIEW_MONITORING,
            Permission.CREATE_MONITORING,
            Permission.VIEW_APPROVALS,
        ]
    },
    UserRole.PENGELOLA_RISIKO: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_PARAMETERS,
            Permission.PROPOSE_PARAMETERS,
            Permission.VIEW_RISK,
            Permission.PROPOSE_RISK,
            Permission.VIEW_IDENTIFICATION,
            Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION,
            Permission.VIEW_MONITORING,
            Permission.CREATE_MONITORING,
            Permission.VIEW_APPROVALS,
        ]
    },
    UserRole.PENGAWAS_INTERN: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.VIEW_MONITORING,
        ]
    },
    UserRole.PEGAWAI: {
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.VIEW_MONITORING,
        ]
    }
}


async def get_user_permissions(user_id: str) -> List[Permission]:
    """
    Get all permissions for a user based on their groups.

    Args:
        user_id: The user's ID

    Returns:
        List of permissions the user has
    """
    db = await Database.get_db()

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        return []

    if not user:
        return []

    # Super admin has all permissions
    if user.get("role") == UserRole.SUPER_ADMIN:
        return list(Permission)

    # Get permissions from all user's groups
    group_ids = user.get("group_ids", [])
    permissions = set()

    if group_ids:
        async for group in db.groups.find(
            {"_id": {"$in": [ObjectId(gid) for gid in group_ids]}},
            {"permissions": 1}
        ):
            for perm in group.get("permissions", []):
                permissions.add(perm)

    # Also add permissions from role (backwards compatibility)
    role = user.get("role")
    if role in ROLE_PERMISSIONS:
        role_perms = ROLE_PERMISSIONS[role]
        if role_perms.get("all"):
            return list(Permission)
        for perm in role_perms.get("permissions", []):
            permissions.add(perm)

    return list(permissions)


async def user_has_permission(user_id: str, required_permission: Union[Permission, str]) -> bool:
    """
    Check if a user has a specific permission.

    Args:
        user_id: The user's ID
        required_permission: The permission to check

    Returns:
        True if user has the permission, False otherwise
    """
    db = await Database.get_db()

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        return False

    if not user:
        return False

    # Super admin has all permissions
    if user.get("role") == UserRole.SUPER_ADMIN:
        return True

    # Convert string to Permission enum if needed
    if isinstance(required_permission, str):
        try:
            required_permission = Permission(required_permission)
        except ValueError:
            return False

    # Get permissions from groups
    group_ids = user.get("group_ids", [])

    if group_ids:
        async for group in db.groups.find(
            {"_id": {"$in": [ObjectId(gid) for gid in group_ids]}},
            {"permissions": 1}
        ):
            if required_permission in group.get("permissions", []):
                return True

    # Also check role-based permissions (backwards compatibility)
    role = user.get("role")
    if role in ROLE_PERMISSIONS:
        role_perms = ROLE_PERMISSIONS[role]
        if role_perms.get("all"):
            return True
        if required_permission in role_perms.get("permissions", []):
            return True

    return False


async def user_has_any_permission(user_id: str, permissions: List[Union[Permission, str]]) -> bool:
    """
    Check if user has ANY of the specified permissions.

    Args:
        user_id: The user's ID
        permissions: List of permissions to check

    Returns:
        True if user has at least one of the permissions
    """
    for perm in permissions:
        if await user_has_permission(user_id, perm):
            return True
    return False


async def user_has_all_permissions(user_id: str, permissions: List[Union[Permission, str]]) -> bool:
    """
    Check if user has ALL of the specified permissions.

    Args:
        user_id: The user's ID
        permissions: List of permissions to check

    Returns:
        True if user has all of the permissions
    """
    for perm in permissions:
        if not await user_has_permission(user_id, perm):
            return False
    return True


def get_permission_label(permission: Permission) -> str:
    """
    Get human-readable label for a permission.

    Args:
        permission: The permission enum value

    Returns:
        Human-readable label
    """
    labels = {
        Permission.VIEW_DASHBOARD: "View Dashboard",
        Permission.VIEW_RISK_MAP: "View Risk Map",
        Permission.MANAGE_ORGANIZATION: "Manage Organization",
        Permission.VIEW_ORGANIZATION: "View Organization",
        Permission.MANAGE_PARAMETERS: "Manage Parameters",
        Permission.VIEW_PARAMETERS: "View Parameters",
        Permission.PROPOSE_PARAMETERS: "Propose Parameters",
        Permission.MANAGE_RISK: "Manage Risk",
        Permission.VIEW_RISK: "View Risk",
        Permission.PROPOSE_RISK: "Propose Risk",
        Permission.APPROVE_RISK: "Approve Risk",
        Permission.MANAGE_IDENTIFICATION: "Manage Identification",
        Permission.VIEW_IDENTIFICATION: "View Identification",
        Permission.CREATE_IDENTIFICATION: "Create Identification",
        Permission.EDIT_IDENTIFICATION: "Edit Identification",
        Permission.DELETE_IDENTIFICATION: "Delete Identification",
        Permission.MANAGE_ANALYSIS: "Manage Analysis",
        Permission.VIEW_ANALYSIS: "View Analysis",
        Permission.CREATE_ANALYSIS: "Create Analysis",
        Permission.EDIT_ANALYSIS: "Edit Analysis",
        Permission.MANAGE_EVALUATION: "Manage Evaluation",
        Permission.VIEW_EVALUATION: "View Evaluation",
        Permission.CREATE_EVALUATION: "Create Evaluation",
        Permission.EDIT_EVALUATION: "Edit Evaluation",
        Permission.VERIFY_EVALUATION: "Verify Evaluation",
        Permission.MANAGE_MONITORING: "Manage Monitoring",
        Permission.VIEW_MONITORING: "View Monitoring",
        Permission.CREATE_MONITORING: "Create Monitoring",
        Permission.MANAGE_REPORTING: "Manage Reporting",
        Permission.MANAGE_USERS: "Manage Users",
        Permission.VIEW_USERS: "View Users",
        Permission.CREATE_USERS: "Create Users",
        Permission.EDIT_USERS: "Edit Users",
        Permission.DELETE_USERS: "Delete Users",
        Permission.MANAGE_GROUPS: "Manage Groups",
        Permission.VIEW_GROUPS: "View Groups",
        Permission.APPROVE_PROPOSALS: "Approve Proposals",
        Permission.VIEW_APPROVALS: "View Approvals",
        Permission.MANAGE_SETTINGS: "Manage Settings",
        Permission.VIEW_SETTINGS: "View Settings",
    }
    return labels.get(permission, permission.value)


def get_permissions_by_category() -> dict:
    """
    Get permissions grouped by category for UI display.

    Returns:
        Dictionary with categories as keys and permission lists as values
    """
    return {
        "Dashboard": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
        ],
        "Organization": [
            Permission.MANAGE_ORGANIZATION,
            Permission.VIEW_ORGANIZATION,
        ],
        "Parameters": [
            Permission.MANAGE_PARAMETERS,
            Permission.VIEW_PARAMETERS,
            Permission.PROPOSE_PARAMETERS,
        ],
        "Risk Management": [
            Permission.MANAGE_RISK,
            Permission.VIEW_RISK,
            Permission.PROPOSE_RISK,
            Permission.APPROVE_RISK,
        ],
        "Identification": [
            Permission.MANAGE_IDENTIFICATION,
            Permission.VIEW_IDENTIFICATION,
            Permission.CREATE_IDENTIFICATION,
            Permission.EDIT_IDENTIFICATION,
            Permission.DELETE_IDENTIFICATION,
        ],
        "Analysis": [
            Permission.MANAGE_ANALYSIS,
            Permission.VIEW_ANALYSIS,
            Permission.CREATE_ANALYSIS,
            Permission.EDIT_ANALYSIS,
        ],
        "Evaluation": [
            Permission.MANAGE_EVALUATION,
            Permission.VIEW_EVALUATION,
            Permission.CREATE_EVALUATION,
            Permission.EDIT_EVALUATION,
            Permission.VERIFY_EVALUATION,
        ],
        "Monitoring & Reporting": [
            Permission.MANAGE_MONITORING,
            Permission.VIEW_MONITORING,
            Permission.CREATE_MONITORING,
            Permission.MANAGE_REPORTING,
        ],
        "User Management": [
            Permission.MANAGE_USERS,
            Permission.VIEW_USERS,
            Permission.CREATE_USERS,
            Permission.EDIT_USERS,
            Permission.DELETE_USERS,
        ],
        "Group Management": [
            Permission.MANAGE_GROUPS,
            Permission.VIEW_GROUPS,
        ],
        "Approval": [
            Permission.APPROVE_PROPOSALS,
            Permission.VIEW_APPROVALS,
        ],
        "Settings": [
            Permission.MANAGE_SETTINGS,
            Permission.VIEW_SETTINGS,
        ],
    }
