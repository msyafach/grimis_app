from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    JenisPenyebabCreate,
    JenisPenyebabUpdate,
    JenisPenyebabResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=JenisPenyebabResponse)
async def create_jenis_penyebab(
    penyebab: JenisPenyebabCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new cause type.

    Parameters:
    - kode (str): Unique code for the cause type
    - nama (str): Name of the cause
    - id_instansi (str): Institution ID
    - id_induk_unit_kerja (str): Parent work unit ID

    Notes:
    - SUPER_ADMIN can create with any parent work unit
    - ADMIN_KLP can only create with their assigned work unit
    - Code must be unique per institution
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can create cause types"
        )

    db = await Database.get_db()

    # Check if code already exists for this institution
    existing = await db.jenis_penyebab.find_one({
        "kode": penyebab.kode,
        "id_instansi": penyebab.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )

    # Get instansi to validate it exists
    instansi = await db.instansi.find_one({"_id": ObjectId(penyebab.id_instansi)})
    if not instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    penyebab_dict = penyebab.dict()
    penyebab_dict["created_at"] = datetime.utcnow()

    # Different logic for SUPER_ADMIN and ADMIN_KLP
    if current_user["role"] == UserRole.SUPER_ADMIN:
        # For SUPER_ADMIN, use selected induk unit kerja
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(penyebab.id_induk_unit_kerja),
            "id_instansi": penyebab.id_instansi
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found or doesn't belong to the institution"
            )
        penyebab_dict["nama_klp"] = induk_unit["nama_induk_unit"]
    else:
        # For ADMIN_KLP, check assignment and use their induk unit
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": penyebab.id_instansi}):
            # Check if user has permission for this specific unit
            has_permission = False
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    has_permission = True
                    break
            if has_permission:
                assigned_struktur = struktur
                break

        if not assigned_struktur:
            raise HTTPException(
                status_code=403,
                detail="User not assigned to any organizational structure in this institution"
            )

        # Override id_induk_unit_kerja with the one from structure
        penyebab_dict["id_induk_unit_kerja"] = str(assigned_struktur["id_induk_unit_kerja"])
        
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(assigned_struktur["id_induk_unit_kerja"])
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found"
            )
        penyebab_dict["nama_klp"] = induk_unit["nama_induk_unit"]

    result = await db.jenis_penyebab.insert_one(penyebab_dict)
    created = await db.jenis_penyebab.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])

    return JenisPenyebabResponse(**created)

@router.get("", response_model=List[JenisPenyebabResponse])
async def get_jenis_penyebab(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID to filter cause types"),
    search: Optional[str] = Query(None, description="Search by code, name, or KLP name"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of cause types for an institution and optionally filtered by parent work unit.

    Parameters:
    - id_instansi (str): Institution ID to filter cause types
    - id_induk_unit_kerja (str, optional): Parent work unit ID to filter cause types
    - search (str, optional): Search text to filter by code, name, or KLP name
    """
    # Allow listed roles only
    ALLOWED_ROLES = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEGAWAI,
        UserRole.PENGAWAS_INTERN,
        UserRole.UNIT_MANAJEMEN_RISIKO,
        UserRole.PENGELOLA_RISIKO
    ]

    if current_user["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only authorized roles can view cause types"
        )
        
    db = await Database.get_db()

    # Build query
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
        
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}},
            {"nama_klp": {"$regex": search, "$options": "i"}}
        ]

    # Get cause types
    penyebab_list = []
    async for penyebab in db.jenis_penyebab.find(query).sort("kode", 1):
        penyebab["id"] = str(penyebab["_id"])
        penyebab_list.append(JenisPenyebabResponse(**penyebab))

    return penyebab_list

@router.put("/{penyebab_id}", response_model=JenisPenyebabResponse)
async def update_jenis_penyebab(
    penyebab_id: str,
    penyebab: JenisPenyebabUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a cause type.

    Parameters:
    - penyebab_id (str): ID of cause type to update
    - nama (str, optional): New name for the cause

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can update cause types
    - Only the name can be updated
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update cause types"
        )

    db = await Database.get_db()
    
    existing = await db.jenis_penyebab.find_one({"_id": ObjectId(penyebab_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Cause type not found"
        )

    update_data = penyebab.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.jenis_penyebab.update_one(
        {"_id": ObjectId(penyebab_id)},
        {"$set": update_data}
    )

    updated = await db.jenis_penyebab.find_one({"_id": ObjectId(penyebab_id)})
    updated["id"] = penyebab_id

    return JenisPenyebabResponse(**updated)

@router.delete("/{penyebab_id}")
async def delete_jenis_penyebab(
    penyebab_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a cause type.

    Parameters:
    - penyebab_id (str): ID of cause type to delete

    Notes:
    - Only SUPER_ADMIN can delete cause types
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can delete cause types"
        )

    db = await Database.get_db()

    result = await db.jenis_penyebab.delete_one({"_id": ObjectId(penyebab_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Cause type not found"
        )

    return {"message": "Cause type deleted successfully"}

@router.get("/{penyebab_id}", response_model=JenisPenyebabResponse)
async def get_jenis_penyebab_by_id(
    penyebab_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific cause type by ID.
    """
    # Allow listed roles only
    ALLOWED_ROLES = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEGAWAI,
        UserRole.PENGAWAS_INTERN,
        UserRole.UNIT_MANAJEMEN_RISIKO,
        UserRole.PENGELOLA_RISIKO
    ]

    if current_user["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only authorized roles can view cause types"
        )
        
    db = await Database.get_db()
    
    penyebab = await db.jenis_penyebab.find_one({"_id": ObjectId(penyebab_id)})
    if not penyebab:
        raise HTTPException(status_code=404, detail="Jenis penyebab not found")
    
    # Get KLP name for this penyebab
    klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(penyebab["id_induk_unit_kerja"])})
    if klp:
        penyebab["nama_klp"] = klp.get("nama_induk_unit", "")
    
    penyebab["id"] = str(penyebab["_id"])
    return JenisPenyebabResponse(**penyebab) 