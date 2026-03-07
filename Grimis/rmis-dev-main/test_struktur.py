import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import decouple
from bson import ObjectId
from app.schemas.organization import StrukturOrganisasiResponse

async def test():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["rmis"]
    
    instansi = await db.instansi.find_one({"kode_instansi": "PEMKOT-KDI"})
    id_instansi = str(instansi["_id"])
    
    structures = []
    async for struktur in db.struktur_organisasi.find({"id_instansi": id_instansi}):
        struktur["id"] = str(struktur["_id"])
        
        # Get institution name
        ins = await db.instansi.find_one({"_id": ObjectId(struktur["id_instansi"])})
        if ins:
            struktur["nama_instansi"] = ins.get("nama_instansi", "Unknown")
            struktur["jenis"] = ins.get("jenis", "Unknown")
            
        print(f"> Processing Struktur: {struktur['kode']} (Instansi Jenis: {struktur.get('jenis')})")
        
        if "parent_induk_id" in struktur:
            parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["parent_induk_id"])})
            if parent_unit and "nama_induk_unit" in parent_unit:
                struktur["nama_induk_unit"] = parent_unit["nama_induk_unit"]
        else:
            if "id_induk_unit_kerja" in struktur and struktur["id_induk_unit_kerja"]:
                induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["id_induk_unit_kerja"])})
                if induk_unit:
                    struktur["nama_induk_unit"] = induk_unit.get("nama_induk_unit", "Unknown")
        
        try:
            resp = StrukturOrganisasiResponse(**struktur)
            structures.append(resp)
            print("OK")
        except Exception as e:
            print("Validation error:", e)

asyncio.run(test())
