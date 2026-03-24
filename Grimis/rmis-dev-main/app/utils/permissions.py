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
    Get all permissions for a user based on their roles and groups.
    Groups and custom role permissions take precedence over default role permissions.

    If user belongs to roles or groups, those permissions are combined and returned.
    If user has no roles or groups, role permissions are used as fallback.

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

    # Root account always has all permissions
    if user.get("is_root", False):
        return list(Permission)

    permissions = set()

    # Check custom role permissions first (new role management system)
    user_role = user.get("role")
    if user_role:
        # Check if there are custom permissions for this role
        custom_role_perms = await db.role_permissions.find_one({"role": user_role})
        if custom_role_perms:
            # Use custom permissions from database (even for SUPER_ADMIN)
            for perm in custom_role_perms.get("permissions", []):
                try:
                    permissions.add(Permission(perm))
                except ValueError:
                    continue
        elif user_role == UserRole.SUPER_ADMIN.value:
            # SUPER_ADMIN gets all permissions by default (only if no custom permissions)
            return list(Permission)
        else:
            # Use default role permissions
            role_perms = ROLE_PERMISSIONS.get(UserRole(user_role), {})
            if role_perms.get("all"):
                return list(Permission)
            for perm in role_perms.get("permissions", []):
                permissions.add(perm)

    # Check custom role IDs (for additional roles assigned to user)
    role_ids = user.get("role_ids", [])
    if role_ids:
        async for role in db.roles.find(
            {"_id": {"$in": [ObjectId(rid) for rid in role_ids]}},
            {"permissions": 1}
        ):
            for perm in role.get("permissions", []):
                permissions.add(perm)

    # Then check group permissions
    group_ids = user.get("group_ids", [])
    if group_ids:
        async for group in db.groups.find(
            {"_id": {"$in": [ObjectId(gid) for gid in group_ids]}},
            {"permissions": 1}
        ):
            for perm in group.get("permissions", []):
                permissions.add(perm)

    # If user has permissions from roles or groups, return those
    if permissions:
        return list(permissions)

    # Super admin without roles/groups has all permissions
    if user.get("role") == UserRole.SUPER_ADMIN:
        return list(Permission)

    # No roles or groups → fallback to role permissions (backwards compatibility)
    role = user.get("role")
    if role in ROLE_PERMISSIONS:
        role_perms = ROLE_PERMISSIONS[role]
        if role_perms.get("all"):
            return list(Permission)
        return list(role_perms.get("permissions", []))

    return []


async def user_has_permission(user_id: str, required_permission: Union[Permission, str]) -> bool:
    """
    Check if a user has a specific permission.
    Custom role permissions, group permissions, and custom roles are checked.

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

    # Root account always has all permissions
    if user.get("is_root", False):
        return True

    # Convert string to Permission enum if needed
    if isinstance(required_permission, str):
        try:
            required_permission = Permission(required_permission)
        except ValueError:
            return False

    # Check custom role permissions first
    user_role = user.get("role")
    if user_role:
        custom_role_perms = await db.role_permissions.find_one({"role": user_role})
        if custom_role_perms:
            if required_permission.value in custom_role_perms.get("permissions", []):
                return True
        elif user_role == UserRole.SUPER_ADMIN.value:
            return True  # SUPER_ADMIN has all permissions
        else:
            # Check default role permissions
            role_perms = ROLE_PERMISSIONS.get(UserRole(user_role), {})
            if role_perms.get("all"):
                return True
            if required_permission in role_perms.get("permissions", []):
                return True

    # Check custom role IDs
    role_ids = user.get("role_ids", [])
    if role_ids:
        async for role in db.roles.find(
            {"_id": {"$in": [ObjectId(rid) for rid in role_ids]}},
            {"permissions": 1}
        ):
            if required_permission in role.get("permissions", []):
                return True

    # Then check group permissions
    group_ids = user.get("group_ids", [])
    if group_ids:
        async for group in db.groups.find(
            {"_id": {"$in": [ObjectId(gid) for gid in group_ids]}},
            {"permissions": 1}
        ):
            if required_permission in group.get("permissions", []):
                return True

    # If user has roles or groups but permission not found, deny access
    if role_ids or group_ids:
        return False

    # Super admin without roles/groups has all permissions
    if user.get("role") == UserRole.SUPER_ADMIN:
        return True

    # No roles or groups → check role-based permissions (backwards compatibility)
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
        Permission.MANAGE_ROLES: "Manage Roles",
        Permission.VIEW_ROLES: "View Roles",
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
        "Role Management": [
            Permission.MANAGE_ROLES,
            Permission.VIEW_ROLES,
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
