from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserCreate, UserResponse, UserLogin, TokenResponse, UserRole, UserUpdate, UserSelfUpdate, ChangePasswordRequest
from app.database import Database
from app.utils.auth import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user
)
from bson import ObjectId
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to register new users"
        )

    db = await Database.get_db()
    
    if await db.users.find_one({"username": user.username}):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    if current_user["role"] == UserRole.ADMIN_KLP and user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="ADMIN_KLP cannot create SUPER_ADMIN accounts"
        )

    # For ADMIN_KLP, enforce using their own instansi_id
    if current_user["role"] == UserRole.ADMIN_KLP:
        # Get the ADMIN_KLP's assigned institution
        admin_user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not admin_user or not admin_user.get("instansi_id"):
            raise HTTPException(
                status_code=400,
                detail="ADMIN_KLP must have an assigned institution to create users"
            )
        
        # Force using the ADMIN_KLP's institution
        user.instansi_id = admin_user["instansi_id"]

    # Validate instansi and induk_unit_kerja for non-SUPER_ADMIN users
    if user.role != UserRole.SUPER_ADMIN:
        if not user.instansi_id:
            raise HTTPException(
                status_code=400,
                detail="instansi_id is required for non-SUPER_ADMIN users"
            )
        
        # Validate instansi exists
        instansi = await db.instansi.find_one({"_id": ObjectId(user.instansi_id)})
        if not instansi:
            raise HTTPException(
                status_code=404,
                detail="Specified institution not found"
            )
        
        # Validate induk_unit_kerja_ids exist and belong to the specified instansi
        if not user.induk_unit_kerja_ids or len(user.induk_unit_kerja_ids) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one induk_unit_kerja_id is required for non-SUPER_ADMIN users"
            )
        
        # Validate each induk_unit_kerja
        validated_unit_ids = []
        for unit_id in user.induk_unit_kerja_ids:
            try:
                induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
                if not induk_unit:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Parent work unit not found: {unit_id}"
                    )
                
                if induk_unit.get("id_instansi") != user.instansi_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Parent work unit {unit_id} does not belong to the specified institution"
                    )
                
                validated_unit_ids.append(unit_id)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parent work unit ID: {unit_id}"
                )
        
        # Use validated IDs
        user.induk_unit_kerja_ids = validated_unit_ids

    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["created_at"] = datetime.utcnow()
    
    # Set last_instansi_id and last_induk_unit_kerja_id as well for convenience
    if user.role != UserRole.SUPER_ADMIN:
        user_dict["last_instansi_id"] = user.instansi_id
        # Set the first unit as the default active one
        if user.induk_unit_kerja_ids and len(user.induk_unit_kerja_ids) > 0:
            user_dict["last_induk_unit_kerja_id"] = user.induk_unit_kerja_ids[0]
    
    result = await db.users.insert_one(user_dict)
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
async def login(user_credentials: UserLogin):
    # Verify reCAPTCHA if provided
    if user_credentials.recaptcha_token:
        from app.utils.auth import verify_recaptcha
        if not await verify_recaptcha(user_credentials.recaptcha_token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reCAPTCHA token"
            )

    db = await Database.get_db()
    user = await db.users.find_one({"username": user_credentials.username})
    
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user["_id"])
    # Map id_instansi to instansi_id if needed
    user["instansi_id"] = user.get("instansi_id") or user.get("id_instansi")
    if user.get("instansi_id") and not isinstance(user["instansi_id"], str):
        user["instansi_id"] = str(user["instansi_id"])
    # Map id_induk_unit_kerja to induk_unit_kerja_ids if needed
    user["induk_unit_kerja_ids"] = user.get("induk_unit_kerja_ids") or user.get("id_induk_unit_kerja")
    if user.get("induk_unit_kerja_ids"):
        user["induk_unit_kerja_ids"] = [str(i) for i in user["induk_unit_kerja_ids"]]
    
    # Get instansi name if instansi_id exists
    if user.get("instansi_id"):
        try:
            instansi = await db.instansi.find_one({"_id": ObjectId(user["instansi_id"])})
            if instansi:
                user["nama_instansi"] = instansi.get("nama_instansi")
        except Exception as e:
            # If there's an error getting instansi, continue without it
            pass
    
    return UserResponse(**user)

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    instansi_id: Optional[str] = None
):
    # Only SUPER_ADMIN and ADMIN_KLP can view all users
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    
    db = await Database.get_db()
    
    # Build query filter
    query = {}
    
    # If instansi_id filter is provided
    if instansi_id:
        query["instansi_id"] = instansi_id
    
    # For ADMIN_KLP, restrict to their own instansi
    if current_user["role"] == UserRole.ADMIN_KLP:
        # Get the admin's instansi_id
        admin_user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if admin_user and admin_user.get("instansi_id"):
            # Override any provided instansi_id filter with admin's instansi_id
            query["instansi_id"] = admin_user.get("instansi_id")
        else:
            # If admin doesn't have instansi_id, return empty list
            return []
    
    # Create a map of instansi_id to nama_instansi for efficient lookup
    instansi_map = {}
    async for instansi in db.instansi.find():
        instansi_map[str(instansi["_id"])] = instansi.get("nama_instansi")
    
    users = []
    async for user in db.users.find(query):
        user["id"] = str(user["_id"])
        # Add nama_instansi if instansi_id exists
        if user.get("instansi_id") and user["instansi_id"] in instansi_map:
            user["nama_instansi"] = instansi_map[user["instansi_id"]]
        users.append(UserResponse(**user))
    
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user by ID.
    
    This endpoint retrieves a specific user by their ID.
    
    Permissions:
    - SUPER_ADMIN can access any user
    - ADMIN_KLP can access any user
    - Regular users can only access their own data
    
    Parameters:
    - user_id: ID of the user to retrieve
    
    Returns:
    - Complete user details
    - 404 Not Found if user doesn't exist
    - 403 Forbidden if user doesn't have permission
    """
    db = await Database.get_db()
    
    # Check if user exists
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Validate permissions
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        # Regular users can only view their own data
        if str(current_user["id"]) != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own data"
            )
    
    user["id"] = str(user["_id"])
    
    # Get instansi name if instansi_id exists
    if user.get("instansi_id"):
        try:
            instansi = await db.instansi.find_one({"_id": ObjectId(user["instansi_id"])})
            if instansi:
                user["nama_instansi"] = instansi.get("nama_instansi")
        except Exception as e:
            # If there's an error getting instansi, continue without it
            pass
    
    return UserResponse(**user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user data.
    
    Permissions:
    - SUPER_ADMIN can update any user and all fields
    - ADMIN_KLP can update users in their institution, except other ADMIN_KLP or SUPER_ADMIN
    - Regular users can only update their own basic data (use /me endpoint instead)
    """
    db = await Database.get_db()

    # Check if user exists
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Get current user's full data
    current_user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})

    # Validate permissions
    if current_user["role"] == UserRole.SUPER_ADMIN:
        # SUPER_ADMIN can update any user
        pass
    elif current_user["role"] == UserRole.ADMIN_KLP:
        # ADMIN_KLP can only update users in their institution
        if not current_user_data.get("instansi_id"):
            raise HTTPException(
                status_code=403,
                detail="ADMIN_KLP must have an assigned institution to update users"
            )
        
        # Check if target user belongs to the same institution
        if existing.get("instansi_id") != current_user_data.get("instansi_id"):
            raise HTTPException(
                status_code=403,
                detail="You can only update users in your institution"
            )
        
        # ADMIN_KLP cannot update other ADMIN_KLP or SUPER_ADMIN
        if existing.get("role") in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
            raise HTTPException(
                status_code=403,
                detail="You cannot update SUPER_ADMIN or other ADMIN_KLP users"
            )
        
        # ADMIN_KLP cannot change user's role to SUPER_ADMIN or ADMIN_KLP
        if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
            raise HTTPException(
                status_code=403,
                detail="You cannot assign SUPER_ADMIN or ADMIN_KLP roles"
            )
        
        # ADMIN_KLP cannot change user's institution
        if user.instansi_id is not None and user.instansi_id != existing.get("instansi_id"):
            raise HTTPException(
                status_code=403,
                detail="You cannot change a user's institution"
            )
        
        # Force using the ADMIN_KLP's institution
        user.instansi_id = current_user_data.get("instansi_id")
        
        # Validate induk_unit_kerja_ids if provided
        if user.induk_unit_kerja_ids is not None:
            if len(user.induk_unit_kerja_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="At least one induk_unit_kerja_id is required"
                )
            
            # Validate each induk_unit_kerja belongs to the institution
            validated_unit_ids = []
            for unit_id in user.induk_unit_kerja_ids:
                try:
                    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
                    if not induk_unit:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Parent work unit not found: {unit_id}"
                        )
                    
                    if induk_unit.get("id_instansi") != current_user_data.get("instansi_id"):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Parent work unit {unit_id} does not belong to your institution"
                        )
                    
                    validated_unit_ids.append(unit_id)
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid parent work unit ID: {unit_id}"
                    )
            
            user.induk_unit_kerja_ids = validated_unit_ids
    else:
        # Regular users should use the /me endpoint instead
        raise HTTPException(
            status_code=403,
            detail="Regular users should use the /me endpoint to update their profile"
        )

    update_data = user.dict(exclude_unset=True)
    
    # Hash password if provided
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    
    # If induk_unit_kerja_ids is updated, also update last_induk_unit_kerja_id if needed
    if "induk_unit_kerja_ids" in update_data and update_data["induk_unit_kerja_ids"]:
        current_last_unit = existing.get("last_induk_unit_kerja_id")
        
        # Check if current last unit is still in the new list
        if not current_last_unit or current_last_unit not in update_data["induk_unit_kerja_ids"]:
            # Set first unit in the new list as the default
            update_data["last_induk_unit_kerja_id"] = update_data["induk_unit_kerja_ids"][0]
    
    update_data["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    updated["id"] = str(updated["_id"])
    
    # Get instansi name if instansi_id exists
    if updated.get("instansi_id"):
        try:
            instansi = await db.instansi.find_one({"_id": ObjectId(updated["instansi_id"])})
            if instansi:
                updated["nama_instansi"] = instansi.get("nama_instansi")
        except Exception as e:
            # If there's an error getting instansi, continue without it
            pass
    
    return UserResponse(**updated)

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete user.
    - Users can delete their own account.
    - SUPER_ADMIN can delete any user except other SUPER_ADMINs.
    - ADMIN_KLP can delete any user in their assigned KLP, except SUPER_ADMINs.
    """
    db = await Database.get_db()

    # Fetch user to be deleted
    user_to_delete = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    # If deleting self, always allowed
    if current_user["id"] == user_id:
        pass

    # SUPER_ADMIN rule
    elif current_user["role"] == UserRole.SUPER_ADMIN:
        if user_to_delete["role"] == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot delete other SUPER_ADMIN accounts")

    # ADMIN_KLP rule
    elif current_user["role"] == UserRole.ADMIN_KLP:
        if user_to_delete["role"] == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot delete SUPER_ADMIN")

        # Check if ADMIN_KLP is assigned to a struktur_organisasi where the target user is assigned
        struktur_cursor = db.struktur_organisasi.find({
            "id_instansi": user_to_delete["instansi_id"],
            "id_induk_unit_kerja": {"$in": user_to_delete.get("induk_unit_kerja_ids", [])},
            "assigned_users": {
                "$elemMatch": {
                    "user_id": str(current_user["id"])
                }
            }
        })

        struktur_match = await struktur_cursor.to_list(length=1)
        if not struktur_match:
            raise HTTPException(status_code=403, detail="You are not authorized to delete this user")

    # Other users: not allowed
    else:
        raise HTTPException(status_code=403, detail="You can only delete your own account")

    # Proceed to delete
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}

@router.put("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    last_instansi_id: Optional[str] = None,
    last_induk_unit_kerja_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update current user preferences like last selected instansi and induk unit kerja"""
    db = await Database.get_db()
    
    # Get the full user
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    update_data = {}
    
    # Handle instansi_id update
    if last_instansi_id:
        # Verify that instansi exists
        instansi = await db.instansi.find_one({"_id": ObjectId(last_instansi_id)})
        if not instansi:
            raise HTTPException(status_code=404, detail="Institution not found")
            
        # Non-SUPER_ADMIN users need additional checks
        if user["role"] != UserRole.SUPER_ADMIN:
            # If user has an assigned instansi, make sure it matches
            if user.get("instansi_id") and user["instansi_id"] != last_instansi_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only select your assigned institution"
                )
                
        update_data["last_instansi_id"] = last_instansi_id
    
    # Handle induk_unit_kerja_id update
    if last_induk_unit_kerja_id:
        # Verify that induk_unit_kerja exists
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(last_induk_unit_kerja_id)})
        if not induk_unit:
            raise HTTPException(status_code=404, detail="Work unit not found")
            
        # Make sure this induk_unit_kerja belongs to the right instansi (if provided)
        if last_instansi_id and induk_unit["id_instansi"] != last_instansi_id:
            raise HTTPException(
                status_code=400,
                detail="Work unit does not belong to the selected institution"
            )
        
        # For non-SUPER_ADMIN and non-ADMIN_KLP users, check if this is in their assigned units
        if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
            user_units = user.get("induk_unit_kerja_ids", [])
            if user_units and last_induk_unit_kerja_id not in user_units:
                raise HTTPException(
                    status_code=403,
                    detail="You can only select work units that are assigned to you"
                )
                
        update_data["last_induk_unit_kerja_id"] = last_induk_unit_kerja_id
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid preferences to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user["id"] = user_id
    
    return UserResponse(**updated_user)

