from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.organization import (StrukturOrganisasiCreate, StrukturOrganisasiUpdate, StrukturOrganisasiResponse, AssignUserRequest, UserInStruktur, JenisKonteksInStruktur)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

@router.post("", response_model=StrukturOrganisasiResponse)
async def create_struktur_organisasi(
    struktur: StrukturOrganisasiCreate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new organizational structure.

    Parameters:
    - kode (str): Unique code for the structure
    - kode_induk (str, optional): Parent organization's unique code
    - nama (str): Name of the structure
    - nama_pendek (str): Short name/abbreviation
    - selera_risiko (int): Risk appetite level (1-5)
    - provinsi (str): Province
    - pimpinan (str, optional): Leader name
    - jabatan_pimpinan (str, optional): Leader position
    - kota (str, optional): City
    - id_induk_unit_kerja (str): Parent work unit ID
    - id_instansi (str): Institution ID
    - jenis_konteks (List[JenisKonteksInStruktur]): List of context types
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    # Validate instansi exists
    instansi = await db.instansi.find_one({"_id": ObjectId(struktur.id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Validate induk unit kerja exists and belongs to instansi
    parent_induk_unit = await db.induk_unit_kerja.find_one({
        "_id": ObjectId(struktur.id_induk_unit_kerja),
        "id_instansi": struktur.id_instansi
    })
    if not parent_induk_unit:
        raise HTTPException(
            status_code=404,
            detail="Parent work unit not found or doesn't belong to the institution"
        )
    
    # Store the original parent name
    original_parent_name = parent_induk_unit.get("nama_induk_unit", "")
    original_parent_id = struktur.id_induk_unit_kerja
    
    # Check if code already exists for this institution
    existing = await db.struktur_organisasi.find_one({
        "kode": struktur.kode,
        "id_instansi": struktur.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )
    
    # If kode_induk is provided, validate parent exists
    if struktur.kode_induk:
        parent = await db.struktur_organisasi.find_one({
            "kode": struktur.kode_induk,
            "id_instansi": struktur.id_instansi
        })
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent organization with code {struktur.kode_induk} not found"
            )

    # Check if induk_unit_kerja with the same kode_induk and parent_id already exists
    existing_induk_unit = await db.induk_unit_kerja.find_one({
        "kode_induk": struktur.kode,
        "parent_id": struktur.id_induk_unit_kerja,
        "id_instansi": struktur.id_instansi
    })
    
    if existing_induk_unit:
        # If it exists, use that instead of creating a new one
        new_induk_id = str(existing_induk_unit["_id"])
        print(f"Using existing induk unit kerja with ID: {new_induk_id}")
    else:
        # Create a new induk_unit_kerja based on struktur name
        new_induk_unit = {
            "nama_induk_unit": struktur.nama,  # Use struktur name for the new unit
            "kode_induk": struktur.kode,  # Use struktur code as kode_induk
            "id_instansi": struktur.id_instansi,
            "parent_id": struktur.id_induk_unit_kerja,  # Set selected induk as parent
            "jenis": instansi["jenis"],
            "children": [],  # Initialize empty children list
            "created_at": datetime.utcnow(),
            "name": struktur.nama  # Set name consistently as well
        }
        
        # Add parent_kode_induk by retrieving it from parent
        parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur.id_induk_unit_kerja)})
        if parent_unit and "kode_induk" in parent_unit:
            new_induk_unit["parent_kode_induk"] = parent_unit["kode_induk"]
        
        # Insert new induk_unit_kerja
        induk_result = await db.induk_unit_kerja.insert_one(new_induk_unit)
        new_induk_id = str(induk_result.inserted_id)
        
        # Update parent's children list
        await db.induk_unit_kerja.update_one(
            {"_id": ObjectId(struktur.id_induk_unit_kerja)},
            {"$push": {"children": new_induk_id}}
        )

    # Store both IDs for reference
    struktur_dict = struktur.dict()
    struktur_dict["created_at"] = datetime.utcnow()
    
    # Store both IDs for reference
    struktur_dict["parent_induk_id"] = original_parent_id  # Store original parent ID
    struktur_dict["id_induk_unit_kerja"] = new_induk_id   # Set to new induk unit
    
    result = await db.struktur_organisasi.insert_one(struktur_dict)
    struktur_id = str(result.inserted_id)
    
    created = await db.struktur_organisasi.find_one({"_id": result.inserted_id})
    created["id"] = struktur_id
    created["nama_instansi"] = instansi["nama_instansi"]
    created["jenis"] = instansi["jenis"]
    created["nama_induk_unit"] = original_parent_name  # Use the original parent's name
    
    # Update any existing peta_risiko_template with the new selera_risiko
    if struktur.selera_risiko is not None:
        await db.peta_risiko_template.update_many(
            {"id_induk_unit_kerja": struktur_id},
            {"$set": {"selera_risiko.current": struktur.selera_risiko}}
        )

    return StrukturOrganisasiResponse(**created)

@router.get("/available-induk-units/{id_instansi}", response_model=List[dict])
async def get_available_induk_units(id_instansi: str, current_user: dict = Depends(get_current_user)):
    # Check user role - only allow SUPER_ADMIN, ADMIN_KLP, and PEGAWAI
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, and PEGAWAI can view available parent units"
        )
        
    try:
        db = await Database.get_db()
        
        # Get the user's data
        user = await db.users.find_one({"username": current_user["username"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if the instansi exists
        instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
        if not instansi:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        # SUPER_ADMIN can access any institution
        if current_user["role"] == UserRole.SUPER_ADMIN:
            induk_units = []
            async for unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
                induk_units.append({"id": str(unit["_id"]), "nama_induk_unit": unit["nama_induk_unit"]})
            return induk_units
        
        # For non-SUPER_ADMIN roles, check if they can access this instansi
        if user.get("instansi_id") != id_instansi:
            raise HTTPException(
                status_code=403, 
                detail="You can only access units for your assigned institution"
            )
        
        # ADMIN_KLP can see all units in their instansi
        if current_user["role"] == UserRole.ADMIN_KLP:
            induk_units = []
            async for unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
                induk_units.append({"id": str(unit["_id"]), "nama_induk_unit": unit["nama_induk_unit"]})
            return induk_units
        
        # Other roles can only see their assigned units or all units in their institution
        # depending on their specific permissions
        user_units = user.get("induk_unit_kerja_ids", [])
        
        # If user has assigned units, return only those
        if user_units:
            induk_units = []
            # Convert string IDs to ObjectId, skipping invalid ones
            object_ids = []
            for uid in user_units:
                try:
                    object_ids.append(ObjectId(uid))
                except Exception as e:
                    print(f"Invalid ObjectId format: {uid}, error: {str(e)}")
                    # Skip invalid IDs
                    continue
            
            # If no valid IDs, return empty list
            if not object_ids:
                return []
                
            try:
                query = {
                    "_id": {"$in": object_ids},
                    "id_instansi": id_instansi
                }
                async for unit in db.induk_unit_kerja.find(query):
                    induk_units.append({"id": str(unit["_id"]), "nama_induk_unit": unit["nama_induk_unit"]})
            except Exception as e:
                print(f"Error in induk_unit_kerja query: {str(e)}")
                # Return empty list instead of failing
                return []
                
            return induk_units
        
        # If user has no assigned units, return empty list
        return []
    except Exception as e:
        import traceback
        print(f"Error in get_available_induk_units: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("", response_model=List[StrukturOrganisasiResponse])
async def get_struktur_organisasi(
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent Work Unit ID (optional)"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of organizational structures.
    
    Parameters:
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Optional Parent Work Unit ID
    - search: Optional search term to filter results
    
    Returns:
    - List of organizational structures
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
            detail="Only authorized roles can view can view organizational structures"
        )
        
    db = await Database.get_db()

    # Base query - always include id_instansi
    query = {
        "id_instansi": id_instansi
    }
    
    # Add id_induk_unit_kerja to query only if provided
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Search functionality
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}},
            {"nama_pendek": {"$regex": search, "$options": "i"}}
        ]
    
    # Get structures
    structures = []
    async for struktur in db.struktur_organisasi.find(query).sort("kode", 1):
        struktur["id"] = str(struktur["_id"])
        
        # Get institution name
        instansi = await db.instansi.find_one({"_id": ObjectId(struktur["id_instansi"])})
        if instansi:
            struktur["nama_instansi"] = instansi["nama_instansi"]
            struktur["jenis"] = instansi["jenis"]
        
        # For nama_induk_unit, try to get from parent_induk_id if available
        if "parent_induk_id" in struktur:
            parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["parent_induk_id"])})
            if parent_unit and "nama_induk_unit" in parent_unit:
                struktur["nama_induk_unit"] = parent_unit["nama_induk_unit"]
        else:
            # Fallback to current induk_unit_kerja
            induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["id_induk_unit_kerja"])})
            if induk_unit:
                struktur["nama_induk_unit"] = induk_unit["nama_induk_unit"]
        
        structures.append(StrukturOrganisasiResponse(**struktur))
    
    return structures

