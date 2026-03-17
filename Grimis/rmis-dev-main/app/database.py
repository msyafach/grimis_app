from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from decouple import config
from typing import Optional, Type

MONGODB_URL = config('MONGODB_URL')
DB_NAME = config('DB_NAME')

class Database:
    client = None  
    db = None  

    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        cls.client = AsyncIOMotorClient(MONGODB_URL)
        cls.db = cls.client[DB_NAME]
        
        # Update indexes
        await cls.db.struktur_organisasi.create_index([
            ("id_instansi", 1),
            ("jenis_konteks.kode", 1)
        ], unique=True)
        
        await cls.db.konteks.create_index([
            ("kode", 1),
            ("id_instansi", 1)
        ], unique=True)
        
        await cls.db.konteks.create_index([
            ("id_jenis_konteks", 1)
        ])

        # Performance indexes for dashboard queries
        await cls.db.identifikasi_risiko.create_index([
            ("id_instansi", 1), ("tahun", 1), ("id_induk_unit_kerja", 1)
        ])
        await cls.db.analisis_risiko.create_index([
            ("identifikasi_risiko_id", 1), ("tahun", 1)
        ])
        await cls.db.analisis_risiko.create_index([
            ("id_instansi", 1), ("tahun", 1)
        ])
        await cls.db.peta_risiko_template.create_index([
            ("tahun", 1), ("id_induk_unit_kerja", 1)
        ])
        await cls.db.rtp.create_index([("evaluasi_risiko_id", 1)])

        return cls.db

    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client is not None:
            cls.client.close()

    @classmethod
    async def get_db(cls):
        """Get database instance"""
        if cls.db is None:
            await cls.connect_db()
        return cls.db

    @classmethod 
    async def add_jenis_konteks_to_struktur(
        cls,
        struktur_id: str,
        jenis_konteks_data: dict
    ) -> Optional[dict]:
        """
        Add jenis konteks to struktur organisasi
        
        Args:
            struktur_id: ID of struktur organisasi
            jenis_konteks_data: Data for jenis konteks to add
            
        Returns:
            Updated struktur organisasi document or None if not found
        """
        if cls.db is None:
            await cls.connect_db()
            
        result = await cls.db.struktur_organisasi.find_one_and_update(
            {"_id": struktur_id},
            {
                "$push": {
                    "jenis_konteks": jenis_konteks_data
                }
            },
            return_document=True
        )
        
        return result 