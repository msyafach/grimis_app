from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    KategoriRisikoCreate,
    KategoriRisikoUpdate,
    KategoriRisikoResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=KategoriRisikoResponse)
async def create_kategori_risiko(
    kategori: KategoriRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk category.

    Parameters:
    - kode (str): Unique code for the risk category
    - nama (str): Name of the risk category
    - id_instansi (str): Institution ID
    - id_induk_unit_kerja (str): Parent work unit ID

    Notes:
    - SUPER_ADMIN can create risk categories with KLP name from selected parent work unit
    - ADMIN_KLP can create risk categories only if assigned to structure
    - Code must be unique per institution
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can create risk categories"
        )

    db = await Database.get_db()

    # Check if code already exists for this institution
    existing = await db.kategori_risiko.find_one({
        "kode": kategori.kode,
        "id_instansi": kategori.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )

    # Get instansi to validate it exists
    instansi = await db.instansi.find_one({"_id": ObjectId(kategori.id_instansi)})
    if not instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    kategori_dict = kategori.dict()
    kategori_dict["created_at"] = datetime.utcnow()

    # Different logic for SUPER_ADMIN and ADMIN_KLP
    if current_user["role"] == UserRole.SUPER_ADMIN:
        # For SUPER_ADMIN, use selected induk unit kerja
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(kategori.id_induk_unit_kerja),
            "id_instansi": kategori.id_instansi
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found or doesn't belong to the institution"
            )
        kategori_dict["nama_klp"] = induk_unit["nama_induk_unit"]
    else:
        # For ADMIN_KLP, check assignment and use their induk unit
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": kategori.id_instansi}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur:
            raise HTTPException(
                status_code=403,
                detail="User not assigned to any organizational structure in this institution"
            )

        # Override id_induk_unit_kerja with the one from structure
        kategori_dict["id_induk_unit_kerja"] = str(assigned_struktur["id_induk_unit_kerja"])
        
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(assigned_struktur["id_induk_unit_kerja"])
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found"
            )
        kategori_dict["nama_klp"] = induk_unit["nama_induk_unit"]

    result = await db.kategori_risiko.insert_one(kategori_dict)
    created = await db.kategori_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))

    return KategoriRisikoResponse(**created)

@router.get("", response_model=List[KategoriRisikoResponse])
async def get_kategori_risiko(
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID to filter risk categories"),
    search: Optional[str] = Query(None, description="Search by code, name, or KLP name"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk categories for an institution and optionally filtered by parent work unit.

    Parameters:
    - id_instansi (str): Institution ID to filter categories
    - id_induk_unit_kerja (str, optional): Parent work unit ID to filter categories
    - search (str, optional): Search text to filter categories by code, name, or KLP name

    Returns:
    List of categories with:
    - id (str): Category ID
    - kode (str): Category code
    - nama (str): Category name
    - nama_klp (str): KLP name from organizational structure
    - created_at (datetime): Creation timestamp
    - updated_at (datetime, optional): Last update timestamp
    """
    # Allow listed roles only
    ALLOWED_ROLES = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEGAWAI,
        UserRole.PENGAWAS_INTERN,
        UserRole.UNIT_MANAJEMEN_RISIKO,
        UserRole.PEMILIK_RISIKO,
        UserRole.PENGELOLA_RISIKO
    ]

    if current_user["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only authorized roles can view risk categories"
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

    # Get categories
    categories = []
    async for kategori in db.kategori_risiko.find(query).sort("kode", 1):
        kategori["id"] = str(kategori["_id"])
        categories.append(KategoriRisikoResponse(**kategori))

    return categories

@router.get("/{kategori_id}", response_model=KategoriRisikoResponse)
async def get_kategori_risiko_by_id(
    kategori_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk category by ID.
    """
    # Allow listed roles only
    ALLOWED_ROLES = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEGAWAI,
        UserRole.PENGAWAS_INTERN,
        UserRole.UNIT_MANAJEMEN_RISIKO,
        UserRole.PEMILIK_RISIKO,
        UserRole.PENGELOLA_RISIKO
    ]

    if current_user["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only authorized roles can view risk categories"
        )
        
    db = await Database.get_db()
    
    kategori = await db.kategori_risiko.find_one({"_id": ObjectId(kategori_id)})
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori risiko not found")
    
    # Get KLP name for this kategori
    klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(kategori["id_induk_unit_kerja"])})
    if klp:
        kategori["nama_klp"] = klp.get("nama_induk_unit", "")
    
    kategori["id"] = str(kategori["_id"])
    return KategoriRisikoResponse(**kategori)

@router.put("/{kategori_id}", response_model=KategoriRisikoResponse)
async def update_kategori_risiko(
    kategori_id: str,
    kategori: KategoriRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk category.

    Parameters:
    - kategori_id (str): ID of category to update

    Notes:
    - Only SUPER_ADMIN can update categories
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update risk categories"
        )

    db = await Database.get_db()
    
    existing = await db.kategori_risiko.find_one({"_id": ObjectId(kategori_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk category not found"
        )

    # Update all fields that are set in the request
    update_data = kategori.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.kategori_risiko.update_one(
        {"_id": ObjectId(kategori_id)},
        {"$set": update_data}
    )

    updated = await db.kategori_risiko.find_one({"_id": ObjectId(kategori_id)})
    updated["id"] = kategori_id

    return KategoriRisikoResponse(**updated)

@router.delete("/{kategori_id}")
async def delete_kategori_risiko(
    kategori_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk category.

    Parameters:
    - kategori_id (str): ID of category to delete

    Notes:
    - SUPER_ADMIN can delete any category
    - ADMIN_KLP can only delete categories from their assigned organizational structure
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can delete risk categories"
        )

    db = await Database.get_db()

    # If ADMIN_KLP, verify they can delete this category
    if current_user["role"] == UserRole.ADMIN_KLP:
        kategori = await db.kategori_risiko.find_one({"_id": ObjectId(kategori_id)})
        if not kategori:
            raise HTTPException(
                status_code=404,
                detail="Risk category not found"
            )

        # Check if user is assigned to the struktur organisasi
        has_access = False
        async for struktur in db.struktur_organisasi.find({"id_instansi": kategori["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    has_access = True
                    break
            if has_access:
                break

        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this risk category"
            )

    result = await db.kategori_risiko.delete_one({"_id": ObjectId(kategori_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk category not found"
        )

    return {"message": "Risk category deleted successfully"} 