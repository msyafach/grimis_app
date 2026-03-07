from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    KriteriaKemungkinanCreate,
    KriteriaKemungkinanUpdate,
    KriteriaKemungkinanResponse,
    KriteriaDampakCreate,
    KriteriaDampakUpdate,
    KriteriaDampakResponse,
    AllKriteriaResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

# Helper function to fetch data from peta risiko klasifikasi
async def get_klasifikasi_data(db, template_id, jenis):
    """
    Get klasifikasi data from peta risiko based on template_id and type
    """
    klasifikasi_list = []
    async for klasifikasi in db.peta_risiko_klasifikasi.find({"template_id": template_id, "jenis": jenis}).sort("key", 1):
        klasifikasi_list.append(klasifikasi)
    return klasifikasi_list

# Helper function to sync klasifikasi with kriteria
async def sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, jenis):
    """
    Sync klasifikasi data to kriteria kemungkinan/dampak
    jenis is either "FREKUENSI" (for kemungkinan) or "DAMPAK"
    """
    collection = "kriteria_kemungkinan" if jenis == "FREKUENSI" else "kriteria_dampak"
    
    # Clear existing kriteria for this institution/unit
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
        
    await db[collection].delete_many(query)
    
    # Insert new kriteria based on klasifikasi
    for item in klasifikasi_data:
        kriteria = {
            "kode": str(item["key"]),
            "nama": item["value"],
            "nilai": float(item["key"]),
            "deskripsi": item["value"],
            "id_instansi": id_instansi,
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "created_at": datetime.utcnow()
        }
        await db[collection].insert_one(kriteria)

# Kriteria Kemungkinan endpoints
@router.get("/kemungkinan", response_model=List[KriteriaKemungkinanResponse])
async def get_kriteria_kemungkinan(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    template_id: Optional[str] = None,
    sync: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of kriteria kemungkinan.
    If template_id is provided and sync is True, synchronize with klasifikasi frekuensi.
    """
    db = await Database.get_db()
    
    # Sync with klasifikasi if requested
    if template_id and sync:
        klasifikasi_data = await get_klasifikasi_data(db, template_id, "FREKUENSI")
        await sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, "FREKUENSI")
    
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    kriteria_list = []
    async for kriteria in db.kriteria_kemungkinan.find(query).sort("nilai", 1):
        kriteria["id"] = str(kriteria["_id"])
        kriteria_list.append(KriteriaKemungkinanResponse(**kriteria))
    
    return kriteria_list

@router.post("/kemungkinan", response_model=KriteriaKemungkinanResponse)
async def create_kriteria_kemungkinan(
    kriteria: KriteriaKemungkinanCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new kriteria kemungkinan.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can create kriteria kemungkinan"
        )
    
    db = await Database.get_db()
    
    kriteria_dict = kriteria.dict()
    kriteria_dict["created_at"] = datetime.utcnow()
    kriteria_dict["created_by"] = str(current_user["id"])
    
    result = await db.kriteria_kemungkinan.insert_one(kriteria_dict)
    created = await db.kriteria_kemungkinan.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])

    
    return KriteriaKemungkinanResponse(**created)

@router.put("/kemungkinan/{kriteria_id}", response_model=KriteriaKemungkinanResponse)
async def update_kriteria_kemungkinan(
    kriteria_id: str,
    kriteria: KriteriaKemungkinanUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a kriteria kemungkinan.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or A can update kriteria kemungkinan"
        )
    
    db = await Database.get_db()
    
    existing = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kriteria_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Kriteria kemungkinan not found"
        )
    
    update_data = kriteria.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["id"])
    
    await db.kriteria_kemungkinan.update_one(
        {"_id": ObjectId(kriteria_id)},
        {"$set": update_data}
    )
    
    updated = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kriteria_id)})
    updated["id"] = kriteria_id
    
    return KriteriaKemungkinanResponse(**updated)

@router.delete("/kemungkinan/{kriteria_id}")
async def delete_kriteria_kemungkinan(
    kriteria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a kriteria kemungkinan.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can delete kriteria kemungkinan"
        )
    
    db = await Database.get_db()
    
    result = await db.kriteria_kemungkinan.delete_one({"_id": ObjectId(kriteria_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Kriteria kemungkinan not found"
        )
    
    return {"message": "Kriteria kemungkinan deleted successfully"}

@router.get("/kemungkinan/{kriteria_id}", response_model=KriteriaKemungkinanResponse)
async def get_kriteria_kemungkinan_by_id(
    kriteria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific probability criteria by ID.
    """
    db = await Database.get_db()
    
    kriteria = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kriteria_id)})
    if not kriteria:
        raise HTTPException(status_code=404, detail="Kriteria kemungkinan not found")
    
    kriteria["id"] = str(kriteria["_id"])
    return KriteriaKemungkinanResponse(**kriteria)

