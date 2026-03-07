import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import decouple
from app.utils.auth import get_password_hash, verify_password

async def test():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["rmis"]
    u = await db.users.find_one({"username": "admin_kendari"})
    if u:
        print(f"Found: {u['username']}, active: {u.get('is_active')}")
        print(f"Role: {u.get('role')}")
        print(f"Matches kendari123: {verify_password('kendari123', u['password'])}")
    else:
        print("admin_kendari Not found")
        
    u2 = await db.users.find_one({"username": "super_admin"})
    if u2:
        print(f"Found: {u2['username']}, active: {u2.get('is_active')}")
        print(f"Matches password123: {verify_password('password123', u2['password'])}")
    else:
        print("super_admin Not found")

asyncio.run(test())