@router.get("/{struktur_id}", response_model=StrukturOrganisasiResponse)
async def get_struktur_organisasi_by_id(
    struktur_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific organizational structure by its ID.
    
    Parameters:
    - struktur_id (str): ID of the organizational structure to retrieve
    
    Returns:
    - StrukturOrganisasiResponse: The requested organizational structure
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
            detail="Only authorized roles can view can view organizational structures"
        )
        
    db = await Database.get_db()
    
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    # Add ID in the expected format
    struktur["id"] = str(struktur["_id"])
    
    # Get institution name
    instansi = await db.instansi.find_one({"_id": ObjectId(struktur["id_instansi"])})
    if instansi:
        struktur["nama_instansi"] = instansi["nama_instansi"]
        struktur["jenis"] = instansi["jenis"]
    
    # For nama_induk_unit, try to get from parent_induk_id if available
    if "parent_induk_id" in struktur:
        parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["parent_induk_id"])})
        if parent_unit and "nama_induk_unit" in parent_unit:
            struktur["nama_induk_unit"] = parent_unit["nama_induk_unit"]
    else:
        # Fallback to current induk_unit_kerja
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(struktur["id_induk_unit_kerja"])})
        if induk_unit:
            struktur["nama_induk_unit"] = induk_unit["nama_induk_unit"]
    
    return StrukturOrganisasiResponse(**struktur)