@router.post("/me/check-work-unit", response_model=UserResponse)
async def check_and_update_work_unit(
    current_user: dict = Depends(get_current_user)
):
    """
    Check and update user's work unit preference if needed.
    
    This endpoint checks if the user has a valid work unit (induk_unit_kerja) assigned:
    1. If user has no institution (instansi) set, no update is performed
    2. If user already has a valid work unit, no update is performed
    3. If user has an institution but no work unit, or an invalid work unit,
       it attempts to assign a valid work unit from the user's institution
       
    For non-SUPER_ADMIN users:
    - Will always use their assigned institution
    - Will prioritize one of their assigned work units if available
       
    This can be called periodically to ensure the user always has a valid
    work unit when one becomes available.
    
    Returns:
    - Updated user data with preferences
    """
    db = await Database.get_db()
    
    # Get user with full data
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is locked to a specific instansi (non-SUPER_ADMIN)
    is_locked_to_instansi = user.get("role") != UserRole.SUPER_ADMIN and user.get("instansi_id")
    
    # For non-SUPER_ADMIN users with assigned instansi, use that
    effective_instansi_id = None
    if is_locked_to_instansi:
        effective_instansi_id = user.get("instansi_id")
    else:
        # If user has no institution set, nothing to do
        if not user.get("last_instansi_id"):
            user["id"] = str(user["_id"])
            return UserResponse(**user)
        effective_instansi_id = user.get("last_instansi_id")
    
    update_needed = False
    current_induk_unit_kerja_id = user.get("last_induk_unit_kerja_id")
    
    # Check if user already has a valid work unit
    if current_induk_unit_kerja_id:
        try:
            current_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(current_induk_unit_kerja_id)})
            # If unit doesn't exist or belongs to wrong institution, we need to update
            if not current_unit or current_unit.get("id_instansi") != effective_instansi_id:
                update_needed = True
            # For non-SUPER_ADMIN users, also check if they have access to this unit
            elif is_locked_to_instansi:
                user_unit_ids = user.get("induk_unit_kerja_ids", [])
                if user_unit_ids and current_induk_unit_kerja_id not in user_unit_ids:
                    update_needed = True
        except:
            # Invalid ObjectId or other error, need to update
            update_needed = True
    else:
        # No work unit set, need to update
        update_needed = True
    
    if update_needed:
        # Try to find a suitable work unit for this institution
        try:
            # For non-SUPER_ADMIN users, prioritize their assigned work units
            if is_locked_to_instansi and user.get("induk_unit_kerja_ids") and len(user.get("induk_unit_kerja_ids", [])) > 0:
                # Use the first assigned unit
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "last_instansi_id": effective_instansi_id,
                        "last_induk_unit_kerja_id": user["induk_unit_kerja_ids"][0],
                        "updated_at": datetime.utcnow()
                    }}
                )
                # Skip further processing
                updated_user = await db.users.find_one({"username": current_user["username"]})
                updated_user["id"] = str(updated_user["_id"])
                return UserResponse(**updated_user)
            
            # First try to find units with parent_id = None (top-level units)
            first_unit = await db.induk_unit_kerja.find_one({
                "id_instansi": effective_instansi_id,
                "parent_id": None
            })
            
            # If no top-level unit found, try any unit for this institution
            if not first_unit:
                first_unit = await db.induk_unit_kerja.find_one({
                    "id_instansi": effective_instansi_id
                })
            
            if first_unit:
                # For non-SUPER_ADMIN users, check if they have access to this unit
                if is_locked_to_instansi and user.get("induk_unit_kerja_ids"):
                    unit_id_str = str(first_unit["_id"])
                    if unit_id_str not in user.get("induk_unit_kerja_ids", []):
                        # They don't have access to this unit, don't update
                        updated_user = await db.users.find_one({"username": current_user["username"]})
                        updated_user["id"] = str(updated_user["_id"])
                        return UserResponse(**updated_user)
                
                # Work unit found, update user preferences
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "last_instansi_id": effective_instansi_id,
                        "last_induk_unit_kerja_id": str(first_unit["_id"]),
                        "updated_at": datetime.utcnow()
                    }}
                )
        except Exception as e:
            # If finding a work unit fails, continue without updating
            pass
    
    # Return updated user data
    updated_user = await db.users.find_one({"username": current_user["username"]})
    updated_user["id"] = str(updated_user["_id"])
    
    return UserResponse(**updated_user)

