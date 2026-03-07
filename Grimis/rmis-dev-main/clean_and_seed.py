import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import decouple
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from seed_spip_kendari import seed_spip_hierarchy

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["your_database_name"]
    # Delete bad struktur_organisasi
    await db.struktur_organisasi.delete_many({"kode": {"$in": ["INSP-KDI", "DINKES-KDI", "DIKPORA-KDI"]}})
    
    # Run seed
    await seed_spip_hierarchy()
    
asyncio.run(main())
