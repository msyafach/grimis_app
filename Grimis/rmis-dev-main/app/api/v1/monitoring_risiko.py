from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from dateutil import parser

from app.schemas.risk import (
    MonitoringRisikoCreate,
    MonitoringRisikoUpdate,
    MonitoringRisikoResponse,
    MonitoringStatus
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

def calculate_triwulan(date):
    """Calculate which quarter (triwulan) a date falls into."""
    # Convert string date to datetime if needed
    if isinstance(date, str):
        try:
            # Try to parse ISO format date string
            date = parser.parse(date)
        except Exception as e:
            print(f"Error parsing date string: {e}")
            # Default to current date if parsing fails
            date = datetime.now()
    
    month = date.month
    if 1 <= month <= 3:
        return 1
    elif 4 <= month <= 6:
        return 2
    elif 7 <= month <= 9:
        return 3
    else:
        return 4

@router.post("", response_model=MonitoringRisikoResponse)
async def create_monitoring(
    monitoring: MonitoringRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk monitoring record.
    """
    # Only SUPER_ADMIN and PENGELOLA_RISIKO can create monitoring records
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to create monitoring records"
        )
    
    db = await Database.get_db()
    
    monitoring_dict = monitoring.dict()
    monitoring_dict["created_at"] = datetime.utcnow()
    monitoring_dict["created_by"] = str(current_user["id"])
    # Always set status to PENDING for new monitoring records
    monitoring_dict["status"] = MonitoringStatus.PENDING
    
    # Ensure nama_penyebab is set, use empty string if not provided or is None
    if "nama_penyebab" not in monitoring_dict or monitoring_dict["nama_penyebab"] is None:
        monitoring_dict["nama_penyebab"] = ""
    
    # Calculate triwulan if waktu_kejadian is provided but triwulan_periode_kejadian is not
    if "waktu_kejadian" in monitoring_dict and ("triwulan_periode_kejadian" not in monitoring_dict or monitoring_dict["triwulan_periode_kejadian"] is None):
        monitoring_dict["triwulan_periode_kejadian"] = calculate_triwulan(monitoring_dict["waktu_kejadian"])
    
    # Map triwulan to name
    quarter_names = {
        1: "Triwulan 1",
        2: "Triwulan 2",
        3: "Triwulan 3",
        4: "Triwulan 4"
    }
    
    if "triwulan_periode_kejadian" in monitoring_dict:
        monitoring_dict["triwulan_periode_kejadian_nama"] = quarter_names.get(
            monitoring_dict.get("triwulan_periode_kejadian"), ""
        )
    
    # Add skor_dampak_text if dampak_id is provided
    if "dampak_id" in monitoring_dict and monitoring_dict["dampak_id"]:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(monitoring_dict["dampak_id"])})
            if dampak:
                monitoring_dict["skor_dampak_text"] = f"{dampak['nama']} ({dampak['nilai']})"
        except Exception as e:
            print(f"Error fetching dampak: {e}")
    
    # If skor_dampak_text is still not set, use a default format
    if "skor_dampak_text" not in monitoring_dict or not monitoring_dict["skor_dampak_text"]:
        monitoring_dict["skor_dampak_text"] = f"Skor Dampak: {monitoring_dict.get('skor_dampak', 0)}"
    
    result = await db.monitoring_risiko.insert_one(monitoring_dict)
    created = await db.monitoring_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])
    
    return MonitoringRisikoResponse(**created)

@router.get("", response_model=List[MonitoringRisikoResponse])
async def get_monitoring_list(
    tahun: int = Query(..., description="Year of monitoring"),
    bagan_risiko_id: Optional[str] = None,
    status: Optional[MonitoringStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk monitoring records with filtering.
    """
    # ADMIN_KLP can't access monitoring records
    if current_user["role"] == UserRole.ADMIN_KLP:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to access monitoring records"
        )
    
    db = await Database.get_db()
    
    query = {"tahun": tahun}
    if bagan_risiko_id:
        query["bagan_risiko_id"] = bagan_risiko_id
    if status:
        query["status"] = status
    
    # Map for quarter names
    quarter_names = {
        1: "Triwulan 1",
        2: "Triwulan 2",
        3: "Triwulan 3",
        4: "Triwulan 4"
    }
    
    results = []
    async for monitoring in db.monitoring_risiko.find(query).sort("created_at", -1):
        monitoring["id"] = str(monitoring["_id"])
        
        # Ensure triwulan_periode_kejadian_nama is set
        if "triwulan_periode_kejadian" in monitoring and ("triwulan_periode_kejadian_nama" not in monitoring or not monitoring["triwulan_periode_kejadian_nama"]):
            monitoring["triwulan_periode_kejadian_nama"] = quarter_names.get(
                monitoring.get("triwulan_periode_kejadian"), ""
            )
        
        # Ensure skor_dampak_text is set
        if "skor_dampak" in monitoring and ("skor_dampak_text" not in monitoring or not monitoring["skor_dampak_text"]):
            # Try to get dampak name if dampak_id is present
            if "dampak_id" in monitoring and monitoring["dampak_id"]:
                try:
                    dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(monitoring["dampak_id"])})
                    if dampak:
                        monitoring["skor_dampak_text"] = f"{dampak['nama']} ({dampak['nilai']})"
                    else:
                        monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
                except Exception:
                    monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
            else:
                monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
        
        results.append(MonitoringRisikoResponse(**monitoring))
    
    return results