@router.put("/{struktur_id}", response_model=StrukturOrganisasiResponse)
async def update_struktur_organisasi(
    struktur_id: str,
    struktur: StrukturOrganisasiUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an organizational structure.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db = await Database.get_db()
    
    existing = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Structure not found")

    # Only SUPER_ADMIN can update parent work unit
    if struktur.id_induk_unit_kerja is not None and current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN and ADMIN_KLP can update parent work unit")

    update_data = struktur.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # If updating parent work unit, validate it exists and belongs to same institution
    if struktur.id_induk_unit_kerja:
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(struktur.id_induk_unit_kerja),
            "id_instansi": existing["id_instansi"]
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found or doesn't belong to the institution"
            )
        
        # Update parent_induk_id to reflect the new parent
        update_data["parent_induk_id"] = struktur.id_induk_unit_kerja

    # If updating code, check it doesn't conflict with existing codes
    if struktur.kode and struktur.kode != existing["kode"]:
        # Check if code already exists in struktur_organisasi
        code_exists = await db.struktur_organisasi.find_one({
            "kode": struktur.kode,
            "id_instansi": existing["id_instansi"],
            "_id": {"$ne": ObjectId(struktur_id)}
        })
        if code_exists:
            raise HTTPException(
                status_code=400,
                detail="Code already exists for this institution"
            )
            
        # Also check if kode_induk already exists in induk_unit_kerja
        induk_unit_with_kode = await db.induk_unit_kerja.find_one({
            "kode_induk": struktur.kode,
            "id_instansi": existing["id_instansi"],
            "_id": {"$ne": ObjectId(existing["id_induk_unit_kerja"])}
        })
        if induk_unit_with_kode:
            raise HTTPException(
                status_code=400,
                detail="Code already exists as kode_induk in another induk_unit_kerja"
            )

    # If name is being updated, also update the corresponding induk_unit_kerja
    if "nama" in update_data or "kode" in update_data:
        # Find the induk_unit_kerja linked to this struktur
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(existing["id_induk_unit_kerja"])
        })
        if induk_unit:
            induk_update = {}
            
            # Update the induk_unit_kerja name if name is changed
            if "nama" in update_data:
                induk_update["nama_induk_unit"] = update_data["nama"]
                induk_update["name"] = update_data["nama"]
            
            # Update kode_induk if kode is changed
            if "kode" in update_data:
                induk_update["kode_induk"] = update_data["kode"]
            
            # Add updated_at timestamp
            induk_update["updated_at"] = datetime.utcnow()
            
            # Apply the updates
            if induk_update:
                await db.induk_unit_kerja.update_one(
                    {"_id": ObjectId(existing["id_induk_unit_kerja"])},
                    {"$set": induk_update}
                )
                
                # If kode was changed, update all child units' parent_kode_induk
                if "kode" in update_data:
                    # Get all child units
                    async for child in db.induk_unit_kerja.find({"parent_id": existing["id_induk_unit_kerja"]}):
                        await db.induk_unit_kerja.update_one(
                            {"_id": child["_id"]},
                            {"$set": {
                                "parent_kode_induk": update_data["kode"],
                                "updated_at": datetime.utcnow()
                            }}
                        )

    # If changing induk_unit_kerja, update parent_kode_induk and parent_id
    if "id_induk_unit_kerja" in update_data and update_data["id_induk_unit_kerja"] != existing["id_induk_unit_kerja"]:
        # Get the new parent's kode_induk
        new_parent_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(update_data["id_induk_unit_kerja"])
        })
        
        if new_parent_unit and "kode_induk" in new_parent_unit:
            # Update current induk unit's parent information
            await db.induk_unit_kerja.update_one(
                {"_id": ObjectId(existing["id_induk_unit_kerja"])},
                {"$set": {
                    "parent_id": update_data["id_induk_unit_kerja"],
                    "parent_kode_induk": new_parent_unit["kode_induk"],
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Update the parent's children list - remove from old parent
            if "parent_id" in induk_unit and induk_unit["parent_id"]:
                await db.induk_unit_kerja.update_one(
                    {"_id": ObjectId(induk_unit["parent_id"])},
                    {"$pull": {"children": existing["id_induk_unit_kerja"]}}
                )
            
            # Add to new parent's children list
            await db.induk_unit_kerja.update_one(
                {"_id": ObjectId(update_data["id_induk_unit_kerja"])},
                {"$push": {"children": existing["id_induk_unit_kerja"]}}
            )

    await db.struktur_organisasi.update_one(
        {"_id": ObjectId(struktur_id)},
        {"$set": update_data}
    )

    # Update selera_risiko in peta_risiko_template if it's being updated
    if struktur.selera_risiko is not None:
        await db.peta_risiko_template.update_many(
            {"id_induk_unit_kerja": struktur_id},
            {"$set": {"selera_risiko.current": struktur.selera_risiko}}
        )

    updated = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    updated["id"] = struktur_id

    # Get institution information
    instansi = await db.instansi.find_one({"_id": ObjectId(updated["id_instansi"])})
    updated["nama_instansi"] = instansi["nama_instansi"]
    updated["jenis"] = instansi["jenis"]
    
    # For nama_induk_unit, try to get from parent_induk_id if available
    if "parent_induk_id" in updated:
        parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated["parent_induk_id"])})
        if parent_unit and "nama_induk_unit" in parent_unit:
            updated["nama_induk_unit"] = parent_unit["nama_induk_unit"]
    else:
        # Fallback to current induk_unit_kerja
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated["id_induk_unit_kerja"])})
        if induk_unit:
            updated["nama_induk_unit"] = induk_unit["nama_induk_unit"]

    return StrukturOrganisasiResponse(**updated)

