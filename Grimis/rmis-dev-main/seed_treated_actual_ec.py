import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

async def seed_data():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["your_database_name"]
    
    # Get an existing Identifikasi Risiko
    identifikasi = await db.identifikasi_risiko.find_one({})
    if not identifikasi:
        print("No Identifikasi Risiko found.")
        return
        
    identifikasi_id = str(identifikasi["_id"])
    id_instansi = identifikasi.get("id_instansi")
    id_induk_unit_kerja = identifikasi.get("id_induk_unit_kerja")
    
    # Get the AnalisisRisiko for it
    analisis = await db.analisis_risiko.find_one({"identifikasi_risiko_id": identifikasi_id})
    if not analisis:
        print("No AnalisisRisiko found for this Identifikasi.")
        return
        
    print(f"Seeding for Analisis {analisis.get('_id')} under Identifikasi {identifikasi_id}")
    
    kemungkinan_docs = await db.kriteria_kemungkinan.find({"id_instansi": id_instansi}).to_list(length=5)
    dampak_docs = await db.kriteria_dampak.find({"id_instansi": id_instansi}).to_list(length=5)
    
    if not kemungkinan_docs or not dampak_docs:
        print("Missing kriteria for instansi")
        return
        
    # Pick lower scores for treated and actual
    k_lowest = min(kemungkinan_docs, key=lambda x: x["nilai"])
    d_lowest = min(dampak_docs, key=lambda x: x["nilai"])
    
    await db.analisis_risiko.update_one(
        {"_id": analisis["_id"]},
        {"$set": {
            "kemungkinan_id_treated": str(k_lowest["_id"]),
            "dampak_id_treated": str(d_lowest["_id"]),
            "skor_kemungkinan_treated": float(k_lowest["nilai"]),
            "skor_dampak_treated": float(d_lowest["nilai"]),
            "level_risiko_treated": int(k_lowest["nilai"] * d_lowest["nilai"]),
            
            "kemungkinan_id_actual": str(k_lowest["_id"]),
            "dampak_id_actual": str(d_lowest["_id"]),
            "skor_kemungkinan_actual": float(k_lowest["nilai"]),
            "skor_dampak_actual": float(d_lowest["nilai"]),
            "level_risiko_actual": int(k_lowest["nilai"] * d_lowest["nilai"])
        }}
    )
    print("Updated AnalisisRisiko with Treated and Actual risk.")
    
    # Delete potentially old attachments
    await db.attachment_komentar.delete_many({"ref_id": str(analisis["_id"])})
    
    # Create Existing Control (Attachment)
    await db.attachment_komentar.insert_one({
        "type": "PENGENDALIAN_DOKUMEN",
        "ref_id": str(analisis["_id"]),
        "file_name": "SOP_Pengawasan_Internal.pdf",
        "tahun": 2026,
        "deskripsi": "SOP Standardisasi Pengawasan Mencegah Kebocoran Data",
        "created_at": datetime.utcnow()
    })
    print("Inserted Existing Control attachment.")
    
    await db.evaluasi_risiko.delete_many({"analisis_risiko_id": str(analisis["_id"])})
    
    # Create EvaluasiRisiko -> RTP
    eval_res = await db.evaluasi_risiko.insert_one({
        "identifikasi_risiko_id": identifikasi_id,
        "analisis_risiko_id": str(analisis["_id"]),
        "jenis": "penyebab",
        "deskripsi": "Kurangnya sistem enkripsi data pada server lokal",
        "pengendalian": "Pelatihan dan Sertifikasi",
        "jenis_pengendalian": "Mengurangi kemungkinan",
        "created_at": datetime.utcnow(),
        "created_by": "system",
        "created_by_name": "System Seeder"
    })
    print("Inserted Evaluasi Risiko.")
    
    await db.rtp.delete_many({"evaluasi_risiko_id": str(eval_res.inserted_id)})
    
    await db.rtp.insert_one({
        "evaluasi_risiko_id": str(eval_res.inserted_id),
        "deskripsi": "Mengadakan Pelatihan Keamanan Siber 2026",
        "respon_risiko": "REDUCE_FREQUENCY",
        "rencana_aksi": "Bekerja sama dengan BSSN",
        "target_waktu": datetime.utcnow(),
        "pic": "Kepala Bidang IT",
        "indikator": "Tersertifikasinya tim IT (10 orang)",
        "output": "Sertifikat BSSN",
        "anggaran": 50000000.0,
        "status": "DRAFT",
        "created_at": datetime.utcnow(),
        "created_by": "system",
        "created_by_name": "System Seeder"
    })
    
    print("Inserted RTP.")

asyncio.run(seed_data())
