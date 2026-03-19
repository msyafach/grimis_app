from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    KonteksCreate,
    KonteksUpdate,
    KonteksResponse,
    ApprovalStatus
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=KonteksResponse)
async def create_konteks(
    konteks: KonteksCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new context.

    Parameters:
    - kode (str): Unique code for the context
    - nama (str): Name of the context
    - id_jenis_konteks (str): Context type ID
    - id_instansi (str): Institution ID

    Notes:
    - Context type must be either SASARAN or PROBIS
    - Only SASARAN contexts can have indicators
    """
    if current_user["role"] not in [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_KLP,
        UserRole.PEMILIK_RISIKO,
        UserRole.PENGELOLA_RISIKO
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN, ADMIN_KLP, PEMILIK_RISIKO, and PENGELOLA_RISIKO can create contexts"
        )

    db = await Database.get_db()

    # Check if code already exists for this institution
    existing = await db.konteks.find_one({
        "kode": konteks.kode,
        "id_instansi": konteks.id_instansi
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Code already exists for this institution"
        )

    # Get struktur to validate jenis_konteks
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": konteks.id_instansi,
        "jenis_konteks.id": konteks.id_jenis_konteks
    })
    if not struktur:
        raise HTTPException(
            status_code=404,
            detail="Context type not found in organization structure"
        )

    # Get jenis_konteks details
    jenis_konteks = next(
        (jk for jk in struktur["jenis_konteks"] if jk["id"] == konteks.id_jenis_konteks),
        None
    )
    if not jenis_konteks:
        raise HTTPException(
            status_code=404,
            detail="Context type not found"
        )

    # Get induk_unit_kerja details for nama_klp
    induk_unit = await db.induk_unit_kerja.find_one({
        "_id": ObjectId(struktur["id_induk_unit_kerja"])
    })
    if not induk_unit:
        raise HTTPException(
            status_code=404,
            detail="Parent work unit not found"
        )

    # Validate user has access to this KLP
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        assigned_struktur = None
        async for struktur_organisasi in db.struktur_organisasi.find({"id_instansi": konteks.id_instansi}):
            for assigned_user in struktur_organisasi.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur_organisasi
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != str(struktur["id_induk_unit_kerja"]):
            raise HTTPException(
                status_code=403,
                detail="You can only create contexts for your assigned KLP"
            )

    konteks_dict = konteks.dict()
    konteks_dict["created_at"] = datetime.utcnow()
    konteks_dict["jenis_konteks"] = jenis_konteks["jenis"]
    konteks_dict["nama_jenis_konteks"] = jenis_konteks["nama"]
    konteks_dict["nama_klp"] = induk_unit["nama_induk_unit"]
    konteks_dict["is_disabled"] = False  # Default to enabled

    # Set status_approval based on user role
    if current_user["role"] in [UserRole.PEMILIK_RISIKO, UserRole.PENGELOLA_RISIKO]:
        konteks_dict["status_approval"] = konteks.status_approval or ApprovalStatus.MENUNGGU_VERIFIKASI
    else:
        # Admin creates are auto-approved
        konteks_dict["status_approval"] = konteks.status_approval or ApprovalStatus.TERVERIFIKASI

    result = await db.konteks.insert_one(konteks_dict)
    created = await db.konteks.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))

    return KonteksResponse(**created)

@router.get("", response_model=List[KonteksResponse])
async def get_konteks(
    id_instansi: str = Query(..., description="Institution ID"),
    jenis: Optional[str] = Query(None, description="Filter by context type (SASARAN/PROBIS)"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent work unit ID to filter contexts"),
    search: Optional[str] = None,
    is_disabled: Optional[bool] = Query(None, description="Filter SASARAN contexts by disabled status"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of contexts.

    Parameters:
    - id_instansi (str): Institution ID to filter contexts
    - jenis (str, optional): Filter by context type (SASARAN/PROBIS)
    - id_induk_unit_kerja (str, optional): Parent work unit ID to filter contexts
    - search (str, optional): Search text to filter by code or name
    - is_disabled (bool, optional): Filter SASARAN contexts by disabled status
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
            detail="Only authorized roles can view contexts"
        )
        
    db = await Database.get_db()

    # Base query
    query = {"id_instansi": id_instansi}
    
    # Add type filter if provided
    if jenis:
        if jenis not in ["SASARAN", "PROBIS"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid context type. Must be SASARAN or PROBIS"
            )
        query["jenis_konteks"] = jenis
    
    # Add parent work unit filter if provided
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Add search filter if provided
    if search:
        query["$or"] = [
            {"kode": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}}
        ]
    
    # Add disabled filter if provided (only for SASARAN contexts)
    if is_disabled is not None and (jenis == "SASARAN" or not jenis):
        query["$or"] = query.get("$or", [])
        if is_disabled:
            # If looking for disabled contexts
            query["$or"].append({"is_disabled": True})
        else:
            # If looking for enabled contexts, include both False and missing is_disabled field
            query["$or"].append({"is_disabled": False})
            query["$or"].append({"is_disabled": {"$exists": False}})
        
        # If we have no other $or conditions, we need to ensure the $or array is not empty
        if len(query["$or"]) == 1:
            if is_disabled:
                query = {"id_instansi": id_instansi, "is_disabled": True}
                if jenis:
                    query["jenis_konteks"] = jenis
                if id_induk_unit_kerja:
                    query["id_induk_unit_kerja"] = id_induk_unit_kerja
            else:
                query["$or"] = [{"is_disabled": False}, {"is_disabled": {"$exists": False}}]
    
    # Get contexts
    contexts = []
    async for konteks in db.konteks.find(query).sort("kode", 1):
        konteks["id"] = str(konteks["_id"])
        
        # Get total indicators if SASARAN type
        if konteks["jenis_konteks"] == "SASARAN":
            total = await db.indikator.count_documents({"id_konteks": str(konteks["_id"])})
            konteks["total_indikator"] = total
        
        # Ensure is_disabled field exists and defaults to False if not present
        if "is_disabled" not in konteks:
            konteks["is_disabled"] = False
        
        contexts.append(KonteksResponse(**konteks))
    
    return contexts

@router.get("/{konteks_id}", response_model=KonteksResponse)
async def get_konteks_by_id(
    konteks_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific context by its ID.
    
    Parameters:
    - konteks_id (str): ID of the context to retrieve
    
    Returns:
    - KonteksResponse: The requested context
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
            detail="Only authorized roles can view contexts"
        )
        
    db = await Database.get_db()
    
    konteks = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    if not konteks:
        raise HTTPException(status_code=404, detail="Context not found")
    
    # Add ID in the expected format
    konteks["id"] = str(konteks["_id"])
    
    # Get total indicators if SASARAN type
    if konteks["jenis_konteks"] == "SASARAN":
        total = await db.indikator.count_documents({"id_konteks": konteks_id})
        konteks["total_indikator"] = total
    
    return KonteksResponse(**konteks)

@router.put("/{konteks_id}", response_model=KonteksResponse)
async def update_konteks(
    konteks_id: str,
    konteks: KonteksUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a context.

    Parameters:
    - konteks_id (str): ID of context to update
    - nama (str, optional): New name for the context
    - id_jenis_konteks (str, optional): New context type ID
    - is_disabled (bool, optional): Whether the context is disabled (only for SASARAN)

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can update contexts
    - ADMIN_KLP can only update their assigned KLP contexts
    - When changing context type, it must be the same type (SASARAN/PROBIS)
    - Disabled SASARAN contexts cannot be used for risk identification
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can update contexts"
        )

    db = await Database.get_db()
    
    existing = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Context not found"
        )

    update_data = konteks.dict(exclude_unset=True)

    # If changing jenis_konteks
    if konteks.id_jenis_konteks:
        # Look for context type in struktur_organisasi instead of jenis_konteks collection
        struktur = await db.struktur_organisasi.find_one({
            "id_instansi": existing["id_instansi"],
            "jenis_konteks.id": konteks.id_jenis_konteks
        })
        
        if not struktur:
            raise HTTPException(
                status_code=404,
                detail="New context type not found in organization structure"
            )

        # Get jenis_konteks details
        jenis_konteks = next(
            (jk for jk in struktur["jenis_konteks"] if jk["id"] == konteks.id_jenis_konteks),
            None
        )
        
        if not jenis_konteks:
            raise HTTPException(
                status_code=404,
                detail="New context type not found"
            )

        # Validate same type (SASARAN/PROBIS)
        if jenis_konteks["jenis"] != existing["jenis_konteks"]:
            raise HTTPException(
                status_code=400,
                detail="Cannot change context between SASARAN and PROBIS types"
            )

        # Get induk_unit_kerja details for nama_klp
        induk_unit = await db.induk_unit_kerja.find_one({
            "_id": ObjectId(struktur["id_induk_unit_kerja"])
        })
        if not induk_unit:
            raise HTTPException(
                status_code=404,
                detail="Parent work unit not found"
            )

        # Update nama_klp and jenis_konteks
        update_data["nama_klp"] = induk_unit["nama_induk_unit"]
        update_data["jenis_konteks"] = jenis_konteks["jenis"]
        update_data["nama_jenis_konteks"] = jenis_konteks["nama"]

    # Validate is_disabled only applies to SASARAN contexts
    if konteks.is_disabled is not None and existing["jenis_konteks"] != "SASARAN":
        raise HTTPException(
            status_code=400,
            detail="Only SASARAN contexts can be disabled"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur_organisasi in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur_organisasi.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur_organisasi
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != existing["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update contexts for your assigned KLP"
            )

    update_data["updated_at"] = datetime.utcnow()

    await db.konteks.update_one(
        {"_id": ObjectId(konteks_id)},
        {"$set": update_data}
    )

    updated = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    updated["id"] = konteks_id
    updated["total_indikator"] = await db.indikator.count_documents({
        "id_konteks": konteks_id
    }) if updated["jenis_konteks"] == "SASARAN" else 0
    
    # Ensure is_disabled field exists
    if "is_disabled" not in updated:
        updated["is_disabled"] = False

    return KonteksResponse(**updated)

@router.delete("/{konteks_id}")
async def delete_konteks(
    konteks_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a context.

    Parameters:
    - konteks_id (str): ID of context to delete

    Notes:
    - Both SUPER_ADMIN and ADMIN_KLP can delete contexts
    - ADMIN_KLP can only delete their assigned KLP contexts
    - Deleting a context will also delete all its indicators
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can delete contexts"
        )

    db = await Database.get_db()

    konteks = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    if not konteks:
        raise HTTPException(
            status_code=404,
            detail="Context not found"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur_organisasi in db.struktur_organisasi.find({"id_instansi": konteks["id_instansi"]}):
            for assigned_user in struktur_organisasi.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur_organisasi
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete contexts for your assigned KLP"
            )

    # Delete all indicators first
    if konteks["jenis_konteks"] == "SASARAN":
        await db.indikator.delete_many({"id_konteks": konteks_id})

    # Then delete the context
    result = await db.konteks.delete_one({"_id": ObjectId(konteks_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Context not found"
        )

    return {"message": "Context and its indicators deleted successfully"}


@router.post("/{konteks_id}/approve")
async def approve_konteks(
    konteks_id: str,
    status_approval: ApprovalStatus,
    catatan: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Approve or reject a context proposal.

    Parameters:
    - konteks_id (str): ID of the context proposal
    - status_approval (ApprovalStatus): Approval status (TERVERIFIKASI, GAGAL_VERIFIKASI, DISETUJUI_DENGAN_PENYESUAIAN)
    - catatan (str, optional): Notes for the approval

    Notes:
    - Only SUPER_ADMIN and ADMIN_KLP can approve proposals
    - MENUNGGU_VERIFIKASI status cannot be set here (it's the default for new proposals)
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and ADMIN_KLP can approve context proposals"
        )

    # Prevent setting MENUNGGU_VERIFIKASI via approval endpoint
    if status_approval == ApprovalStatus.MENUNGGU_VERIFIKASI:
        raise HTTPException(
            status_code=400,
            detail="Cannot set status to MENUNGGU_VERIFIKASI via approval endpoint"
        )

    db = await Database.get_db()

    konteks = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    if not konteks:
        raise HTTPException(
            status_code=404,
            detail="Context proposal not found"
        )

    update_data = {
        "status_approval": status_approval,
        "updated_at": datetime.utcnow()
    }

    if catatan:
        update_data["catatan_approval"] = catatan

    await db.konteks.update_one(
        {"_id": ObjectId(konteks_id)},
        {"$set": update_data}
    )

    updated = await db.konteks.find_one({"_id": ObjectId(konteks_id)})
    updated["id"] = str(updated["_id"])

    # Get jenis_konteks details
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": updated["id_instansi"],
        "jenis_konteks.id": updated["id_jenis_konteks"]
    })
    if struktur:
        jenis_konteks = next(
            (jk for jk in struktur["jenis_konteks"] if jk["id"] == updated["id_jenis_konteks"]),
            None
        )
        if jenis_konteks:
            updated["nama_jenis_konteks"] = jenis_konteks["nama"]

    # Get induk_unit_kerja details for nama_klp
    induk_unit = await db.induk_unit_kerja.find_one({
        "_id": ObjectId(struktur["id_induk_unit_kerja"]) if struktur else None
    })
    if induk_unit:
        updated["nama_klp"] = induk_unit["nama_induk_unit"]

    # Get total indicators if SASARAN type
    if updated["jenis_konteks"] == "SASARAN":
        updated["total_indikator"] = await db.indikator.count_documents({"id_konteks": konteks_id})

    return KonteksResponse(**updated) 