@router.delete("/{struktur_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_struktur_organisasi(
    struktur_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an organizational structure.
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete organizational structures"
        )

    db = await Database.get_db()

    # Check if structure exists
    existing = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Structure not found"
        )

    # Check if structure has child structures
    has_children = await db.struktur_organisasi.find_one({
        "kode_induk": existing["kode"],
        "id_instansi": existing["id_instansi"]
    })
    if has_children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete structure with child structures"
        )
        
    # Get the induk_unit_kerja ID linked to this structure
    induk_unit_id = existing["id_induk_unit_kerja"]
    
    # Check if the induk unit has children in induk_unit_kerja
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit_id)})
    if induk_unit and induk_unit.get("children") and len(induk_unit["children"]) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete structure with child units in induk_unit_kerja"
        )
    
    # Check for dependent data that uses this induk_unit_kerja
    has_dependent_data = False
    
    # Check for risk maps using this induk_unit_kerja
    risk_maps = await db.peta_risiko_template.find_one({"id_induk_unit_kerja": induk_unit_id})
    if risk_maps:
        has_dependent_data = True
    
    # Check for risk identifications using this induk_unit_kerja
    risk_identifications = await db.identifikasi_risiko.find_one({"id_induk_unit_kerja": induk_unit_id})
    if risk_identifications:
        has_dependent_data = True
    
    if has_dependent_data:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete structure with dependent data (risk maps, identifications, etc.)"
        )

    # Delete the structure
    result = await db.struktur_organisasi.delete_one({"_id": ObjectId(struktur_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Structure not found"
        )
    
    # If induk unit exists and has no dependent data, remove it from parent's children list
    if induk_unit and "parent_id" in induk_unit:
        await db.induk_unit_kerja.update_one(
            {"_id": ObjectId(induk_unit["parent_id"])},
            {"$pull": {"children": induk_unit_id}}
        )
        
        # Then delete the induk unit
        await db.induk_unit_kerja.delete_one({"_id": ObjectId(induk_unit_id)})

@router.post("/{struktur_id}/assign-users", response_model=StrukturOrganisasiResponse)
async def assign_users_to_struktur(
    struktur_id: str,
    users: AssignUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign users to an organizational structure.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can assign users"
        )

    db = await Database.get_db()
    
    # Get structure and validate it exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(
            status_code=404,
            detail="Structure not found"
        )

    # Validate and prepare assigned users
    assigned_users = []
    for user_id in users.user_ids:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with id {user_id} not found"
            )
        assigned_users.append(
            UserInStruktur(
                user_id=str(user["_id"]),
                role=user["role"]
            ).dict()
        )

    # Update structure with assigned users
    await db.struktur_organisasi.update_one(
        {"_id": ObjectId(struktur_id)},
        {
            "$set": {
                "assigned_users": assigned_users,
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get updated structure with all required data
    updated = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    updated["id"] = struktur_id

    # Get related data
    instansi = await db.instansi.find_one({"_id": ObjectId(updated["id_instansi"])})
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated["id_induk_unit_kerja"])})
    
    # Add required fields
    updated["nama_instansi"] = instansi["nama_instansi"]
    updated["jenis"] = instansi["jenis"]
    updated["nama_induk_unit"] = induk_unit["nama_induk_unit"]

    return StrukturOrganisasiResponse(**updated)

