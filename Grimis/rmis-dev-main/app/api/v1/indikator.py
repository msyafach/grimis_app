from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    IndikatorCreate,
    IndikatorUpdate,
    IndikatorResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=IndikatorResponse)
async def create_indikator(
    indikator: IndikatorCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new indicator.

    Parameters:
    - kode (str): Unique code for the indicator
    - nama (str): Name of the indicator
    - id_konteks (str): Context ID (must be SASARAN type)
    - id_instansi (str): Institution ID

    Notes:
    - Only SASARAN contexts can have indicators
    - PROBIS contexts cannot have indicators
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can create indicators"
        )

    db = await Database.get_db()

    # Get konteks to validate
    konteks = await db.konteks.find_one({
        "_id": ObjectId(indikator.id_konteks),
        "id_instansi": indikator.id_instansi
    })
    if not konteks:
        raise HTTPException(status_code=404, detail="Context not found or doesn't belong to the institution")

    # Validate konteks is SASARAN type
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": konteks["id_instansi"],
        "jenis_konteks.id": konteks["id_jenis_konteks"]
    })
    if not struktur:
        raise HTTPException(status_code=404, detail="Context type not found")

    jenis_konteks = next(
        (jk for jk in struktur["jenis_konteks"] if jk["id"] == konteks["id_jenis_konteks"]),
        None
    )
    if not jenis_konteks or jenis_konteks["jenis"] != "SASARAN":
        raise HTTPException(
            status_code=400,
            detail="Indicators can only be added to SASARAN contexts"
        )

    # Check if code already exists for this context and institution
    existing = await db.indikator.find_one({
        "kode": indikator.kode,
        "id_konteks": indikator.id_konteks,
        "id_instansi": indikator.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this context"
        )

    # Validate user has access to this KLP
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": indikator.id_instansi}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or assigned_struktur["id_induk_unit_kerja"] != konteks["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only create indicators for your assigned KLP"
            )

    indikator_dict = indikator.dict()
    indikator_dict["created_at"] = datetime.utcnow()
    indikator_dict["nama_konteks"] = konteks["nama"]

    result = await db.indikator.insert_one(indikator_dict)
    created = await db.indikator.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))

    return IndikatorResponse(**created)

@router.get("", response_model=List[IndikatorResponse])
async def get_indikator(
    id_konteks: Optional[str] = Query(None, description="Context ID"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of indicators for a context.

    Parameters:
    - id_konteks (str, optional): Context ID to filter indicators
    - id_instansi (str): Institution ID to filter indicators
    - id_induk_unit_kerja (str, optional): Parent work unit ID to filter indicators
    - search (str, optional): Search text to filter by code or name
    """
    db = await Database.get_db()

    # Base query
    query = {
        "id_instansi": id_instansi
    }
    
    # Add context filter if provided
    if id_konteks:
        query["id_konteks"] = id_konteks
    # If filtering by parent work unit, we need to find all contexts with this id_induk_unit_kerja
    elif id_induk_unit_kerja:
        konteks_ids = []
        async for konteks in db.konteks.find({"id_induk_unit_kerja": id_induk_unit_kerja, "jenis_konteks": "SASARAN"}):
            konteks_ids.append(str(konteks["_id"]))
        
        if konteks_ids:
            query["id_konteks"] = {"$in": konteks_ids}
        else:
            # If no matching contexts, return empty list
            return []
    
    # Search functionality
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}}
        ]
    
    # Get indicators
    indicators = []
    async for indikator in db.indikator.find(query).sort("kode", 1):
        indikator["id"] = str(indikator["_id"])
        
        # Get context name
        konteks = await db.konteks.find_one({"_id": ObjectId(indikator["id_konteks"])})
        if konteks:
            indikator["nama_konteks"] = konteks["nama"]
        
        indicators.append(IndikatorResponse(**indikator))
    
    return indicators

@router.get("/{indikator_id}", response_model=IndikatorResponse)
async def get_indikator_by_id(
    indikator_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific indicator by ID.
    """
    db = await Database.get_db()
    
    indikator = await db.indikator.find_one({"_id": ObjectId(indikator_id)})
    if not indikator:
        raise HTTPException(status_code=404, detail="Indikator not found")
    
    # Get konteks name for this indikator
    konteks = await db.konteks.find_one({"_id": ObjectId(indikator["id_konteks"])})
    if konteks:
        indikator["nama_konteks"] = konteks.get("nama", "")
    
    indikator["id"] = str(indikator["_id"])
    return IndikatorResponse(**indikator)

@router.put("/{indikator_id}", response_model=IndikatorResponse)
async def update_indikator(
    indikator_id: str,
    indikator: IndikatorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an indicator.

    Parameters:
    - indikator_id (str): ID of indicator to update
    - nama (str, optional): New name for the indicator

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can update indicators
    - ADMIN_KLP can only update indicators for their assigned KLP
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update indicators"
        )

    db = await Database.get_db()
    
    existing = await db.indikator.find_one({"_id": ObjectId(indikator_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Indicator not found"
        )

    # Get konteks to validate access
    konteks = await db.konteks.find_one({"_id": ObjectId(existing["id_konteks"])})
    if not konteks:
        raise HTTPException(
            status_code=404,
            detail="Context not found"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": konteks["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update indicators for your assigned KLP"
            )

    update_data = indikator.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.indikator.update_one(
        {"_id": ObjectId(indikator_id)},
        {"$set": update_data}
    )

    updated = await db.indikator.find_one({"_id": ObjectId(indikator_id)})
    updated["id"] = indikator_id

    return IndikatorResponse(**updated)

@router.delete("/{indikator_id}")
async def delete_indikator(
    indikator_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an indicator.

    Parameters:
    - indikator_id (str): ID of indicator to delete

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can delete indicators
    - ADMIN_KLP can only delete indicators for their assigned KLP
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can delete indicators"
        )

    db = await Database.get_db()

    indikator = await db.indikator.find_one({"_id": ObjectId(indikator_id)})
    if not indikator:
        raise HTTPException(
            status_code=404,
            detail="Indicator not found"
        )

    # Get konteks to validate access
    konteks = await db.konteks.find_one({"_id": ObjectId(indikator["id_konteks"])})
    if not konteks:
        raise HTTPException(
            status_code=404,
            detail="Context not found"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": konteks["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete indicators for your assigned KLP"
            )

    result = await db.indikator.delete_one({"_id": ObjectId(indikator_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Indicator not found"
        )

    return {"message": "Indicator deleted successfully"} 