@router.get("/options/kamus-risiko")
async def get_kamus_risiko_options(
    id_instansi: str,
    tahun: int = Query(..., description="Tahun untuk filter pernyataan risiko"),
    id_induk_unit_kerja: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk statements from kamus risiko for selection.
    Used when creating or updating monitoring records.
    """
    db = await Database.get_db()
    
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Get identifikasi risiko for specified year
    identifikasi_query = {"tahun": tahun, "id_instansi": id_instansi, "disabled": False}
    if id_induk_unit_kerja:
        identifikasi_query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    if search:
        identifikasi_query["$or"] = [
            {"pernyataan_risiko": {"$regex": search, "$options": "i"}},
            {"deskripsi": {"$regex": search, "$options": "i"}}
        ]
    
    options = []
    async for identifikasi in db.identifikasi_risiko.find(identifikasi_query):
        options.append({
            "id": str(identifikasi["_id"]),
            "text": identifikasi.get("pernyataan_risiko", ""),
            "deskripsi": identifikasi.get("deskripsi", "")
        })
    
    return options

@router.get("/options/kriteria")
async def get_kriteria_risiko_options(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of impact criteria for selection.
    Used when creating or updating monitoring records.
    """
    db = await Database.get_db()
    
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    options = []
    async for kriteria in db.kriteria_dampak.find(query):
        options.append({
            "id": str(kriteria["_id"]),
            "value": kriteria["nilai"],
            "text": kriteria["nama"],
            "deskripsi": kriteria.get("deskripsi", "")
        })
    
    return sorted(options, key=lambda x: x["value"])

@router.post("/{monitoring_id}/verify", response_model=MonitoringRisikoResponse)
async def verify_monitoring(
    monitoring_id: str,
    status: MonitoringStatus,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify a risk monitoring record.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to verify monitoring"
        )
    
    db = await Database.get_db()
    
    existing = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Monitoring record not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"])
    }
    
    await db.monitoring_risiko.update_one(
        {"_id": ObjectId(monitoring_id)},
        {"$set": update_data}
    )
    
    updated = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    updated["id"] = monitoring_id
    
    return MonitoringRisikoResponse(**updated)

