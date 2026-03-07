from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.schemas.organization import InstansiCreate, InstansiResponse, InstansiUpdate
import os
import base64
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import List, Any
import logging

router = APIRouter()

@router.post("", response_model=InstansiResponse)
async def create_instansi(
    instansi: InstansiCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can create institutions"
        )

    db = await Database.get_db()
    
    if await db.instansi.find_one({"kode_instansi": instansi.kode_instansi}):
        raise HTTPException(
            status_code=400,
            detail="Institution code already exists"
        )

    instansi_dict = instansi.dict()
    instansi_dict["created_at"] = datetime.utcnow()
    
    result = await db.instansi.insert_one(instansi_dict)
    
    created_instansi = await db.instansi.find_one({"_id": result.inserted_id})
    if not created_instansi:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve created institution"
        )
    
    # Convert _id to id and create response
    created_instansi["id"] = str(created_instansi["_id"])
    del created_instansi["_id"]
    
    # Create and validate response model
    response = InstansiResponse(
        id=created_instansi["id"],
        nama_instansi=created_instansi["nama_instansi"],
        kode_instansi=created_instansi["kode_instansi"],
        jenis=created_instansi["jenis"],
        alamat=created_instansi.get("alamat"),
        telepon=created_instansi.get("telepon"),
        email=created_instansi.get("email"),
        created_at=created_instansi["created_at"],
        updated_at=created_instansi.get("updated_at")
    )
    return response

@router.get("", response_model=List[InstansiResponse])
async def get_all_instansi(current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    instansi_list = []
    
    # For SUPER_ADMIN, return all institutions
    if current_user["role"] == UserRole.SUPER_ADMIN:
        async for instansi in db.instansi.find():
            instansi["id"] = str(instansi.pop("_id"))
            instansi_list.append(InstansiResponse(**instansi))
        return instansi_list
    
    # For non-SUPER_ADMIN users, get their assigned instansi
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If the user has an assigned instansi_id, return that institution
    if user.get("instansi_id"):
        instansi = await db.instansi.find_one({"_id": ObjectId(user["instansi_id"])})
        if instansi:
            instansi["id"] = str(instansi.pop("_id"))
            instansi_list.append(InstansiResponse(**instansi))
    
    return instansi_list

@router.get("/{instansi_id}", response_model=InstansiResponse)
async def get_instansi_by_id(
    instansi_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = await Database.get_db()
    
    # Get the full user data to check assigned instansi
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # For non-SUPER_ADMIN users, check if they can access this instansi
    if current_user["role"] != UserRole.SUPER_ADMIN:
        # Non-SUPER_ADMIN users can only access their assigned instansi
        if not user.get("instansi_id") or user.get("instansi_id") != instansi_id:
            # If user is trying to access an instansi that matches their last_instansi_id, allow it
            if not user.get("last_instansi_id") or user.get("last_instansi_id") != instansi_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only access your assigned institution"
                )
    
    instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    if not instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )
    
    instansi["id"] = str(instansi.pop("_id"))
    return InstansiResponse(**instansi)

@router.put("/{instansi_id}", response_model=InstansiResponse)
async def update_instansi(
    instansi_id: str,
    instansi: InstansiUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update institutions"
        )

    db = await Database.get_db()
    
    existing_instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    if not existing_instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )
    
    if instansi.kode_instansi != existing_instansi["kode_instansi"]:
        if await db.instansi.find_one({
            "kode_instansi": instansi.kode_instansi,
            "_id": {"$ne": ObjectId(instansi_id)}
        }):
            raise HTTPException(
                status_code=400,
                detail="Institution code already exists"
            )

    update_data = instansi.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.instansi.update_one(
        {"_id": ObjectId(instansi_id)},
        {"$set": update_data}
    )
    
    updated_instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    updated_instansi["id"] = instansi_id
    
    return InstansiResponse(**updated_instansi)

@router.put("/{instansi_id}/kop-surat", response_model=InstansiResponse)
async def update_kop_surat(
    instansi_id: str,
    kop_surat_baris_1: str = Form(None),
    kop_surat_baris_2: str = Form(None),
    kop_surat_baris_3: str = Form(None),
    kop_surat_alamat: str = Form(None),
    logo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Simpan konfigurasi Kop Surat (Logo Instansi + Baris Kop Surat).
    Logo akan di-encode ke Base64 agar mudah ditempelkan di PDF.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin can update letterhead configurations"
        )

    db = await Database.get_db()
    existing_instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    
    if not existing_instansi:
        raise HTTPException(status_code=404, detail="Institution not found")

    update_data: dict[str, Any] = {
        "updated_at": datetime.utcnow()
    }
    
    if kop_surat_baris_1 is not None: update_data["kop_surat_baris_1"] = kop_surat_baris_1
    if kop_surat_baris_2 is not None: update_data["kop_surat_baris_2"] = kop_surat_baris_2
    if kop_surat_baris_3 is not None: update_data["kop_surat_baris_3"] = kop_surat_baris_3
    if kop_surat_alamat is not None: update_data["kop_surat_alamat"] = kop_surat_alamat

    if logo is not None:
        contents = await logo.read()
        encoded = base64.b64encode(contents).decode("utf-8")
        mime_type = logo.content_type
        # Save as Base64 Data URL for easy embedding in HTML/PDF
        update_data["logo_instansi"] = f"data:{mime_type};base64,{encoded}"

    await db.instansi.update_one(
        {"_id": ObjectId(instansi_id)},
        {"$set": update_data}
    )

    updated_instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    updated_instansi["id"] = str(updated_instansi["_id"])
    return InstansiResponse(**updated_instansi)

@router.delete("/{instansi_id}", response_model=dict)
async def delete_instansi(
    instansi_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete institutions"
        )

    db = await Database.get_db()
    
    existing_instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
    if not existing_instansi:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )
    
    if await db.induk_unit_kerja.find_one({"id_instansi": instansi_id}):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete institution with existing work units"
        )
    
    await db.instansi.delete_one({"_id": ObjectId(instansi_id)})
    
    return {"message": "Institution successfully deleted"} 