import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
import decouple
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.utils.auth import get_password_hash
from app.schemas.user import UserRole
from bson import ObjectId

async def seed_tree():
    MONGO_URL = decouple.config("MONGODB_URL", default="mongodb://localhost:27017")
    DB_NAME = decouple.config("DB_NAME", default="rmis") # Actually maps to your_database_name via .env! Wait, .env says 'your_database_name'
    
    # Force use the active database
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["your_database_name"]
    
    # 1. Pastikan Instansi Utama ada
    instansi = await db.instansi.find_one({"kode_instansi": "PEMKOT-KDI"})
    if not instansi:
        print("Instansi PEMKOT-KDI belum ada!")
        return
        
    instansi_id = str(instansi["_id"])
    
    # Bersihkan yang lama agar bersih
    struktur_kodes = [
        "WALIKOTA-KDI", "INSP-KDI", "DINKES-KDI", "DIKPORA-KDI", 
        "PKM-MND", "PKM-PWT"
    ]
    await db.struktur_organisasi.delete_many({"kode": {"$in": struktur_kodes}})
    await db.induk_unit_kerja.delete_many({"kode_induk": {"$in": struktur_kodes}})
    
    # Hirarki Penuh:
    # Walikota (Root)
    #  |- Inspektorat
    #  |- Dinas Kesehatan
    #      |- Puskesmas Mandonga
    #      |- Puskesmas Puuwatu
    #  |- Dinas Pendidikan
    
    hierarchy = [
        {"nama": "Pemerintah Kota Kendari (Pusat)", "kode": "WALIKOTA-KDI", "jenis": "KABUPATEN_KOTA", "parent_kode": None},
        {"nama": "Inspektorat Kota Kendari", "kode": "INSP-KDI", "jenis": "KABUPATEN_KOTA", "parent_kode": "WALIKOTA-KDI"},
        {"nama": "Dinas Kesehatan", "kode": "DINKES-KDI", "jenis": "KABUPATEN_KOTA", "parent_kode": "WALIKOTA-KDI"},
        {"nama": "Puskesmas Mandonga", "kode": "PKM-MND", "jenis": "PUSKESMAS", "parent_kode": "DINKES-KDI"},
        {"nama": "Puskesmas Puuwatu", "kode": "PKM-PWT", "jenis": "PUSKESMAS", "parent_kode": "DINKES-KDI"},
        {"nama": "Dinas Pendidikan, Pemuda dan Olahraga", "kode": "DIKPORA-KDI", "jenis": "KABUPATEN_KOTA", "parent_kode": "WALIKOTA-KDI"}
    ]
    
    opd_ids = {}
    
    print("Menyiapkan OPD Tree...")
    for opd in hierarchy:
        parent_id = opd_ids.get(opd["parent_kode"]) if opd["parent_kode"] else None
        
        # Insert Induk Unit Kerja
        res = await db.induk_unit_kerja.insert_one({
            "nama_induk_unit": opd["nama"],
            "kode_induk": opd["kode"],
            "id_instansi": instansi_id,
            "parent_id": parent_id,
            "jenis": opd["jenis"],
            "created_at": datetime.utcnow()
        })
        opd_id = str(res.inserted_id)
        opd_ids[opd["kode"]] = opd_id
        
        # Insert Struktur Organisasi
        await db.struktur_organisasi.insert_one({
            "kode": opd["kode"],
            "kode_induk": opd["parent_kode"], # INI PENTING UNTUK UI TREE FRONTEND!
            "nama": opd["nama"],
            "nama_pendek": opd["nama"].split()[0], # Cth: Puskesmas, Dinas
            "pimpinan": "Dr. Contoh Pimpinan",
            "jabatan_pimpinan": "Kepala " + opd["nama"].split()[0],
            "selera_risiko": 12,
            "provinsi": "Sulawesi Tenggara",
            "id_induk_unit_kerja": opd_id,
            "id_instansi": instansi_id,
            "jenis_konteks": [{"kode": f"JK-{opd['kode']}", "nama": "Sasaran Strategis", "jenis": "SASARAN"}],
            "created_at": datetime.utcnow()
        })
        print(f" -> {opd['nama']} tersimpan.")

if __name__ == "__main__":
    asyncio.run(seed_tree())