@router.post("/{monitoring_id}/edit", response_model=MonitoringRisikoResponse)
async def edit_monitoring(
    monitoring_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Edit specific fields of a monitoring record.
    This endpoint allows partial updates without requiring the full object.
    """
    # Only SUPER_ADMIN and PENGELOLA_RISIKO can edit monitoring records
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to edit monitoring records"
        )
    
    db = await Database.get_db()
    
    # Check if record exists
    existing = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Monitoring record not found")
    
    # Process nama_penyebab field - ensure it has a default value if missing
    if "nama_penyebab" in data and data["nama_penyebab"] is None:
        data["nama_penyebab"] = ""
    
    # Add metadata for the update
    data["updated_at"] = datetime.utcnow()
    data["updated_by"] = str(current_user["id"])
    
    # If waktu_kejadian is being updated, also update triwulan_periode_kejadian
    if "waktu_kejadian" in data:
        data["triwulan_periode_kejadian"] = calculate_triwulan(data["waktu_kejadian"])
    
    # Map quarter period to name if triwulan_periode_kejadian is being updated
    quarter_names = {
        1: "Triwulan 1",
        2: "Triwulan 2",
        3: "Triwulan 3",
        4: "Triwulan 4"
    }
    
    if "triwulan_periode_kejadian" in data:
        data["triwulan_periode_kejadian_nama"] = quarter_names.get(
            data.get("triwulan_periode_kejadian"), ""
        )
    
    # Update skor_dampak_text if dampak_id is being updated
    if "dampak_id" in data and data["dampak_id"]:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(data["dampak_id"])})
            if dampak:
                data["skor_dampak_text"] = f"{dampak['nama']} ({dampak['nilai']})"
        except Exception as e:
            print(f"Error fetching dampak: {e}")
    # Update skor_dampak_text if only skor_dampak is being updated
    elif "skor_dampak" in data:
        data["skor_dampak_text"] = f"Skor Dampak: {data.get('skor_dampak', 0)}"
    
    # Update the record
    await db.monitoring_risiko.update_one(
        {"_id": ObjectId(monitoring_id)},
        {"$set": data}
    )
    
    # Get updated record
    updated = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    updated["id"] = monitoring_id
    
    return MonitoringRisikoResponse(**updated)

@router.put("/{monitoring_id}", response_model=MonitoringRisikoResponse)
async def update_monitoring(
    monitoring_id: str,
    monitoring: MonitoringRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk monitoring record.
    """
    # Only SUPER_ADMIN and PENGELOLA_RISIKO can update monitoring records
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to update monitoring records"
        )
    
    db = await Database.get_db()
    
    existing = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Monitoring record not found")
    
    update_data = monitoring.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["id"])
    
    # If waktu_kejadian is being updated, also update triwulan_periode_kejadian
    if "waktu_kejadian" in update_data:
        update_data["triwulan_periode_kejadian"] = calculate_triwulan(update_data["waktu_kejadian"])
    
    # Map quarter period to name if triwulan_periode_kejadian is being updated
    quarter_names = {
        1: "Triwulan 1",
        2: "Triwulan 2",
        3: "Triwulan 3",
        4: "Triwulan 4"
    }
    
    if "triwulan_periode_kejadian" in update_data:
        update_data["triwulan_periode_kejadian_nama"] = quarter_names.get(
            update_data.get("triwulan_periode_kejadian"), ""
        )
    
    # Update skor_dampak_text if dampak_id is being updated
    if "dampak_id" in update_data and update_data["dampak_id"]:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(update_data["dampak_id"])})
            if dampak:
                update_data["skor_dampak_text"] = f"{dampak['nama']} ({dampak['nilai']})"
        except Exception as e:
            print(f"Error fetching dampak: {e}")
    # Update skor_dampak_text if only skor_dampak is being updated
    elif "skor_dampak" in update_data:
        update_data["skor_dampak_text"] = f"Skor Dampak: {update_data.get('skor_dampak', 0)}"
    
    await db.monitoring_risiko.update_one(
        {"_id": ObjectId(monitoring_id)},
        {"$set": update_data}
    )
    
    updated = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    updated["id"] = monitoring_id
    
    return MonitoringRisikoResponse(**updated)

@router.delete("/{monitoring_id}")
async def delete_monitoring(
    monitoring_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk monitoring record.
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete monitoring records"
        )
    
    db = await Database.get_db()
    
    result = await db.monitoring_risiko.delete_one({"_id": ObjectId(monitoring_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Monitoring record not found")
    
    return {"message": "Monitoring record deleted successfully"}

@router.get("/{monitoring_id}", response_model=MonitoringRisikoResponse)
async def get_monitoring_by_id(
    monitoring_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific monitoring record by ID.
    """
    # ADMIN_KLP can't access monitoring records
    if current_user["role"] == UserRole.ADMIN_KLP:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to access monitoring records"
        )
    
    db = await Database.get_db()
    
    monitoring = await db.monitoring_risiko.find_one({"_id": ObjectId(monitoring_id)})
    if not monitoring:
        raise HTTPException(status_code=404, detail="Monitoring record not found")
    
    # Map quarter period to name if not already present
    quarter_names = {
        1: "Triwulan 1",
        2: "Triwulan 2",
        3: "Triwulan 3",
        4: "Triwulan 4"
    }
    
    if "triwulan_periode_kejadian" in monitoring and ("triwulan_periode_kejadian_nama" not in monitoring or not monitoring["triwulan_periode_kejadian_nama"]):
        monitoring["triwulan_periode_kejadian_nama"] = quarter_names.get(
            monitoring.get("triwulan_periode_kejadian"), ""
        )
    
    # Add impact score text based on the score value if not already present
    if "skor_dampak" in monitoring and ("skor_dampak_text" not in monitoring or not monitoring["skor_dampak_text"]):
        # Try to get dampak name if dampak_id is present
        if "dampak_id" in monitoring and monitoring["dampak_id"]:
            try:
                dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(monitoring["dampak_id"])})
                if dampak:
                    monitoring["skor_dampak_text"] = f"{dampak['nama']} ({dampak['nilai']})"
                else:
                    monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
            except Exception:
                monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
        else:
            monitoring["skor_dampak_text"] = f"Skor Dampak: {monitoring.get('skor_dampak', 0)}"
    
    monitoring["id"] = str(monitoring["_id"])
    return MonitoringRisikoResponse(**monitoring) 