@router.get("/me/debug", response_model=dict)
async def get_current_user_debug(current_user: dict = Depends(get_current_user)):
    """Debug endpoint to check user assignments and permissions"""
    db = await Database.get_db()
    
    # Get the full user
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    
    # Get instansi info if assigned
    instansi_info = None
    if user.get("instansi_id"):
        instansi = await db.instansi.find_one({"_id": ObjectId(user["instansi_id"])})
        if instansi:
            instansi_info = {
                "id": str(instansi["_id"]),
                "nama_instansi": instansi["nama_instansi"],
                "kode_instansi": instansi["kode_instansi"]
            }
    
    # Get induk unit kerja info if assigned
    induk_units_info = []
    for unit_id in user.get("induk_unit_kerja_ids", []):
        try:
            unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(unit_id)})
            if unit:
                induk_units_info.append({
                    "id": str(unit["_id"]),
                    "nama_induk_unit": unit["nama_induk_unit"],
                    "id_instansi": unit["id_instansi"]
                })
        except:
            induk_units_info.append({
                "id": unit_id,
                "error": "Invalid unit ID or not found"
            })
    
    # Include last selected preferences
    last_preferences = {
        "last_instansi_id": user.get("last_instansi_id"),
        "last_induk_unit_kerja_id": user.get("last_induk_unit_kerja_id")
    }
    
    # Include API access
    api_access = {
        "induk_unit_kerja_access": [],
        "struktur_organisasi_access": []
    }
    
    # Check access to both APIs if an instansi is assigned
    if user.get("instansi_id"):
        try:
            # Check access to induk-unit-kerja endpoint
            res = await db.induk_unit_kerja.find({"id_instansi": user["instansi_id"]}).to_list(10)
            api_access["induk_unit_kerja_access"] = [str(unit["_id"]) for unit in res]
        except Exception as e:
            api_access["induk_unit_kerja_error"] = str(e)
            
        try:
            # Check access to struktur-organisasi endpoint
            structs = await db.struktur_organisasi.find({"id_instansi": user["instansi_id"]}).to_list(10)
            api_access["struktur_organisasi_access"] = [str(struct["_id"]) for struct in structs]
        except Exception as e:
            api_access["struktur_organisasi_error"] = str(e)
    
    return {
        "id": user_id,
        "username": user["username"],
        "role": user["role"],
        "assigned_instansi": instansi_info,
        "assigned_induk_units": induk_units_info,
        "last_preferences": last_preferences,
        "api_access": api_access
    }

