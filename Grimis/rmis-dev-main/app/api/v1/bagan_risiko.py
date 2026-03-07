from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    BaganRisikoCreate,
    BaganRisikoUpdate,
    BaganRisikoResponse
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[BaganRisikoResponse])
async def get_bagan_risiko(
    id_instansi: str = Query(..., description="Institution ID"),
    tahun: int = Query(..., description="Year of risk chart"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk charts.
    
    This endpoint retrieves all risk charts for a specific institution and year.
    You can also filter the results using the search parameter.
    
    Parameters:
    - id_instansi: Institution ID (required)
    - tahun: Year of risk chart (required)
    - id_induk_unit_kerja: Parent work unit ID (optional)
    - search: Optional search term to filter by code, name or description
    
    Returns:
    - A list of risk charts matching the criteria
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
    
    # Get charts
    charts = []
    async for bagan in db.bagan_risiko.find(query).sort("kode", 1):
        bagan["id"] = str(bagan["_id"])
        
        # Get KLP name
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(bagan["id_induk_unit_kerja"])})
        if induk_unit:
            bagan["nama_klp"] = induk_unit["nama_induk_unit"]
        
        charts.append(BaganRisikoResponse(**bagan))
    
    return charts

@router.post("", response_model=BaganRisikoResponse)
async def create_bagan_risiko(
    bagan: BaganRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk chart.
    
    Use this endpoint to create a new risk chart for a specific year and institution.
    
    Required fields:
    - kode: Unique code for the risk chart
    - nama: Name of the risk chart
    - tahun: Year of the risk chart
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Parent work unit ID
    
    Optional fields:
    - deskripsi: Description of the risk chart
    
    Example request body:
    ```json
    {
      "kode": "CHART-2024",
      "nama": "Risk Chart 2024",
      "deskripsi": "Risk chart for 2024 fiscal year",
      "tahun": 2024,
      "id_instansi": "6815e75b1fd00bdf13d930a5",
      "id_induk_unit_kerja": "6815e75b1fd00bdf13d930a6"
    }
    ```
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    # Validate unique code
    if await db.bagan_risiko.find_one({
        "id_instansi": bagan.id_instansi,
        "kode": bagan.kode
    }):
        raise HTTPException(status_code=400, detail="Code already exists")
    
    # Validate induk unit kerja
    if not await db.induk_unit_kerja.find_one({
        "_id": ObjectId(bagan.id_induk_unit_kerja),
        "id_instansi": bagan.id_instansi
    }):
        raise HTTPException(
            status_code=404,
            detail="Parent work unit not found or doesn't belong to the institution"
        )
    
    bagan_dict = bagan.dict()
    bagan_dict["created_at"] = datetime.utcnow()
    
    result = await db.bagan_risiko.insert_one(bagan_dict)
    created = await db.bagan_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))  # Convert _id to string and remove _id field
    
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(created["id_induk_unit_kerja"])})
    created["nama_klp"] = induk_unit["nama_induk_unit"]
    
    return BaganRisikoResponse(**created)

@router.put("/{bagan_id}", response_model=BaganRisikoResponse)
async def update_bagan_risiko(
    bagan_id: str,
    bagan: BaganRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk chart.
    
    Use this endpoint to modify the properties of an existing risk chart.
    
    You can update any of the following fields:
    - nama: New name for the risk chart
    - deskripsi: New description for the risk chart
    - tahun: New year for the risk chart
    
    Example request body:
    ```json
    {
      "nama": "Updated Risk Chart Name",
      "deskripsi": "Updated risk chart description",
      "tahun": 2025
    }
    ```
    
    Or update just the year:
    ```json
    {
      "tahun": 2025
    }
    ```
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    existing = await db.bagan_risiko.find_one({"_id": ObjectId(bagan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Risk chart not found")
    
    update_data = bagan.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.bagan_risiko.update_one(
        {"_id": ObjectId(bagan_id)},
        {"$set": update_data}
    )
    
    updated = await db.bagan_risiko.find_one({"_id": ObjectId(bagan_id)})
    updated["id"] = str(updated["_id"])
    
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated["id_induk_unit_kerja"])})
    updated["nama_klp"] = induk_unit["nama_induk_unit"]
    
    return BaganRisikoResponse(**updated)

@router.delete("/{bagan_id}", status_code=204)
async def delete_bagan_risiko(
    bagan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk chart.
    
    This endpoint permanently removes a risk chart from the database.
    Only SUPER_ADMIN users can delete risk charts.
    
    Parameters:
    - bagan_id: ID of the risk chart to delete
    
    Returns:
    - 204 No Content on successful deletion
    - 404 Not Found if the risk chart doesn't exist
    - 403 Forbidden if the user doesn't have permission
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can delete risk charts")
    
    db = await Database.get_db()
    
    result = await db.bagan_risiko.delete_one({"_id": ObjectId(bagan_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Risk chart not found")

@router.get("/{bagan_id}", response_model=BaganRisikoResponse)
async def get_bagan_risiko_by_id(
    bagan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk chart by ID.
    
    This endpoint retrieves the details of a single risk chart by its ID.
    
    Parameters:
    - bagan_id: ID of the risk chart to retrieve
    
    Returns:
    - Complete details of the requested risk chart
    - 404 Not Found if the risk chart doesn't exist
    """
    db = await Database.get_db()
    
    bagan = await db.bagan_risiko.find_one({"_id": ObjectId(bagan_id)})
    if not bagan:
        raise HTTPException(status_code=404, detail="Bagan risiko not found")
    
    # Get induk unit kerja name
    klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(bagan["id_induk_unit_kerja"])})
    if klp:
        bagan["nama_klp"] = klp.get("nama_induk_unit", "")
    
    bagan["id"] = str(bagan["_id"])
    return BaganRisikoResponse(**bagan) 