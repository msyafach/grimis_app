"""
Default Groups Migration Script

This script creates default groups based on the existing role system.
It maps each role to a corresponding group with equivalent permissions.
This facilitates the migration from role-based to group-based access control.

Run this script once to initialize the default groups in your database.

Usage:
    cd Grimis/rmis-dev-main
    python -m app.utils.migrate_default_groups

Or:
    cd Grimis/rmis-dev-main
    python app/utils/migrate_default_groups.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
from datetime import datetime

# Add the rmis-dev-main directory to path to import app modules
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)  # This is rmis-dev-main
sys.path.insert(0, project_root)

from app.schemas.group import Permission
import decouple

# Default groups with their permissions based on ROLE_PERMISSIONS mapping
DEFAULT_GROUPS = {
    "Super Admin": {
        "description": "Full system access - equivalent to SUPER_ADMIN role",
        "permissions": list(Permission),  # All permissions
    },
    "Admin KLP": {
        "description": "Administrative access for KLP - equivalent to ADMIN_KLP role",
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
        ],
    },
    "Unit Manajemen Risiko": {
        "description": "Risk Management Unit - equivalent to UNIT_MANAJEMEN_RISIKO role",
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
        ],
    },
    "Pemilik Risiko": {
        "description": "Risk Owner - equivalent to PEMILIK_RISIKO role",
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
        ],
    },
    "Pengelola Risiko": {
        "description": "Risk Manager - equivalent to PENGELOLA_RISIKO role",
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
        ],
    },
    "Pengawas Intern": {
        "description": "Internal Auditor - equivalent to PENGAWAS_INTERN role",
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.VIEW_MONITORING,
        ],
    },
    "Pegawai": {
        "description": "Staff - equivalent to PEGAWAI role",
        "permissions": [
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RISK_MAP,
            Permission.VIEW_IDENTIFICATION,
            Permission.VIEW_ANALYSIS,
            Permission.VIEW_EVALUATION,
            Permission.VIEW_MONITORING,
        ],
    },
}

# Map roles to group names for automatic assignment
ROLE_TO_GROUP_MAP = {
    "SUPER_ADMIN": "Super Admin",
    "ADMIN_KLP": "Admin KLP",
    "UNIT_MANAJEMEN_RISIKO": "Unit Manajemen Risiko",
    "PEMILIK_RISIKO": "Pemilik Risiko",
    "PENGELOLA_RISIKO": "Pengelola Risiko",
    "PENGAWAS_INTERN": "Pengawas Intern",
    "PEGAWAI": "Pegawai",
}


async def create_default_groups():
    """Create default groups if they don't exist."""
    MONGO_URL = decouple.config("MONGODB_URL", default="mongodb://localhost:27017")
    DB_NAME = decouple.config("DB_NAME", default="rmis")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 50)
    print("Default Groups Migration Script")
    print("=" * 50)
    print()

    created_groups = {}

    for group_name, group_data in DEFAULT_GROUPS.items():
        # Check if group already exists
        existing_group = await db.groups.find_one({"name": group_name})

        if existing_group:
            print(f"✓ Group '{group_name}' already exists")
            created_groups[group_name] = str(existing_group["_id"])
            continue

        # Create new group
        group_doc = {
            "name": group_name,
            "description": group_data["description"],
            "permissions": [p.value for p in group_data["permissions"]],
            "member_ids": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = await db.groups.insert_one(group_doc)
        created_groups[group_name] = str(result.inserted_id)
        print(f"✓ Created group '{group_name}' with {len(group_data['permissions'])} permissions")

    print()
    print("-" * 50)
    print(f"Total groups created/updated: {len(created_groups)}")
    print()

    return created_groups


async def assign_users_to_groups():
    """
    Assign existing users to corresponding groups based on their role.
    This migrates users from role-based to group-based access control.
    """
    MONGO_URL = decouple.config("MONGODB_URL", default="mongodb://localhost:27017")
    DB_NAME = decouple.config("DB_NAME", default="rmis")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Assigning users to groups based on their roles...")
    print()

    users_assigned = 0

    for role, group_name in ROLE_TO_GROUP_MAP.items():
        # Get the group
        group = await db.groups.find_one({"name": group_name})
        if not group:
            print(f"⚠ Group '{group_name}' not found, skipping...")
            continue

        group_id = str(group["_id"])

        # Find all users with this role
        users = db.users.find({"role": role})
        async for user in users:
            user_id = str(user["_id"])
            current_groups = user.get("group_ids", [])

            # Skip if already in the group
            if group_id in current_groups:
                continue

            # Add user to group
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$addToSet": {"group_ids": group_id}}
            )

            # Add user to group's member_ids
            await db.groups.update_one(
                {"_id": group["_id"]},
                {"$addToSet": {"member_ids": user_id}}
            )

            users_assigned += 1
            print(f"✓ Assigned user '{user.get('username')}' ({role}) to '{group_name}'")

    print()
    print("-" * 50)
    print(f"Total users assigned to groups: {users_assigned}")
    print()

    return users_assigned


async def main():
    """Run the complete migration."""
    try:
        # Step 1: Create default groups
        created_groups = await create_default_groups()

        # Step 2: Assign users to corresponding groups
        await assign_users_to_groups()

        print("=" * 50)
        print("Migration completed successfully!")
        print("=" * 50)
        print()
        print("Summary:")
        print(f"  - Default groups created: {len(created_groups)}")
        print(f"  - Users migrated to groups: See individual counts above")
        print()
        print("Next steps:")
        print("  1. Verify groups in the admin panel")
        print("  2. Check user permissions are correct")
        print("  3. Optionally create additional custom groups")
        print()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