@router.put("/me", response_model=UserResponse)
async def update_self(
    user_data: UserSelfUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's own profile information.
    
    Regular users can update their basic profile information like:
    - First name
    - Last name
    - Email
    
    Note: To change password, use the /me/change-password endpoint.
    """
    db = await Database.get_db()
    
    # Get user's ID
    user_id = current_user["id"]
    
    # Check if user exists
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Prepare update data
    update_data = user_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No valid data provided for update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Get updated user
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    updated["id"] = str(updated["_id"])
    
    # Get instansi name if instansi_id exists
    if updated.get("instansi_id"):
        try:
            instansi = await db.instansi.find_one({"_id": ObjectId(updated["instansi_id"])})
            if instansi:
                updated["nama_instansi"] = instansi.get("nama_instansi")
        except Exception as e:
            # If there's an error getting instansi, continue without it
            pass
    
    return UserResponse(**updated)

@router.post("/update-profile", response_model=UserResponse)
async def update_profile(
    user_data: UserSelfUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Alternative endpoint to update current user's own profile information.
    
    Regular users can update their basic profile information like:
    - First name
    - Last name
    - Email
    
    Note: To change password, use the /me/change-password endpoint.
    """
    db = await Database.get_db()
    
    # Get user's ID
    user_id = current_user["id"]
    
    # Check if user exists
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Prepare update data
    update_data = user_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No valid data provided for update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Get updated user
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    updated["id"] = str(updated["_id"])
    
    # Get instansi name if instansi_id exists
    if updated.get("instansi_id"):
        try:
            instansi = await db.instansi.find_one({"_id": ObjectId(updated["instansi_id"])})
            if instansi:
                updated["nama_instansi"] = instansi.get("nama_instansi")
        except Exception as e:
            # If there's an error getting instansi, continue without it
            pass
    
    return UserResponse(**updated)

@router.post("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Change the current user's password.
    
    Requires:
    - Current password for verification
    - New password
    - Confirmation of new password
    
    Returns:
    - 200 OK if password was changed successfully
    - 400 Bad Request if passwords don't match or current password is incorrect
    """
    db = await Database.get_db()
    
    # Get user's ID
    user_id = current_user["id"]
    
    # Check if user exists and verify current password
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Check if new password and confirm password match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New password and confirmation do not match"
        )
    
    # Hash new password
    hashed_password = get_password_hash(password_data.new_password)
    
    # Update password
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "password": hashed_password,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password changed successfully"} 