@router.get("/{struktur_id}/users", response_model=List[dict])
async def get_users_in_struktur(struktur_id: str, current_user: dict = Depends(get_current_user)):
    ALLOWED_ROLES = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEGAWAI,
        UserRole.PENGAWAS_INTERN,
        UserRole.UNIT_MANAJEMEN_RISIKO,
    ]

    if current_user["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only authorized roles can view users in organizational structures"
        )
        
    db = await Database.get_db()
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    users = []
    for assigned_user in struktur.get("assigned_users", []):
        user = await db.users.find_one({"_id": ObjectId(assigned_user["user_id"])})
        if user:
            users.append({"id": str(user["_id"]), "nama_depan": user["nama_depan"], "nama_belakang": user["nama_belakang"], "role": assigned_user["role"]})
    return users

@router.post("/{struktur_id}/jenis-konteks", response_model=StrukturOrganisasiResponse)
async def add_jenis_konteks_to_struktur(
    struktur_id: str,
    jenis_konteks: JenisKonteksInStruktur,
    current_user: dict = Depends(get_current_user)
):
    """
    Add new context type to existing organization structure.

    Parameters:
    - struktur_id (str): ID of the organization structure
    - jenis_konteks (JenisKonteksInStruktur): Context type to add

    Example request body:
    ```json
    {
        "kode": "021",
        "nama": "sasaran level bupati",
        "jenis": "SASARAN"
    }
    ```

    Notes:
    - ID will be auto-generated
    - Code must be unique within institution
    - Only SUPER_ADMIN and ADMIN_KLP can add context types
    - jenis must be either "SASARAN" or "PROBIS"
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )

    db = await Database.get_db()
    
    # Validate struktur exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")

    # Validate kode is unique within instansi
    existing = await db.struktur_organisasi.find_one({
        "id_instansi": struktur["id_instansi"],
        "jenis_konteks.kode": jenis_konteks.kode
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Context type code already exists in this institution"
        )

    # Add jenis konteks with ID
    jenis_konteks_data = jenis_konteks.dict()
    jenis_konteks_data["id"] = str(ObjectId())  # Generate new ID
    jenis_konteks_data["created_at"] = datetime.utcnow()
    
    result = await db.struktur_organisasi.find_one_and_update(
        {"_id": ObjectId(struktur_id)},
        {
            "$push": {"jenis_konteks": jenis_konteks_data},
            "$set": {"updated_at": datetime.utcnow()}
        },
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Structure not found")

    # Get complete response data
    instansi = await db.instansi.find_one({"_id": ObjectId(result["id_instansi"])})
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(result["id_induk_unit_kerja"])})

    response_data = {
        "id": str(result["_id"]),
        "id_instansi": result["id_instansi"],
        "id_induk_unit_kerja": result["id_induk_unit_kerja"],
        "kode": result["kode"],
        "nama": result["nama"],
        "nama_pendek": result["nama_pendek"],
        "selera_risiko": result["selera_risiko"],
        "provinsi": result["provinsi"],
        "pimpinan": result.get("pimpinan"),
        "jabatan_pimpinan": result.get("jabatan_pimpinan"),
        "kota": result.get("kota"),
        "nama_instansi": instansi["nama_instansi"],
        "nama_induk_unit": induk_unit["nama_induk_unit"],
        "jenis": instansi["jenis"],
        "created_at": result["created_at"],
        "updated_at": result.get("updated_at"),
        "assigned_users": result.get("assigned_users", []),
        "jenis_konteks": result.get("jenis_konteks", [])
    }

    return StrukturOrganisasiResponse(**response_data)

@router.get("/{struktur_id}/jenis-konteks/{jenis_konteks_id}", response_model=JenisKonteksInStruktur)
async def get_jenis_konteks_by_id(
    struktur_id: str,
    jenis_konteks_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific context type by its ID within an organizational structure.
    
    Parameters:
    - struktur_id (str): ID of the organizational structure
    - jenis_konteks_id (str): ID of the context type to retrieve
    
    Returns:
    - JenisKonteksInStruktur: The requested context type
    """
    # Check user role - only allow SUPER_ADMIN, ADMIN_KLP, and PEGAWAI
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, and PEGAWAI can view context types"
        )
        
    db = await Database.get_db()
    
    # Get structure and validate it exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    # Find the jenis_konteks in the structure
    jenis_konteks = next(
        (jk for jk in struktur.get("jenis_konteks", []) if jk["id"] == jenis_konteks_id),
        None
    )
    
    if not jenis_konteks:
        raise HTTPException(status_code=404, detail="Context type not found in this structure")
    
    return JenisKonteksInStruktur(**jenis_konteks)

