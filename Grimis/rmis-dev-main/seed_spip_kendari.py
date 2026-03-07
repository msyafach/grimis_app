import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
import decouple
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.utils.auth import get_password_hash
from app.schemas.user import UserRole

async def seed_spip_hierarchy():
    MONGO_URL = decouple.config("MONGODB_URL", default="mongodb://localhost:27017")
    DB_NAME = decouple.config("DB_NAME", default="rmis")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Membangun Struktur SPIP Pemerintah Kota Kendari...")
    tahun = 2026
    
    # 1. Pastikan Instansi Utama ada (Pemerintah Kota Kendari)
    instansi = await db.instansi.find_one({"kode_instansi": "PEMKOT-KDI"})
    if not instansi:
        print("Instansi PEMKOT-KDI belum ada, jalankan seed_kendari_data.py terlebih dahulu.")
        return
        
    instansi_id = str(instansi["_id"])
    
    # 2. Buat hierarki Induk Unit Kerja (SKPD/OPD)
    opd_list = [
        {"nama": "Inspektorat", "kode": "INSP-KDI", "jenis": "KABUPATEN_KOTA"},
        {"nama": "Dinas Kesehatan", "kode": "DINKES-KDI", "jenis": "KABUPATEN_KOTA"},
        {"nama": "Dinas Pendidikan, Pemuda dan Olahraga", "kode": "DIKPORA-KDI", "jenis": "KABUPATEN_KOTA"}
    ]
    
    opd_ids = {}
    
    print("Menyiapkan OPD...")
    for opd in opd_list:
        existing = await db.induk_unit_kerja.find_one({"kode_induk": opd["kode"]})
        if existing:
            opd_id = str(existing["_id"])
        else:
            res = await db.induk_unit_kerja.insert_one({
                "nama_induk_unit": opd["nama"],
                "kode_induk": opd["kode"],
                "id_instansi": instansi_id,
                "jenis": opd["jenis"],
                "created_at": datetime.utcnow()
            })
            opd_id = str(res.inserted_id)
        
        opd_ids[opd["kode"]] = opd_id
        
        # Buat Struktur Organisasi dasar untuk masing-masing OPD
        if not await db.struktur_organisasi.find_one({"kode": opd["kode"]}):
           await db.struktur_organisasi.insert_one({
               "kode": opd["kode"],
               "nama": opd["nama"],
               "nama_pendek": opd["nama"].split()[0], # Inspektorat, Dinas...
               "selera_risiko": 12,
               "provinsi": "Sulawesi Tenggara",
               "id_induk_unit_kerja": opd_id,
               "id_instansi": instansi_id,
               "jenis_konteks": [{"kode": f"JK-{opd['kode']}", "nama": "Sasaran Utama", "jenis": "SASARAN"}],
               "created_at": datetime.utcnow()
           })
    
    # Fokus pada Inspektorat untuk Hierarki User lengkap (Sesuai role SPIP)
    insp_id = opd_ids["INSP-KDI"]
    
    password_hash = get_password_hash("spip123")
    
    # 3. Buat User Berdasarkan Hierarki SPIP di Inspektorat
    spip_users = [
        # Kepala Dinas / Inspektur
        {"role": UserRole.ADMIN_KLP, "user": "inspektur_kdi", "nama": "Budi", "belakang": "Inspektur"},
        
        # Koordinator Manajemen Risiko (Sekretaris / Perencana)
        {"role": UserRole.UNIT_MANAJEMEN_RISIKO, "user": "koordinator_mr", "nama": "Siti", "belakang": "Koordinator MR"},
        
        # Pemilik Risiko (Kepala Bidang, cth: Kabid Pengawasan)
        {"role": UserRole.PEMILIK_RISIKO, "user": "kabid_pengawasan", "nama": "Andi", "belakang": "Kabid (Pemilik Risiko)"},
        
        # Pengelola Risiko (Kepala Seksi / Auditor Madya)
        {"role": UserRole.PENGELOLA_RISIKO, "user": "kasi_audit", "nama": "Dewi", "belakang": "Kasi (Pengelola Risiko)"},
        
        # Pengawas Intern (Tim APIP Independen)
        {"role": UserRole.PENGAWAS_INTERN, "user": "apip_kdi", "nama": "Agus", "belakang": "Auditor (Pengawas Intern)"},
        
        # Pegawai Biasa (Staf Pelaksana)
        {"role": UserRole.PEGAWAI, "user": "staf_insp", "nama": "Rina", "belakang": "Staf Pelaksana"}
    ]
    
    print("\nMembangun Pengguna Hierarki SPIP untuk Inspektorat...")
    for su in spip_users:
        if not await db.users.find_one({"username": su["user"]}):
            await db.users.insert_one({
                "nama_depan": su["nama"],
                "nama_belakang": su["belakang"],
                "email": f"{su['user']}@kendari.go.id",
                "username": su["user"],
                "password": password_hash,
                "role": su["role"].value,
                "instansi_id": instansi_id,
                "induk_unit_kerja_ids": [insp_id],
                "last_instansi_id": instansi_id,
                "last_induk_unit_kerja_id": insp_id,
                "created_at": datetime.utcnow(),
                "is_active": True
            })
            print(f" -> User '{su['user']}' [{su['role'].value}] ditambahkan dengan password 'spip123'")
        else:
            print(f" -> User '{su['user']}' sudah ada.")
            
    # 4. Contoh Data Pelaporan Kejadian Lintas Role
    # Asumsikan 'staf_insp' melaporkan kejadian, 'kasi_audit' me-review.
    # Kita buat koleksi "LaporanKejadian" (contoh) atau "Insiden"
    
    print("\nMenyuntikkan Dummy Laporan Kejadian SPIP...")
    
    # Ambil ref id untuk identifikasi (jika ada yg match dengan kendari_data)
    ident = await db.identifikasi_risiko.find_one({"id_induk_unit_kerja": insp_id})
    ident_id = str(ident["_id"]) if ident else None
    
    incidents = [
        {
            "kode_laporan": "LK-KDI-2026-001",
            "tanggal_kejadian": datetime.utcnow(),
            "judul_insiden": "Kegagalan Sistem Presensi Biometrik",
            "deskripsi": "Pada pagi hari pukul 07:00 WITA, sistem presensi offline maupun online (API) tidak dapat diakses sehingga pegawai tidak bisa check-in. Hal ini menyebabkan penumpukan di pintu masuk.",
            "kategori_insiden": "Operasional / Sistem TI",
            "dampak_finansial": 0,
            "dampak_non_finansial": "Keluhan pegawai, data presensi harian perlu diinput manual oleh admin kepegawaian.",
            "tindakan_langsung": "Mengaktifkan pencatatan absensi manual di buku resepsionis untuk sementara.",
            "pelapor_id": "staf_insp",
            "pelapor_nama": "Rina Staf Pelaksana",
            "status": "APPROVED",
            "reviewer_id": "koordinator_mr", 
            "reviewer_nama": "Siti Koordinator MR",
            "evaluasi_reviewer": "Telah ditindaklanjuti ke Dinas Kominfo, *server* utama *down*. Insiden di-*close*.",
            "id_instansi": instansi_id,
            "id_induk_unit_kerja": insp_id,
            "terkait_risiko_id": ident_id,
            "created_at": datetime.utcnow()
        },
        {
            "kode_laporan": "LK-KDI-2026-002",
            "tanggal_kejadian": datetime.utcnow(),
            "judul_insiden": "Keterlambatan Penyerahan Dokumen LHP",
            "deskripsi": "Tim pemeriksa terlambat menyerahkan Laporan Hasil Pemeriksaan (LHP) ke pimpinan karena anggota tim cuti sakit bersamaan dengan deadline.",
            "kategori_insiden": "Kinerja / Kepatuhan",
            "dampak_finansial": 0,
            "dampak_non_finansial": "Rapat paparan dengan pimpinan tertunda 1 minggu.",
            "tindakan_langsung": "Meminta perpanjangan waktu secara resmi kepada pimpinan.",
            "pelapor_id": "kabid_pengawasan",
            "pelapor_nama": "Andi Kabid (Pemilik Risiko)",
            "status": "DRAFT",
            "reviewer_id": None,
            "reviewer_nama": None,
            "evaluasi_reviewer": "",
            "id_instansi": instansi_id,
            "id_induk_unit_kerja": insp_id,
            "terkait_risiko_id": ident_id,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Reset old data (clean slate for incidents)
    await db.pelaporan_kejadian.delete_many({"id_induk_unit_kerja": insp_id})
    
    for inc in incidents:
        await db.pelaporan_kejadian.insert_one(inc)
        print(f" -> Laporan Insiden '{inc['kode_laporan']}' disuntikkan.")
        
    print("\nSelesai! Hierarki SPIP dan Data Laporan Kejadian siap di-\"backend\".")

if __name__ == "__main__":
    asyncio.run(seed_spip_hierarchy())
