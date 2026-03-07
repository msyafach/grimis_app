from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    MetodeSpipCreate,
    MetodeSpipUpdate,
    MetodeSpipResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[MetodeSpipResponse])
async def get_metode_spip(
    id_instansi: str = Query(..., description="Institution ID"),
    tahun: int = Query(..., description="Year of SPIP method"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of SPIP methods.
    
    Parameters:
    - id_instansi: Institution ID (required)
    - tahun: Year of SPIP method (required)
    - id_induk_unit_kerja: Parent work unit ID (optional)
    - search: Optional search term to filter by code, name or description
    """
    db = await Database.get_db()

    # Base query
    query = {
        "id_instansi": id_instansi,
        "tahun": tahun
    }
    
    # Add parent work unit filter if provided
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Search functionality
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}},
            {"deskripsi": {"$regex": search, "$options": "i"}}
        ]
    
    # Get methods
    methods = []
    async for metode in db.metode_spip.find(query).sort("kode", 1):
        metode["id"] = str(metode["_id"])
        
        # Get KLP name
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(metode["id_induk_unit_kerja"])})
        if induk_unit:
            metode["nama_klp"] = induk_unit["nama_induk_unit"]
        
        methods.append(MetodeSpipResponse(**metode))
    
    return methods

@router.post("", response_model=MetodeSpipResponse)
async def create_metode_spip(
    metode: MetodeSpipCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new SPIP method.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    # Validate unique code
    if await db.metode_spip.find_one({
        "id_instansi": metode.id_instansi,
        "kode": metode.kode
    }):
        raise HTTPException(status_code=400, detail="Code already exists")
    
    # Validate induk unit kerja
    if not await db.induk_unit_kerja.find_one({
        "_id": ObjectId(metode.id_induk_unit_kerja),
        "id_instansi": metode.id_instansi
    }):
        raise HTTPException(
            status_code=404,
            detail="Parent work unit not found or doesn't belong to the institution"
        )
    
    metode_dict = metode.dict()
    metode_dict["created_at"] = datetime.utcnow()
    
    result = await db.metode_spip.insert_one(metode_dict)
    created = await db.metode_spip.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))  # Convert _id to string and remove _id field
    
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(created["id_induk_unit_kerja"])})
    created["nama_klp"] = induk_unit["nama_induk_unit"]
    
    return MetodeSpipResponse(**created)

@router.put("/{metode_id}", response_model=MetodeSpipResponse)
async def update_metode_spip(
    metode_id: str,
    metode: MetodeSpipUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a SPIP method.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    existing = await db.metode_spip.find_one({"_id": ObjectId(metode_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="SPIP method not found")
    
    update_data = metode.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.metode_spip.update_one(
        {"_id": ObjectId(metode_id)},
        {"$set": update_data}
    )
    
    updated = await db.metode_spip.find_one({"_id": ObjectId(metode_id)})
    updated["id"] = str(updated["_id"])
    
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated["id_induk_unit_kerja"])})
    updated["nama_klp"] = induk_unit["nama_induk_unit"]
    
    return MetodeSpipResponse(**updated)

@router.delete("/{metode_id}", status_code=204)
async def delete_metode_spip(
    metode_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a SPIP method.
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can delete SPIP methods")
    
    db = await Database.get_db()
    
    result = await db.metode_spip.delete_one({"_id": ObjectId(metode_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SPIP method not found")

@router.get("/{metode_id}", response_model=MetodeSpipResponse)
async def get_metode_spip_by_id(
    metode_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific SPIP method by ID.
    """
    db = await Database.get_db()
    
    metode = await db.metode_spip.find_one({"_id": ObjectId(metode_id)})
    if not metode:
        raise HTTPException(status_code=404, detail="Metode SPIP not found")
    
    # Get induk unit kerja name
    klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(metode["id_induk_unit_kerja"])})
    if klp:
        metode["nama_klp"] = klp.get("nama_induk_unit", "")
    
    metode["id"] = str(metode["_id"])
    return MetodeSpipResponse(**metode) 