@router.get("/{struktur_id}/jenis-konteks", response_model=List[JenisKonteksInStruktur])
async def get_jenis_konteks_list(
    struktur_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all context types within an organizational structure.
    
    Parameters:
    - struktur_id (str): ID of the organizational structure
    
    Returns:
    - List[JenisKonteksInStruktur]: List of all context types in the structure
    """
    # Check user role - only allow SUPER_ADMIN, ADMIN_KLP, and PEGAWAI
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, and PEGAWAI can view context types"
        )
        
    db = await Database.get_db()
    
    # Get structure and validate it exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    return [JenisKonteksInStruktur(**jk) for jk in struktur.get("jenis_konteks", [])]

@router.delete("/{struktur_id}/jenis-konteks/{jenis_konteks_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jenis_konteks(
    struktur_id: str,
    jenis_konteks_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific context type from an organizational structure.
    
    Parameters:
    - struktur_id (str): ID of the organizational structure
    - jenis_konteks_id (str): ID of the context type to delete
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can delete context types"
        )
        
    db = await Database.get_db()
    
    # Get structure and validate it exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    # Check if the jenis_konteks exists in the structure
    jenis_konteks = next(
        (jk for jk in struktur.get("jenis_konteks", []) if jk["id"] == jenis_konteks_id),
        None
    )
    
    if not jenis_konteks:
        raise HTTPException(status_code=404, detail="Context type not found in this structure")
    
    # Check if there are any konteks using this jenis_konteks
    konteks_count = await db.konteks.count_documents({"id_jenis_konteks": jenis_konteks_id})
    if konteks_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete context type that is used by {konteks_count} contexts"
        )
    
    # Remove the jenis_konteks from the structure
    result = await db.struktur_organisasi.update_one(
        {"_id": ObjectId(struktur_id)},
        {
            "$pull": {"jenis_konteks": {"id": jenis_konteks_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Context type not found or couldn't be deleted")

@router.put("/{struktur_id}/jenis-konteks/{jenis_konteks_id}", response_model=JenisKonteksInStruktur)
async def update_jenis_konteks(
    struktur_id: str,
    jenis_konteks_id: str,
    jenis_konteks_update: JenisKonteksInStruktur,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a specific context type within an organizational structure.
    
    Parameters:
    - struktur_id (str): ID of the organizational structure
    - jenis_konteks_id (str): ID of the context type to update
    - jenis_konteks_update (JenisKonteksInStruktur): Updated context type data
    
    Returns:
    - JenisKonteksInStruktur: The updated context type
    
    Notes:
    - The jenis (SASARAN/PROBIS) cannot be changed if there are contexts using this type
    - Only SUPER_ADMIN and ADMIN_KLP can update context types
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update context types"
        )
        
    db = await Database.get_db()
    
    # Get structure and validate it exists
    struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    if not struktur:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    # Find the current jenis_konteks in the structure
    jenis_konteks_current = next(
        (jk for jk in struktur.get("jenis_konteks", []) if jk["id"] == jenis_konteks_id),
        None
    )
    
    if not jenis_konteks_current:
        raise HTTPException(status_code=404, detail="Context type not found in this structure")
    
    # Check if changing jenis (SASARAN/PROBIS)
    if jenis_konteks_update.jenis != jenis_konteks_current["jenis"]:
        # Check if there are any konteks using this jenis_konteks
        konteks_count = await db.konteks.count_documents({"id_jenis_konteks": jenis_konteks_id})
        if konteks_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change type of context type that is used by {konteks_count} contexts"
            )
    
    # Check if the code would conflict with another jenis_konteks
    if jenis_konteks_update.kode != jenis_konteks_current["kode"]:
        existing = await db.struktur_organisasi.find_one({
            "id_instansi": struktur["id_instansi"],
            "jenis_konteks.kode": jenis_konteks_update.kode,
            "_id": {"$ne": ObjectId(struktur_id)}
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Context type code already exists in this institution"
            )
    
    # Prepare update data
    update_data = jenis_konteks_update.dict()
    update_data["id"] = jenis_konteks_id  # Preserve the original ID
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the jenis_konteks in the structure
    result = await db.struktur_organisasi.update_one(
        {
            "_id": ObjectId(struktur_id),
            "jenis_konteks.id": jenis_konteks_id
        },
        {
            "$set": {
                "jenis_konteks.$": update_data,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Context type not found or couldn't be updated")
    
    # Get the updated structure
    updated_struktur = await db.struktur_organisasi.find_one({"_id": ObjectId(struktur_id)})
    updated_jenis_konteks = next(
        (jk for jk in updated_struktur.get("jenis_konteks", []) if jk["id"] == jenis_konteks_id),
        None
    )
    
    if not updated_jenis_konteks:
        raise HTTPException(status_code=404, detail="Context type not found after update")
    
    return JenisKonteksInStruktur(**updated_jenis_konteks)