# Kriteria Dampak endpoints
@router.get("/dampak", response_model=List[KriteriaDampakResponse])
async def get_kriteria_dampak(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    template_id: Optional[str] = None,
    sync: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of kriteria dampak.
    If template_id is provided and sync is True, synchronize with klasifikasi dampak.
    """
    db = await Database.get_db()
    
    # Sync with klasifikasi if requested
    if template_id and sync:
        klasifikasi_data = await get_klasifikasi_data(db, template_id, "DAMPAK")
        await sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, "DAMPAK")
    
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    kriteria_list = []
    async for kriteria in db.kriteria_dampak.find(query).sort("nilai", 1):
        kriteria["id"] = str(kriteria["_id"])
        kriteria_list.append(KriteriaDampakResponse(**kriteria))
    
    return kriteria_list

@router.post("/dampak", response_model=KriteriaDampakResponse)
async def create_kriteria_dampak(
    kriteria: KriteriaDampakCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new kriteria dampak.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can create kriteria dampak"
        )
    
    db = await Database.get_db()
    
    kriteria_dict = kriteria.dict()
    kriteria_dict["created_at"] = datetime.utcnow()
    kriteria_dict["created_by"] = str(current_user["id"])
    
    result = await db.kriteria_dampak.insert_one(kriteria_dict)
    created = await db.kriteria_dampak.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])
    
    return KriteriaDampakResponse(**created)

@router.put("/dampak/{kriteria_id}", response_model=KriteriaDampakResponse)
async def update_kriteria_dampak(
    kriteria_id: str,
    kriteria: KriteriaDampakUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a kriteria dampak.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can update kriteria dampak"
        )
    
    db = await Database.get_db()
    
    existing = await db.kriteria_dampak.find_one({"_id": ObjectId(kriteria_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Kriteria dampak not found"
        )
    
    update_data = kriteria.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["id"])
    
    await db.kriteria_dampak.update_one(
        {"_id": ObjectId(kriteria_id)},
        {"$set": update_data}
    )
    
    updated = await db.kriteria_dampak.find_one({"_id": ObjectId(kriteria_id)})
    updated["id"] = kriteria_id
    
    return KriteriaDampakResponse(**updated)

@router.delete("/dampak/{kriteria_id}")
async def delete_kriteria_dampak(
    kriteria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a kriteria dampak.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can delete kriteria dampak"
        )
    
    db = await Database.get_db()
    
    result = await db.kriteria_dampak.delete_one({"_id": ObjectId(kriteria_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Kriteria dampak not found"
        )
    
    return {"message": "Kriteria dampak deleted successfully"}

@router.get("/dampak/{kriteria_id}", response_model=KriteriaDampakResponse)
async def get_kriteria_dampak_by_id(
    kriteria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific impact criteria by ID.
    """
    db = await Database.get_db()
    
    kriteria = await db.kriteria_dampak.find_one({"_id": ObjectId(kriteria_id)})
    if not kriteria:
        raise HTTPException(status_code=404, detail="Kriteria dampak not found")
    
    kriteria["id"] = str(kriteria["_id"])
    return KriteriaDampakResponse(**kriteria)

# Endpoint untuk sinkronisasi kriteria dari peta risiko
@router.post("/sync-from-template", status_code=200)
async def sync_kriteria_from_peta_risiko(
    id_instansi: str,
    id_induk_unit_kerja: str,
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Synchronize kriteria kemungkinan and kriteria dampak from peta risiko template.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can sync kriteria"
        )
    
    db = await Database.get_db()
    
    # Get klasifikasi data
    klasifikasi_frekuensi = await get_klasifikasi_data(db, template_id, "FREKUENSI")
    klasifikasi_dampak = await get_klasifikasi_data(db, template_id, "DAMPAK")
    
    # Sync to kriteria
    await sync_klasifikasi_to_kriteria(db, klasifikasi_frekuensi, id_instansi, id_induk_unit_kerja, "FREKUENSI")
    await sync_klasifikasi_to_kriteria(db, klasifikasi_dampak, id_instansi, id_induk_unit_kerja, "DAMPAK")
    
    return {"message": "Kriteria kemungkinan and kriteria dampak synchronized successfully"}

@router.get("/all", response_model=AllKriteriaResponse)
async def get_all_kriteria(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    template_id: Optional[str] = None,
    sync: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all kriteria (both kemungkinan and dampak).
    If template_id is provided and sync is True, synchronize with klasifikasi.
    """
    db = await Database.get_db()
    
    # Sync with klasifikasi if requested
    if template_id and sync:
        klasifikasi_frekuensi = await get_klasifikasi_data(db, template_id, "FREKUENSI")
        klasifikasi_dampak = await get_klasifikasi_data(db, template_id, "DAMPAK")
        
        await sync_klasifikasi_to_kriteria(db, klasifikasi_frekuensi, id_instansi, id_induk_unit_kerja, "FREKUENSI")
        await sync_klasifikasi_to_kriteria(db, klasifikasi_dampak, id_instansi, id_induk_unit_kerja, "DAMPAK")
    
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Get kemungkinan
    kemungkinan = []
    async for kriteria in db.kriteria_kemungkinan.find(query).sort("nilai", 1):
        kriteria["id"] = str(kriteria["_id"])
        kemungkinan.append(KriteriaKemungkinanResponse(**kriteria))
    
    # Get dampak
    dampak = []
    async for kriteria in db.kriteria_dampak.find(query).sort("nilai", 1):
        kriteria["id"] = str(kriteria["_id"])
        dampak.append(KriteriaDampakResponse(**kriteria))
    
    return AllKriteriaResponse(
        kemungkinan=kemungkinan,
        dampak=dampak,
        total_kemungkinan=len(kemungkinan),
        total_dampak=len(dampak)
    ) 