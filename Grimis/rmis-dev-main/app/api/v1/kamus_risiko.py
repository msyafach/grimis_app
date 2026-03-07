from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    KamusRisikoCreate,
    KamusRisikoUpdate,
    KamusRisikoResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=KamusRisikoResponse)
async def create_kamus_risiko(
    risiko: KamusRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk dictionary entry.

    Parameters:
    - kode (str): Unique code for the risk
    - nama (str): Name of the risk
    - id_kategori_risiko (str): Risk category ID
    - id_instansi (str): Institution ID
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can create risk dictionary entries"
        )

    db = await Database.get_db()

    # Check if code already exists for this institution
    existing = await db.kamus_risiko.find_one({
        "kode": risiko.kode,
        "id_instansi": risiko.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )

    # Get kategori risiko to validate and get data
    kategori = await db.kategori_risiko.find_one({
        "_id": ObjectId(risiko.id_kategori_risiko)
    })
    if not kategori:
        raise HTTPException(
            status_code=404,
            detail="Risk category not found"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": risiko.id_instansi}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != kategori["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only create risks for your assigned KLP"
            )

    risiko_dict = risiko.dict()
    risiko_dict["created_at"] = datetime.utcnow()
    risiko_dict["nama_klp"] = kategori["nama_klp"]
    risiko_dict["nama_kategori"] = kategori["nama"]

    result = await db.kamus_risiko.insert_one(risiko_dict)
    created = await db.kamus_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])

    return KamusRisikoResponse(**created)

@router.get("", response_model=List[KamusRisikoResponse])
async def get_kamus_risiko(
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID to filter risks"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk dictionary entries.

    Parameters:
    - id_instansi (str): Institution ID to filter risks
    - id_induk_unit_kerja (str, optional): Parent work unit ID to filter risks
    - search (str, optional): Search text to filter by code or name
    """
    db = await Database.get_db()

    # Base query
    query = {"id_instansi": id_instansi}
    
    # Add parent work unit filter if provided
    if id_induk_unit_kerja:
        # We need to find kategori_risiko entries with this id_induk_unit_kerja first
        kategori_ids = []
        async for kategori in db.kategori_risiko.find({"id_induk_unit_kerja": id_induk_unit_kerja}):
            kategori_ids.append(str(kategori["_id"]))
        
        if kategori_ids:
            query["id_kategori_risiko"] = {"$in": kategori_ids}
        else:
            # If no matching categories, return empty list
            return []
    
    # Search functionality
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}}
        ]
    
    # Get risks
    risks = []
    async for risk in db.kamus_risiko.find(query).sort("kode", 1):
        risk["id"] = str(risk["_id"])
        
        # Get category name
        kategori = await db.kategori_risiko.find_one({"_id": ObjectId(risk["id_kategori_risiko"])})
        if kategori:
            risk["nama_kategori"] = kategori["nama"]
        
        risks.append(KamusRisikoResponse(**risk))
    
    return risks

@router.get("/{risiko_id}", response_model=KamusRisikoResponse)
async def get_kamus_risiko_by_id(
    risiko_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk dictionary entry by ID.
    """
    db = await Database.get_db()
    
    risiko = await db.kamus_risiko.find_one({"_id": ObjectId(risiko_id)})
    if not risiko:
        raise HTTPException(status_code=404, detail="Kamus risiko not found")
    
    # Get kategori details
    kategori = await db.kategori_risiko.find_one({"_id": ObjectId(risiko["id_kategori_risiko"])})
    if kategori:
        risiko["nama_kategori"] = kategori.get("nama", "")
        
        # Get KLP name
        klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(kategori.get("id_induk_unit_kerja", ""))})
        if klp:
            risiko["nama_klp"] = klp.get("nama_induk_unit", "")
    
    risiko["id"] = str(risiko["_id"])
    return KamusRisikoResponse(**risiko)

@router.put("/{risiko_id}", response_model=KamusRisikoResponse)
async def update_kamus_risiko(
    risiko_id: str,
    risiko: KamusRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk dictionary entry.

    Parameters:
    - risiko_id (str): ID of risk to update
    - nama (str, optional): New name for the risk
    - id_kategori_risiko (str, optional): New risk category ID
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update risks"
        )

    db = await Database.get_db()
    
    existing = await db.kamus_risiko.find_one({"_id": ObjectId(risiko_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    update_data = risiko.dict(exclude_unset=True)

    # If changing kategori_risiko
    if risiko.id_kategori_risiko:
        kategori = await db.kategori_risiko.find_one({
            "_id": ObjectId(risiko.id_kategori_risiko)
        })
        if not kategori:
            raise HTTPException(
                status_code=404,
                detail="Risk category not found"
            )
        update_data["nama_klp"] = kategori["nama_klp"]
        update_data["nama_kategori"] = kategori["nama"]

    update_data["updated_at"] = datetime.utcnow()

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        # Only check category permissions if updating the category
        if risiko.id_kategori_risiko:
            kategori_id = risiko.id_kategori_risiko
            kategori = await db.kategori_risiko.find_one({"_id": ObjectId(kategori_id)})
            
            if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != kategori["id_induk_unit_kerja"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only update risks for your assigned KLP"
                )
        else:
            # If not updating category, check against existing category
            kategori = await db.kategori_risiko.find_one({"_id": ObjectId(existing["id_kategori_risiko"])})
            
            if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != kategori["id_induk_unit_kerja"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only update risks for your assigned KLP"
                )

    await db.kamus_risiko.update_one(
        {"_id": ObjectId(risiko_id)},
        {"$set": update_data}
    )

    updated = await db.kamus_risiko.find_one({"_id": ObjectId(risiko_id)})
    updated["id"] = risiko_id

    return KamusRisikoResponse(**updated)

@router.delete("/{risiko_id}")
async def delete_kamus_risiko(
    risiko_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk dictionary entry.

    Parameters:
    - risiko_id (str): ID of risk to delete

    Notes:
    - Only SUPER_ADMIN can delete risks from dictionary
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete risks from dictionary"
        )

    db = await Database.get_db()

    risiko = await db.kamus_risiko.find_one({"_id": ObjectId(risiko_id)})
    if not risiko:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    result = await db.kamus_risiko.delete_one({"_id": ObjectId(risiko_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    return {"message": "Risk deleted successfully"} 