from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    JenisKonteksCreate,
    JenisKonteksUpdate,
    JenisKonteksResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=JenisKonteksResponse)
async def create_jenis_konteks(
    konteks: JenisKonteksCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new context type.

    Parameters:
    - kode (str): Unique code for the context type
    - nama (str): Name of the context
    - jenis (str): Type of context (SASARAN/PROBIS)
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
            detail="Only SUPER_ADMIN and ADMIN_KLP can create context types"
        )

    db = await Database.get_db()

    # Check if code already exists for this institution
    existing = await db.jenis_konteks.find_one({
        "kode": konteks.kode,
        "id_instansi": konteks.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )

    # Get instansi to validate it exists
    instansi = await db.instansi.find_one({"_id": ObjectId(konteks.id_instansi)})
    if not instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    konteks_dict = konteks.dict()
    konteks_dict["created_at"] = datetime.utcnow()

    # Different logic for SUPER_ADMIN and ADMIN_KLP
    if current_user["role"] == UserRole.SUPER_ADMIN:
        # For SUPER_ADMIN, use selected induk unit kerja
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(konteks.id_induk_unit_kerja),
            "id_instansi": konteks.id_instansi
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found or doesn't belong to the institution"
            )
        konteks_dict["nama_klp"] = induk_unit["nama_induk_unit"]
    else:
        # For ADMIN_KLP, check assignment and use their induk unit
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": konteks.id_instansi}):
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
        konteks_dict["id_induk_unit_kerja"] = str(assigned_struktur["id_induk_unit_kerja"])
        
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(assigned_struktur["id_induk_unit_kerja"])
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found"
            )
        konteks_dict["nama_klp"] = induk_unit["nama_induk_unit"]

    result = await db.jenis_konteks.insert_one(konteks_dict)
    created = await db.jenis_konteks.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])

    return JenisKonteksResponse(**created)

@router.get("", response_model=List[JenisKonteksResponse])
async def get_jenis_konteks(
    id_instansi: str,
    search: Optional[str] = Query(None, description="Search by code or name"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of context types for an institution.

    Parameters:
    - id_instansi (str): Institution ID to filter context types
    - search (str, optional): Search text to filter by code or name
    """
    # Check user role - only allow SUPER_ADMIN, ADMIN_KLP, and PEGAWAI
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, and PEGAWAI can view context types"
        )
        
    db = await Database.get_db()

    # Build query
    query = {"id_instansi": id_instansi}
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}}
        ]

    # Get context types
    konteks_list = []
    async for konteks in db.jenis_konteks.find(query).sort("kode", 1):
        konteks["id"] = str(konteks["_id"])
        konteks_list.append(JenisKonteksResponse(**konteks))

    return konteks_list

@router.put("/{konteks_id}", response_model=JenisKonteksResponse)
async def update_jenis_konteks(
    konteks_id: str,
    konteks: JenisKonteksUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a context type.

    Parameters:
    - konteks_id (str): ID of context type to update
    - nama (str, optional): New name for the context
    - jenis (str, optional): New type (SASARAN/PROBIS)

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can update context types
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update context types"
        )

    db = await Database.get_db()
    
    existing = await db.jenis_konteks.find_one({"_id": ObjectId(konteks_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Context type not found"
        )

    update_data = konteks.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.jenis_konteks.update_one(
        {"_id": ObjectId(konteks_id)},
        {"$set": update_data}
    )

    updated = await db.jenis_konteks.find_one({"_id": ObjectId(konteks_id)})
    updated["id"] = konteks_id

    return JenisKonteksResponse(**updated)

@router.delete("/{konteks_id}")
async def delete_jenis_konteks(
    konteks_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a context type.

    Parameters:
    - konteks_id (str): ID of context type to delete

    Notes:
    - Only SUPER_ADMIN can delete context types
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete context types"
        )

    db = await Database.get_db()

    result = await db.jenis_konteks.delete_one({"_id": ObjectId(konteks_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Context type not found"
        )

    return {"message": "Context type deleted successfully"} 