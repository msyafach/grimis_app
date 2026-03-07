from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.organization import IndukUnitKerjaCreate, IndukUnitKerjaResponse, IndukUnitKerjaUpdate, IndukUnitKerjaWithInstansi, IndukUnitKerjaGroupByInstansi
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter()

async def generate_induk_unit_kerja_id(db, id_instansi: str) -> str:
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
    count = await db.induk_unit_kerja.count_documents({"id_instansi": id_instansi})
    sequence_number = str(count + 1).zfill(3)
    return f"{instansi['kode_instansi']}-IUK-{sequence_number}"

@router.post("", response_model=IndukUnitKerjaResponse)
async def create_induk_unit_kerja(unit: IndukUnitKerjaCreate, current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    
    # Get the full user data to check permissions
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user has permission to create induk_unit_kerja
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN and ADMIN_KLP can create main work units")
    
    # For ADMIN_KLP, check if they're creating a unit for their assigned instansi
    if current_user["role"] == UserRole.ADMIN_KLP:
        if user.get("instansi_id") != unit.id_instansi:
            raise HTTPException(
                status_code=403,
                detail="You can only create work units for your assigned institution"
            )
    
    instansi = await db.instansi.find_one({"_id": ObjectId(unit.id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Check if there's already a main induk_unit_kerja for this institution (without parent_id)
    existing_root_unit = await db.induk_unit_kerja.find_one({
        "id_instansi": unit.id_instansi,
        "parent_id": None
    })
    
    # If parent_id is not provided (meaning it's a root unit), check if one already exists
    if not unit.parent_id and existing_root_unit:
        raise HTTPException(
            status_code=400, 
            detail="This institution already has a main work unit. Additional units should be created through the struktur_organisasi endpoint."
        )
    
    # Debug log
    print(f"Creating induk unit kerja with data: {unit.dict()}")
    
    unit_dict = unit.dict()
    unit_dict["created_at"] = datetime.utcnow()
    unit_dict["jenis"] = instansi["jenis"]
    
    # Initialize children list if not provided
    if "children" not in unit_dict:
        unit_dict["children"] = []
    
    # Ensure kode_induk is set (required field)
    if not unit_dict.get("kode_induk"):
        raise HTTPException(status_code=400, detail="kode_induk is required")
    
    # Check if unit with the same kode_induk already exists in this institution
    existing_unit = await db.induk_unit_kerja.find_one({
        "kode_induk": unit_dict["kode_induk"],
        "id_instansi": unit.id_instansi
    })
    
    if existing_unit:
        raise HTTPException(
            status_code=400,
            detail=f"A unit with kode_induk '{unit_dict['kode_induk']}' already exists in this institution"
        )
    
    # If parent_id is provided, get the parent's kode_induk to set as parent_kode_induk
    if unit.parent_id:
        parent_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(unit.parent_id),
            "id_instansi": unit.id_instansi
        })
        if not parent_unit:
            raise HTTPException(status_code=404, detail="Parent work unit not found")
        
        # Set parent_kode_induk from parent's kode_induk
        if "kode_induk" in parent_unit:
            unit_dict["parent_kode_induk"] = parent_unit["kode_induk"]
    else:
        # Clear parent_kode_induk for root units
        unit_dict["parent_kode_induk"] = None
    
    # Insert the new work unit first
    result = await db.induk_unit_kerja.insert_one(unit_dict)
    new_unit_id = str(result.inserted_id)
    print(f"Created induk unit kerja with ID: {new_unit_id}")
    
    # If parent_id is provided, verify it exists and update its children list
    if unit.parent_id:
        parent_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit.parent_id), "id_instansi": unit.id_instansi})
        if not parent_unit:
            raise HTTPException(status_code=404, detail="Parent work unit not found")
        
        # Update parent's children list
        await db.induk_unit_kerja.update_one(
            {"_id": ObjectId(unit.parent_id)},
            {"$push": {"children": new_unit_id}}
        )
    
    created_unit = await db.induk_unit_kerja.find_one({"_id": result.inserted_id})
    created_unit["id"] = new_unit_id
    
    # If this is a root unit (no parent_id), automatically create initial structure
    if not unit.parent_id:
        try:
            # Create a basic structure for this root induk unit
            from app.schemas.organization import StrukturOrganisasiCreate, JenisKonteksInStruktur
            
            # Debug
            print(f"Attempting to create initial structure for {unit.nama_induk_unit}")
            
            # Use the same code as provided in the induk unit kerja
            kode = unit.kode_induk
            
            # Create structure data
            struktur_data = {
                "kode": kode,
                "nama": unit.nama_induk_unit,  # Use the same name as induk unit
                "nama_pendek": unit.nama_induk_unit[:10] if len(unit.nama_induk_unit) > 10 else unit.nama_induk_unit,  # Create short name
                "selera_risiko": 6,  # Default medium risk appetite
                "provinsi": instansi.get("provinsi", ""),
                "id_induk_unit_kerja": new_unit_id,
                "id_instansi": unit.id_instansi,
                "jenis_konteks": []  # Empty initial context types
            }
            
            # Debug
            print(f"Structure data to insert: {struktur_data}")
            
            # Insert structure
            struktur_result = await db.struktur_organisasi.insert_one({
                **struktur_data,
                "created_at": datetime.utcnow(),
                "created_by": str(current_user.get("id", current_user.get("_id", "")))
            })
            
            print(f"Created initial structure with ID: {struktur_result.inserted_id} for induk unit kerja {unit.nama_induk_unit}")
            
        except Exception as e:
            # Log the error but don't fail the main operation
            print(f"Error creating initial structure: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    if "name" not in created_unit and "nama_induk_unit" in created_unit:
        created_unit["name"] = created_unit["nama_induk_unit"]
    return IndukUnitKerjaResponse(**created_unit)

@router.get("/by-instansi/{id_instansi}", response_model=List[IndukUnitKerjaResponse])
async def get_induk_unit_kerja_by_instansi(id_instansi: str, current_user: dict = Depends(get_current_user)):
    try:
        db = await Database.get_db()
        
        # Get the full user data to check permissions
        user = await db.users.find_one({"username": current_user["username"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if the instansi exists
        instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
        if not instansi:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        # SUPER_ADMIN can access all units
        units = []
        if current_user["role"] == UserRole.SUPER_ADMIN:
            async for unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
                unit["id"] = str(unit["_id"])
                if "jenis" not in unit:
                    unit["jenis"] = instansi["jenis"]
                if "name" not in unit and "nama_induk_unit" in unit:
                    unit["name"] = unit["nama_induk_unit"]
                units.append(IndukUnitKerjaResponse(**unit))
            return units
        
        # For ADMIN_KLP, check if they can access this instansi
        if current_user["role"] == UserRole.ADMIN_KLP:
            if user.get("instansi_id") != id_instansi:
                raise HTTPException(
                    status_code=403,
                    detail="You can only access work units for your assigned institution"
                )
            # ADMIN_KLP can see all units in their instansi
            units = []
            async for unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
                unit["id"] = str(unit["_id"])
                if "jenis" not in unit:
                    unit["jenis"] = instansi["jenis"]
                if "name" not in unit and "nama_induk_unit" in unit:
                    unit["name"] = unit["nama_induk_unit"]
                units.append(IndukUnitKerjaResponse(**unit))
            return units
        
        # For other roles (UNIT_MANAJEMEN_RISIKO, PEMILIK_RISIKO, etc.)
        # First check if they belong to this instansi
        if user.get("instansi_id") != id_instansi:
            raise HTTPException(
                status_code=403,
                detail="You can only access work units for your assigned institution"
            )
        
        # Get their assigned units
        user_units = user.get("induk_unit_kerja_ids", [])
        
        # Convert string IDs to ObjectId
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
            
        units = []
        # Get only the units assigned to this user
        try:
            query = {
                "_id": {"$in": object_ids},
                "id_instansi": id_instansi
            }
            async for unit in db.induk_unit_kerja.find(query):
                unit["id"] = str(unit["_id"])
                if "jenis" not in unit:
                    unit["jenis"] = instansi["jenis"]
                if "name" not in unit and "nama_induk_unit" in unit:
                    unit["name"] = unit["nama_induk_unit"]
                units.append(IndukUnitKerjaResponse(**unit))
        except Exception as e:
            print(f"Error in induk_unit_kerja query: {str(e)}")
            # Return empty list instead of failing
            return []
        
        return units
    except Exception as e:
        import traceback
        print(f"Error in get_induk_unit_kerja_by_instansi: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{unit_id}", response_model=IndukUnitKerjaResponse)
async def get_induk_unit_kerja_by_id(unit_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get a specific induk unit kerja by its ID.
    
    Parameters:
    - unit_id (str): ID of the induk unit kerja to retrieve
    
    Returns:
    - IndukUnitKerjaResponse: The requested induk unit kerja
    """
    db = await Database.get_db()
    
    # Get the full user data to check permissions
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the requested unit
    unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Work unit not found")
    
    # For non-SUPER_ADMIN users, check if they have access to this unit
    if current_user["role"] != UserRole.SUPER_ADMIN:
        # ADMIN_KLP can access any unit in their instansi
        if current_user["role"] == UserRole.ADMIN_KLP:
            if user.get("instansi_id") != unit.get("id_instansi"):
                raise HTTPException(
                    status_code=403,
                    detail="You can only access work units for your assigned institution"
                )
        else:
            # Other users can only access their assigned units
            user_units = user.get("induk_unit_kerja_ids", [])
            if unit_id not in user_units:
                # Check if this is the user's last_induk_unit_kerja_id
                if user.get("last_induk_unit_kerja_id") != unit_id:
                    # If it's not their assigned unit or last used unit, check if it's in their instansi
                    if user.get("instansi_id") != unit.get("id_instansi"):
                        raise HTTPException(
                            status_code=403,
                            detail="You don't have permission to access this work unit"
                        )
    
    # Get instansi info
    instansi = await db.instansi.find_one({"_id": ObjectId(unit["id_instansi"])})
    if instansi and "jenis" not in unit:
        unit["jenis"] = instansi["jenis"]
    
    if "name" not in unit and "nama_induk_unit" in unit:
        unit["name"] = unit["nama_induk_unit"]
        
    unit["id"] = str(unit["_id"])
    return IndukUnitKerjaResponse(**unit)

@router.put("/{unit_id}", response_model=IndukUnitKerjaResponse)
async def update_induk_unit_kerja(unit_id: str, unit: IndukUnitKerjaUpdate, current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    
    # Get the full user data to check permissions
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user has permission to update induk_unit_kerja
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN and ADMIN_KLP can update work units")
    
    existing_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
    if not existing_unit:
        raise HTTPException(status_code=404, detail="Work unit not found")
    
    # For ADMIN_KLP, check if they're updating a unit for their assigned instansi
    if current_user["role"] == UserRole.ADMIN_KLP:
        if user.get("instansi_id") != existing_unit.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="You can only update work units for your assigned institution"
            )
    
    update_data = unit.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # If parent_id is being updated, verify it exists and update parent_kode_induk
    if "parent_id" in update_data:
        if update_data["parent_id"]:
            parent_unit = await db.induk_unit_kerja.find_one({
                "_id": ObjectId(update_data["parent_id"]),
                "id_instansi": existing_unit["id_instansi"]
            })
            if not parent_unit:
                raise HTTPException(status_code=404, detail="Parent work unit not found")
            # Prevent circular references
            if parent_unit["_id"] == ObjectId(unit_id):
                raise HTTPException(status_code=400, detail="Unit cannot be its own parent")
                
            # Set parent_kode_induk from the new parent
            if "kode_induk" in parent_unit:
                update_data["parent_kode_induk"] = parent_unit["kode_induk"]
                
            # Update the old parent's children list if it exists
            if existing_unit.get("parent_id"):
                await db.induk_unit_kerja.update_one(
                    {"_id": ObjectId(existing_unit["parent_id"])},
                    {"$pull": {"children": unit_id}}
                )
                
            # Add to the new parent's children list
            await db.induk_unit_kerja.update_one(
                {"_id": ObjectId(update_data["parent_id"])},
                {"$push": {"children": unit_id}}
            )
        else:
            # If setting parent_id to None, set parent_kode_induk to None as well
            update_data["parent_kode_induk"] = None
            
            # Remove from old parent's children list if it exists
            if existing_unit.get("parent_id"):
                await db.induk_unit_kerja.update_one(
                    {"_id": ObjectId(existing_unit["parent_id"])},
                    {"$pull": {"children": unit_id}}
                )
    
    # If kode_induk is being updated, update all child units' parent_kode_induk
    if "kode_induk" in update_data:
        # Get all child units
        async for child in db.induk_unit_kerja.find({"parent_id": unit_id}):
            await db.induk_unit_kerja.update_one(
                {"_id": child["_id"]},
                {"$set": {
                    "parent_kode_induk": update_data["kode_induk"],
                    "updated_at": datetime.utcnow()
                }}
            )
    
    await db.induk_unit_kerja.update_one({"_id": ObjectId(unit_id)}, {"$set": update_data})
    updated_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
    updated_unit["id"] = str(updated_unit["_id"])
    if "name" not in updated_unit and "nama_induk_unit" in updated_unit:
        updated_unit["name"] = updated_unit["nama_induk_unit"]
    return IndukUnitKerjaResponse(**updated_unit)

@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_induk_unit_kerja(unit_id: str, current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    
    # Get the full user data to check permissions
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user has permission to delete induk_unit_kerja
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN and ADMIN_KLP can delete work units")
    
    # Find the unit to delete
    unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Work unit not found")
    
    # For ADMIN_KLP, check if they're deleting a unit for their assigned instansi
    if current_user["role"] == UserRole.ADMIN_KLP:
        if user.get("instansi_id") != unit.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="You can only delete work units for your assigned institution"
            )
    
    # Check if the unit has children
    if unit.get("children") and len(unit["children"]) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a work unit that has children")

    # Check if there are any related structures
    structures = []
    async for structure in db.struktur_organisasi.find({"id_induk_unit_kerja": unit_id}):
        structures.append(structure)
    
    # Check for risk identifications or templates associated with this unit
    risk_identifications = await db.identifikasi_risiko.count_documents({"id_induk_unit_kerja": unit_id})
    risk_templates = await db.template_risiko.count_documents({"id_induk_unit_kerja": unit_id})
    
    if risk_identifications > 0 or risk_templates > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete this work unit as it has {risk_identifications} risk identifications and {risk_templates} risk templates"
        )
    
    # Delete related structures
    for structure in structures:
        await db.struktur_organisasi.delete_one({"_id": structure["_id"]})
    
    # If the unit has a parent, update the parent's children list
    if unit.get("parent_id"):
        await db.induk_unit_kerja.update_one(
            {"_id": ObjectId(unit["parent_id"])},
            {"$pull": {"children": unit_id}}
        )
    
    # Delete the unit
    result = await db.induk_unit_kerja.delete_one({"_id": ObjectId(unit_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Work unit not found")

@router.get("/all/{id_instansi}", response_model=IndukUnitKerjaGroupByInstansi)
async def get_all_induk_unit_kerja(id_instansi: str, current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    
    # Get the full user data to check permissions
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the instansi exists
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # For non-SUPER_ADMIN users, check if they can access this instansi
    if current_user["role"] != UserRole.SUPER_ADMIN:
        # Check if user has access to this instansi
        if user.get("instansi_id") != id_instansi:
            raise HTTPException(
                status_code=403,
                detail="You can only access work units for your assigned institution"
            )
    
    instansi_data = {
        "id_instansi": str(instansi["_id"]),
        "nama_instansi": instansi["nama_instansi"],
        "kode_instansi": instansi["kode_instansi"],
        "induk_unit_kerja": []
    }
    
    # SUPER_ADMIN and ADMIN_KLP can see all units
    if current_user["role"] in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        async for unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
            unit["id"] = str(unit["_id"])
            if "jenis" not in unit:
                unit["jenis"] = instansi["jenis"]
            
            # Ensure children field contains only IDs
            unit["children"] = [str(child_id) for child_id in unit.get("children", [])]
            
            if "name" not in unit and "nama_induk_unit" in unit:
                unit["name"] = unit["nama_induk_unit"]
            instansi_data["induk_unit_kerja"].append(IndukUnitKerjaResponse(**unit))
    else:
        # Other users can only see their assigned units
        user_units = user.get("induk_unit_kerja_ids", [])
        
        if user_units:
            # Get only the units assigned to this user
            async for unit in db.induk_unit_kerja.find({"_id": {"$in": [ObjectId(uid) for uid in user_units]}, "id_instansi": id_instansi}):
                unit["id"] = str(unit["_id"])
                if "jenis" not in unit:
                    unit["jenis"] = instansi["jenis"]
                
                # Ensure children field contains only IDs
                unit["children"] = [str(child_id) for child_id in unit.get("children", [])]
                
                if "name" not in unit and "nama_induk_unit" in unit:
                    unit["name"] = unit["nama_induk_unit"]
                instansi_data["induk_unit_kerja"].append(IndukUnitKerjaResponse(**unit))
    
    return IndukUnitKerjaGroupByInstansi(**instansi_data)
