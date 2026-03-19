from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, EmailStr, validator
import jwt
import uuid
from bson import ObjectId

from app.schemas.risk import MonitoringStatus
from app.database import Database
from app.utils.auth import get_current_user, SECRET_KEY
from app.schemas.user import UserRole

# Create router
router = APIRouter()

# Models for incident reporting
class LaporanKejadianBase(BaseModel):
    nama: str = Field(..., description="Nama pelapor")
    email: EmailStr = Field(..., description="Email pelapor")
    no_hp: str = Field(..., description="Nomor handphone pelapor")
    nama_kejadian: str = Field(..., description="Nama kejadian yang dilaporkan")
    waktu_kejadian: datetime = Field(..., description="Waktu kejadian")
    tempat_kejadian: str = Field(..., description="Tempat kejadian")
    pemicu_kejadian: str = Field(..., description="Pemicu/penyebab kejadian")

class LaporanKejadianCreate(LaporanKejadianBase):
    pass

class LaporanKejadianResponse(LaporanKejadianBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    status: MonitoringStatus = MonitoringStatus.PENDING
    created_at: datetime
    triwulan_periode_kejadian: Optional[int] = None
    triwulan_periode_kejadian_nama: Optional[str] = None
    pernyataan_risiko_id: Optional[str] = None
    dampak_id: Optional[str] = None
    tahun: Optional[int] = None

# Model for approval response
class ApprovalResponse(BaseModel):
    status: str
    message: str

# Model for approval action
class ApprovalAction(BaseModel):
    action: str = Field(..., description="Action to take (APPROVE/REJECT)")
    pernyataan_risiko_id: Optional[str] = Field(None, description="ID of risk statement from kamus_risiko (required if approving)")
    dampak_id: Optional[str] = Field(None, description="ID of impact criteria (required if approving)")
    notes: Optional[str] = Field(None, description="Notes for rejection reason")

# Helper function to determine which quarter (triwulan) a date falls in
def get_triwulan(date: datetime) -> tuple:
    month = date.month
    if 1 <= month <= 3:
        return 1, "Triwulan 1"
    elif 4 <= month <= 6:
        return 2, "Triwulan 2" 
    elif 7 <= month <= 9:
        return 3, "Triwulan 3"
    else:
        return 4, "Triwulan 4"

# Endpoints
@router.post("/generate-link")
async def generate_anonymous_link(
    expiry_days: int = Query(7, description="Number of days until the link expires"),
    tahun: int = Query(..., description="Tahun untuk laporan kejadian"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an anonymous link for incident reporting.
    The generated link will be valid for the specified number of days.
    Reports submitted through this link will be associated with the specified year.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, UNIT_MANAJEMEN_RISIKO and PENGELOLA_RISIKO can generate links"
        )
    
    db = await Database.get_db()
    
    # Clean up old token mappings (older than 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    try:
        # Delete expired tokens or tokens older than 24 hours
        await db.token_mappings.delete_many({
            "$or": [
                {"expires_at": {"$lt": datetime.utcnow()}},  # Already expired
                {"created_at": {"$lt": one_day_ago}}         # Older than 24 hours
            ]
        })
    except Exception as e:
        print(f"Error cleaning up old token mappings: {e}")
    
    # Get user's institution and parent work unit
    user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not user_data.get("last_instansi_id"):
        raise HTTPException(
            status_code=400,
            detail="User does not have a selected institution"
        )
    
    id_instansi = user_data.get("last_instansi_id")
    id_induk_unit_kerja = user_data.get("last_induk_unit_kerja_id")
    
    # Get institution and parent work unit names for display
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    instansi_name = instansi.get("nama_instansi") if instansi else "Unknown"
    
    induk_unit_name = "Semua Unit"
    if id_induk_unit_kerja:
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        if induk_unit:
            induk_unit_name = induk_unit.get("nama_induk_unit")
    
    # Set expiry date
    expiry = datetime.utcnow() + timedelta(days=expiry_days)
    
    # Create JWT payload
    payload = {
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "exp": expiry.timestamp(),
        "tahun": tahun  # Store the year in the token
    }
    
    # Use the SECRET_KEY from auth module
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    # Generate a short reference ID (not the actual token)
    reference_id = str(uuid.uuid4())[:8]
    
    # Store the mapping of reference_id to actual token
    await db.token_mappings.insert_one({
        "reference_id": reference_id,
        "token": token,
        "created_at": datetime.utcnow(),
        "expires_at": expiry,
        "created_by": str(current_user["id"]),
        "tahun": tahun  # Store the year in the token mapping as well
    })
    
    # Format the link with the reference_id instead of the token
    link = f"/laporan-kejadian/{reference_id}"
    
    return {
        "link": link,
        "institution": instansi_name,
        "parent_work_unit": induk_unit_name,
        "expires_at": expiry,
        "tahun": tahun  # Include the year in the response
    }

@router.get("/validate-token")
async def validate_anonymous_token(
    reference_id: str = Query(..., description="Anonymous link reference ID")
):
    """
    Validate an anonymous token by reference ID and return information about the institution, unit, and year.
    """
    db = await Database.get_db()
    
    # Look up the token mapping
    token_mapping = await db.token_mappings.find_one({"reference_id": reference_id})
    if not token_mapping:
        raise HTTPException(
            status_code=404,
            detail="Invalid reference ID"
        )
    
    token = token_mapping.get("token")
    
    # Check if token has expired
    if datetime.utcnow() > token_mapping.get("expires_at"):
        await db.token_mappings.update_one(
            {"reference_id": reference_id},
            {"$set": {"expired": True}}
        )
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    
    # Verify the token using the SECRET_KEY from auth module
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        # Mark as expired in database too
        await db.token_mappings.update_one(
            {"reference_id": reference_id},
            {"$set": {"expired": True}}
        )
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    # Extract data from token
    id_instansi = payload.get("id_instansi")
    id_induk_unit_kerja = payload.get("id_induk_unit_kerja")
    tahun = payload.get("tahun")
    
    if not id_instansi:
        raise HTTPException(
            status_code=400,
            detail="Token does not contain valid institution information"
        )
    
    # Get institution and parent work unit information
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    instansi_info = {"nama": instansi.get("nama_instansi"), "id": str(instansi["_id"])} if instansi else None
    
    induk_unit_info = None
    if id_induk_unit_kerja:
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        if induk_unit:
            induk_unit_info = {"nama": induk_unit.get("nama_induk_unit"), "id": str(induk_unit["_id"])}
    
    # If tahun is not in token, use the current year
    if not tahun:
        tahun = datetime.now().year
    
    return {
        "valid": True,
        "instansi": instansi_info,
        "induk_unit_kerja": induk_unit_info,
        "expires_at": datetime.fromtimestamp(payload.get("exp")),
        "tahun": tahun
    }

@router.post("/submit", response_model=LaporanKejadianResponse)
async def submit_laporan_kejadian(
    reference_id: str = Query(..., description="Anonymous link reference ID"),
    email: EmailStr = Body(..., description="Email pelapor"),
    no_telp: str = Body(..., description="Nomor handphone pelapor"),
    nama_lengkap: str = Body(..., description="Nama pelapor"),
    kejadian: str = Body(..., description="Nama kejadian yang dilaporkan"),
    waktu_kejadian: datetime = Body(..., description="Waktu kejadian"),
    tempat: str = Body(..., description="Tempat kejadian"),
    penjelasan: str = Body(..., description="Pemicu/penyebab kejadian")
):
    """
    Submit an incident report using an anonymous token reference ID.
    After successful submission, the token will be deleted to prevent reuse.
    The report will be associated with the year specified when the link was generated.
    """
    db = await Database.get_db()
    
    # Look up the token mapping
    token_mapping = await db.token_mappings.find_one({"reference_id": reference_id})
    if not token_mapping:
        raise HTTPException(
            status_code=404,
            detail="Invalid reference ID"
        )
    
    token = token_mapping.get("token")
    
    # Check if token has expired from the database
    if datetime.utcnow() > token_mapping.get("expires_at"):
        await db.token_mappings.update_one(
            {"reference_id": reference_id},
            {"$set": {"expired": True}}
        )
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    
    # Verify the token using the SECRET_KEY from auth module
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        # Mark as expired in database too
        await db.token_mappings.update_one(
            {"reference_id": reference_id},
            {"$set": {"expired": True}}
        )
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    # Extract data from token
    id_instansi = payload.get("id_instansi")
    id_induk_unit_kerja = payload.get("id_induk_unit_kerja")
    tahun = payload.get("tahun")  # Get year from token
    
    if not id_instansi:
        raise HTTPException(
            status_code=400,
            detail="Token does not contain valid institution information"
        )
    
    if not tahun:
        # Fallback to current year if not specified in token
        tahun = datetime.now().year
    
    # Calculate triwulan
    triwulan_num, triwulan_name = get_triwulan(waktu_kejadian)
    
    # Create database entry using the provided form fields
    laporan_data = {
        "nama": nama_lengkap,
        "email": email,
        "no_hp": no_telp,
        "nama_kejadian": kejadian,
        "waktu_kejadian": waktu_kejadian,
        "tempat_kejadian": tempat,
        "pemicu_kejadian": penjelasan,
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "status": MonitoringStatus.PENDING,
        "created_at": datetime.utcnow(),
        "triwulan_periode_kejadian": triwulan_num,
        "triwulan_periode_kejadian_nama": triwulan_name,
        "tahun": tahun  # Store the year from the token
        # reference_id dihapus dari data yang disimpan
    }
    
    result = await db.laporan_kejadian.insert_one(laporan_data)
    
    # Get the created document
    created_laporan = await db.laporan_kejadian.find_one({"_id": result.inserted_id})
    created_laporan["id"] = str(created_laporan["_id"])
    
    # Hapus token_mapping dari database untuk mencegah penggunaan ulang
    await db.token_mappings.delete_one({"reference_id": reference_id})
    
    return LaporanKejadianResponse(**created_laporan)

@router.get("/pending", response_model=List[LaporanKejadianResponse])
async def get_pending_laporan(
    tahun: Optional[int] = Query(None, description="Tahun laporan kejadian"),
    id_instansi: Optional[str] = None,
    id_induk_unit_kerja: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of pending incident reports for the specified year.
    If no year is specified, uses the current year.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, UNIT_MANAJEMEN_RISIKO and PENGELOLA_RISIKO can view pending reports"
        )
    
    db = await Database.get_db()
    
    # Use current year if tahun is not provided
    if tahun is None:
        tahun = datetime.now().year
    
    # Build query
    query = {
        "status": MonitoringStatus.PENDING,
        "tahun": tahun
    }
    
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # If not SUPER_ADMIN, limit to user's institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        query["id_instansi"] = user_data.get("last_instansi_id")
        
        # If PENGELOLA_RISIKO, further limit to their parent work unit
        if current_user["role"] == UserRole.PENGELOLA_RISIKO and user_data.get("last_induk_unit_kerja_id"):
            query["id_induk_unit_kerja"] = user_data.get("last_induk_unit_kerja_id")
    
    # Get reports
    reports = []
    async for report in db.laporan_kejadian.find(query):
        # Convert ObjectId to string
        report["id"] = str(report["_id"])
        # Convert any nested ObjectId to string
        for key, value in report.items():
            if isinstance(value, ObjectId):
                report[key] = str(value)
        
        # Add to result set
        reports.append(LaporanKejadianResponse(**report))
    
    return reports

@router.get("/{laporan_id}", response_model=LaporanKejadianResponse)
async def get_laporan_by_id(
    laporan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get incident report by ID.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP and PENGELOLA_RISIKO can view reports"
        )
    
    db = await Database.get_db()
    
    # Get the report
    report = await db.laporan_kejadian.find_one({"_id": ObjectId(laporan_id)})
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Incident report not found"
        )
    
    # If not SUPER_ADMIN, check if user has access to this report's institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        
        if user_data.get("last_instansi_id") != report.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this report"
            )
        
        # If PENGELOLA_RISIKO, check if they have access to this report's parent work unit
        if (current_user["role"] == UserRole.PENGELOLA_RISIKO and 
            user_data.get("last_induk_unit_kerja_id") and 
            user_data.get("last_induk_unit_kerja_id") != report.get("id_induk_unit_kerja")):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this report"
            )
    
    report["id"] = str(report["_id"])
    return LaporanKejadianResponse(**report)

