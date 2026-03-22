#!/usr/bin/env python3
"""
Script to create or manage root user account

Usage:
    python manage_root_user.py create <username> <password>
    python manage_root_user.py list
    python manage_root_user.py delete <username>
"""

import asyncio
import sys
from bson import ObjectId
from datetime import datetime

# Import app modules
import sys
sys.path.insert(0, '/app')

from app.database import Database
from app.utils.auth import get_password_hash
from app.schemas.user import UserRole


async def create_root_user(username: str, password: str):
    """Create a root user account"""
    db = await Database.get_db()

    # Check if user already exists
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"User '{username}' already exists!")
        if existing.get("is_root"):
            print("User is already a root account.")
        else:
            print("Upgrading to root account...")
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"is_root": True, "updated_at": datetime.utcnow()}}
            )
            print(f"User '{username}' is now a root account!")
        return

    # Create root user
    user_data = {
        "username": username,
        "password": get_password_hash(password),
        "nama_depan": "Root",
        "nama_belakang": "Administrator",
        "email": f"{username}@system.local",
        "role": UserRole.SUPER_ADMIN,
        "is_root": True,
        "created_at": datetime.utcnow(),
        "updated_at": None,
        "group_ids": [],  # Root users cannot be in groups
    }

    result = await db.users.insert_one(user_data)
    print(f"Root user '{username}' created successfully!")
    print(f"ID: {result.inserted_id}")
    print(f"Role: {UserRole.SUPER_ADMIN}")
    print(f"is_root: True")
    print("\nNOTE: Root users:")
    print("  - Have ALL permissions automatically")
    print("  - Cannot be added to groups")
    print("  - Cannot be edited by other users")
    print("  - Cannot be deleted")
    print("  - Are hidden from user management lists")


async def list_root_users():
    """List all root users"""
    db = await Database.get_db()

    print("Root Users:")
    print("-" * 60)

    count = 0
    async for user in db.users.find({"is_root": True}):
        count += 1
        print(f"\n{count}. {user['username']}")
        print(f"   Name: {user['nama_depan']} {user['nama_belakang']}")
        print(f"   Email: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   ID: {user['_id']}")
        print(f"   Created: {user['created_at']}")

    if count == 0:
        print("No root users found.")
    else:
        print(f"\nTotal: {count} root user(s)")


async def delete_root_user(username: str):
    """Delete a root user (only if explicitly requested)"""
    db = await Database.get_db()

    user = await db.users.find_one({"username": username, "is_root": True})
    if not user:
        print(f"Root user '{username}' not found!")
        return

    print(f"WARNING: You are about to delete root user '{username}'!")
    print("This action cannot be undone.")
    print("Root users have full system access and cannot be recovered.")
    print("\nTo confirm, type the username again: ")

    # In non-interactive mode, require a second confirmation argument
    if len(sys.argv) < 4 or sys.argv[3] != "--confirm":
        print("\nUsage: python manage_root_user.py delete <username> --confirm")
        print("Or run interactively to confirm.")
        return

    await db.users.delete_one({"_id": user["_id"]})
    print(f"Root user '{username}' has been deleted.")


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()

    try:
        await Database.connect_db()

        if command == "create":
            if len(sys.argv) < 4:
                print("Usage: python manage_root_user.py create <username> <password>")
                sys.exit(1)
            await create_root_user(sys.argv[2], sys.argv[3])

        elif command == "list":
            await list_root_users()

        elif command == "delete":
            if len(sys.argv) < 3:
                print("Usage: python manage_root_user.py delete <username> [--confirm]")
                sys.exit(1)
            await delete_root_user(sys.argv[2])

        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

    finally:
        await Database.close_db()


if __name__ == "__main__":
    asyncio.run(main())