@router.post("/{laporan_id}/approve", response_model=ApprovalResponse)
async def approve_laporan(
    laporan_id: str,
    approval: ApprovalAction,
    current_user: dict = Depends(get_current_user)
):
    """
    Menyetujui atau menolak laporan kejadian.
    
    Jika disetujui (action=APPROVE), sistem akan:
    1. Mengaitkan laporan dengan pernyataan risiko dari identifikasi_risiko
    2. Menetapkan kriteria dampak yang dipilih
    3. Mengubah status laporan menjadi VERIFIED
    
    Jika ditolak (action=REJECT), sistem akan:
    1. Mengubah status laporan menjadi REJECTED
    2. Menyimpan catatan penolakan
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to approve incident reports"
        )
    
    db = Database.db
    
    # Find the incident report
    laporan = await db.laporan_kejadian.find_one({"_id": ObjectId(laporan_id)})
    if not laporan:
        raise HTTPException(status_code=404, detail="Laporan kejadian tidak ditemukan")
    
    # Check if report is already processed
    if laporan.get("status") != MonitoringStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Laporan sudah diproses dengan status {laporan.get('status')}"
        )
    
    # If not SUPER_ADMIN, check if user has access to this report's institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        
        if user_data.get("last_instansi_id") != laporan.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="Anda tidak memiliki akses ke laporan ini"
            )

        # If PENGELOLA_RISIKO, check if they have access to this report's parent work unit
        if (current_user["role"] == UserRole.PENGELOLA_RISIKO and 
            user_data.get("last_induk_unit_kerja_id") and 
            user_data.get("last_induk_unit_kerja_id") != laporan.get("id_induk_unit_kerja")):
            raise HTTPException(
                status_code=403,
                detail="Anda tidak memiliki akses ke laporan ini"
            )
    
    # Check action
    if approval.action == "APPROVE":
        # Verify all required fields are provided
        if not approval.pernyataan_risiko_id:
            raise HTTPException(status_code=400, detail="ID pernyataan risiko diperlukan untuk approval")
        if not approval.dampak_id:
            raise HTTPException(status_code=400, detail="ID kriteria dampak diperlukan untuk approval")
            
        # Verify pernyataan_risiko_id exists in identifikasi_risiko
        identifikasi = await db.identifikasi_risiko.find_one({
            "_id": ObjectId(approval.pernyataan_risiko_id),
            "id_instansi": laporan["id_instansi"]
        })
        if not identifikasi:
            raise HTTPException(
                status_code=400, 
                detail="Pernyataan risiko tidak valid atau tidak ditemukan"
            )
            
        # Verify dampak_id exists
        dampak = await db.kriteria_dampak.find_one({
            "_id": ObjectId(approval.dampak_id),
            "id_instansi": laporan["id_instansi"]
        })
        if not dampak:
            raise HTTPException(status_code=400, detail="Kriteria dampak tidak valid")
        
        # Create entry in monitoring_risiko
        monitoring_data = {
            "triwulan_periode_kejadian": laporan.get("triwulan_periode_kejadian", get_triwulan(laporan["waktu_kejadian"])[0]),
            "triwulan_periode_kejadian_nama": laporan.get("triwulan_periode_kejadian_nama", get_triwulan(laporan["waktu_kejadian"])[1]),
            "nama": identifikasi["pernyataan_risiko"],  # Menggunakan pernyataan risiko dari identifikasi
            "nama_kejadian": laporan["nama_kejadian"],
            "nama_penyebab": "",  # Menggunakan empty string sebagai default
            "waktu_kejadian": laporan["waktu_kejadian"],
            "tempat_kejadian": laporan["tempat_kejadian"],
            "skor_dampak": dampak["nilai"],
            "skor_dampak_text": dampak["nama"],
            "pemicu_kejadian": laporan["pemicu_kejadian"],
            "status": MonitoringStatus.VERIFIED,
            "tahun": laporan.get("tahun", datetime.now().year),  # Use the year from the report or fallback to current year
            "id_instansi": laporan["id_instansi"],
            "id_induk_unit_kerja": laporan["id_induk_unit_kerja"],
            "email": laporan["email"],
            "no_hp": laporan["no_hp"],
            "nama_pelapor": laporan["nama"],
            "created_at": datetime.utcnow(),
            "approved_by": str(current_user["id"]),
            "approved_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
            "approved_at": datetime.utcnow(),
            "id_identifikasi_risiko": str(identifikasi["_id"]),  # Menggunakan ID identifikasi risiko
            "id_dampak": str(dampak["_id"]),
            "source": "LAPORAN_KEJADIAN",
            "id_laporan_kejadian": str(laporan["_id"])
        }
        
        # Add kemungkinan data if provided in the approval
        if hasattr(approval, 'kemungkinan_id') and approval.kemungkinan_id:
            kemungkinan = await db.kriteria_kemungkinan.find_one({
                "_id": ObjectId(approval.kemungkinan_id),
                "id_instansi": laporan["id_instansi"]
            })
            if kemungkinan:
                monitoring_data["kemungkinan_id"] = str(kemungkinan["_id"])
                monitoring_data["skor_kemungkinan"] = kemungkinan["nilai"]
                monitoring_data["skor_kemungkinan_text"] = kemungkinan["nama"]

        result_monitoring = await db.monitoring_risiko.insert_one(monitoring_data)
        
        # Update laporan status
        await db.laporan_kejadian.update_one(
            {"_id": ObjectId(laporan_id)},
            {"$set": {
                "status": MonitoringStatus.VERIFIED,
                "approved_by": str(current_user["id"]),
                "approved_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
                "approved_at": datetime.utcnow(),
                "pernyataan_risiko_id": approval.pernyataan_risiko_id,  # Menyimpan ID identifikasi risiko
                "dampak_id": approval.dampak_id,
                "id_monitoring_risiko": str(result_monitoring.inserted_id)
            }}
        )
        
        return {
            "status": "success",
            "message": "Laporan kejadian disetujui dan ditambahkan ke sistem monitoring"
        }
        
    elif approval.action == "REJECT":
        # Update laporan status
        await db.laporan_kejadian.update_one(
            {"_id": ObjectId(laporan_id)},
            {"$set": {
                "status": MonitoringStatus.REJECTED,
                "rejected_by": str(current_user["id"]),
                "rejected_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
                "rejected_at": datetime.utcnow(),
                "rejection_notes": approval.notes
            }}
        )
        
        return {
            "status": "success",
            "message": "Laporan kejadian ditolak"
        }
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Tindakan tidak valid. Harus APPROVE atau REJECT."
        )

@router.get("/options/kamus-risiko")
async def get_kamus_risiko_options(
    id_instansi: str,
    tahun: int = Query(..., description="Tahun untuk filter pernyataan risiko"),
    id_induk_unit_kerja: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Mendapatkan daftar pernyataan risiko dari identifikasi_risiko berdasarkan tahun,
    untuk digunakan dalam form approval laporan kejadian.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP and PENGELOLA_RISIKO can access this endpoint"
        )
    
    db = await Database.get_db()
    
    # Build query
    query = {
        "id_instansi": id_instansi,
        "tahun": tahun,
        "disabled": False  # Hanya ambil yang tidak dinonaktifkan
    }
    
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
        
    if search:
        query["$or"] = [
            {"pernyataan_risiko": {"$regex": search, "$options": "i"}},
            {"deskripsi": {"$regex": search, "$options": "i"}}
        ]
    
    # Proyeksi untuk mengambil hanya field yang diperlukan
    projection = {
        "_id": 1,
        "pernyataan_risiko": 1,
        "deskripsi": 1,
        "id_kategori_risiko": 1
    }
    
    identifikasi_risiko = await db.identifikasi_risiko.find(query, projection).to_list(1000)
    
    # Format hasil untuk frontend
    result = []
    for item in identifikasi_risiko:
        # Dapatkan kategori risiko untuk ditampilkan bersama pernyataan risiko
        kategori = None
        if "id_kategori_risiko" in item and item["id_kategori_risiko"]:
            kategori = await db.kategori_risiko.find_one({"_id": ObjectId(item["id_kategori_risiko"])})
        
        result.append({
            "id": str(item["_id"]),
            "pernyataan_risiko": item.get("pernyataan_risiko", ""),
            "deskripsi": item.get("deskripsi", ""),
            "kategori": kategori["nama"] if kategori else ""
        })
    
    # Menggunakan format yang sama dengan kode sebelumnya untuk konsistensi dengan frontend
    return {"options": result}

@router.get("/options/kriteria")
async def get_kriteria_risiko_options(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk criteria options for a specific institution and parent work unit.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP and PENGELOLA_RISIKO can access this endpoint"
        )
    
    db = await Database.get_db()
    
    # Build queries
    query_dampak = {"id_instansi": id_instansi}
    
    if id_induk_unit_kerja:
        query_dampak["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Get dampak options
    dampak_options = []
    async for item in db.kriteria_dampak.find(query_dampak).sort("nilai", 1):
        dampak_options.append({
            "id": str(item["_id"]),
            "kode": item["kode"],
            "nama": item["nama"],
            "nilai": item["nilai"],
            "deskripsi": item["deskripsi"]
        })
    
    return {
        "dampak": dampak_options
    }

@router.get("")
async def get_laporan_kejadian(
    tahun: int = Query(..., description="Tahun laporan kejadian"),
    id_instansi: Optional[str] = None,
    id_induk_unit_kerja: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all incident reports for the specified year.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, UNIT_MANAJEMEN_RISIKO and PENGELOLA_RISIKO can view reports"
        )
    
    db = await Database.get_db()
    
    # Build query
    query = {"tahun": tahun}
    
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # If not SUPER_ADMIN, limit to user's institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        query["id_instansi"] = user_data.get("last_instansi_id")
        
        # If PENGELOLA_RISIKO, further limit to their parent work unit
        if current_user["role"] == UserRole.PENGELOLA_RISIKO and user_data.get("last_induk_unit_kerja_id"):
            query["id_induk_unit_kerja"] = user_data.get("last_induk_unit_kerja_id")
    
    # Get reports
    reports = []
    async for report in db.laporan_kejadian.find(query):
        # Convert ObjectId to string
        report["id"] = str(report["_id"])
        # Convert any nested ObjectId to string
        for key, value in report.items():
            if isinstance(value, ObjectId):
                report[key] = str(value)
        
        # Add to result set
        reports.append(LaporanKejadianResponse(**report))
    
    return reports