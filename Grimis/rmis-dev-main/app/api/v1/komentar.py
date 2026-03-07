from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import Field

from app.schemas.comment import (
    KomentarCreate,
    KomentarUpdate,
    KomentarResponse,
    KomentarReply,
    KomentarStatus,
    KomentarStatusUpdate,
    TipeKomentar
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=KomentarResponse, status_code=status.HTTP_201_CREATED)
async def create_komentar(
    komentar: KomentarCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Buat komentar baru.

    Parameters:
    - **tipe_komentar**: Tipe komentar (IDENTIFIKASI/ANALISIS/EVALUASI/RTP)
    - **ref_id**: ID referensi sesuai tipe komentar
    - **konten**: Isi komentar
    - **parent_id**: ID komentar induk (opsional, untuk balasan)
    - **tahun**: Tahun identifikasi risiko
    - **status**: Status komentar (OPEN/CLOSED), default: OPEN
    - **metadata**: Metadata tambahan (opsional, untuk informasi tambahan seperti tipe analisis)

    Notes:
    - Hanya PENGAWAS_INTERN dan UNIT_MANAJEMEN_RISIKO yang dapat membuat komentar utama
    - PEGAWAI hanya dapat melihat komentar, tidak dapat membuat komentar atau balasan
    - Balasan hanya dapat dibuat hingga kedalaman maksimal 2 level
    - Komentar dengan status CLOSED tidak dapat dibalas
    """
    db = await Database.get_db()
    now = datetime.utcnow()

    # Check if this is a reply (has parent_id)
    is_reply = komentar.parent_id is not None
    
    # Role-based permission check
    if is_reply:
        # For replies, PEGAWAI cannot reply
        if current_user["role"] == UserRole.PEGAWAI:
            raise HTTPException(
                status_code=403,
                detail="PEGAWAI role cannot create comments or replies"
            )
            
        # Check parent comment exists and get its depth
        parent_comment = await db.komentar.find_one({"_id": ObjectId(komentar.parent_id)})
        if not parent_comment:
            raise HTTPException(
                status_code=404,
                detail="Parent comment not found"
            )
            
        # Check if parent comment is closed
        if parent_comment.get("status") == KomentarStatus.CLOSED:
            raise HTTPException(
                status_code=403,
                detail="Cannot reply to a closed comment"
            )
            
        # Check reply depth limit
        if parent_comment.get("depth", 0) >= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot reply to a reply (maximum depth is 2 levels)"
            )
            
        # Set depth for this reply
        komentar.depth = parent_comment.get("depth", 0) + 1
        
        # Inherit reference ID and type from parent
        ref_id = parent_comment["ref_id"]
        tipe_komentar = parent_comment["tipe_komentar"]
        
        # Get tahun from parent comment
        komentar.tahun = parent_comment.get("tahun")
    else:
        # For top-level comments, only PENGAWAS_INTERN and UNIT_MANAJEMEN_RISIKO can create
        if current_user["role"] not in [UserRole.PENGAWAS_INTERN, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=403,
                detail="Only PENGAWAS_INTERN and UNIT_MANAJEMEN_RISIKO can create top-level comments"
            )
        
        # Set depth for top-level comment
        komentar.depth = 0
        ref_id = komentar.ref_id
        tipe_komentar = komentar.tipe_komentar

    # Validate reference exists based on tipe_komentar
    if tipe_komentar == TipeKomentar.IDENTIFIKASI:
        reference = await db.identifikasi_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "identifikasi_risiko"
        ref_field = "id_identifikasi_risiko"
        
        # Get tahun from identifikasi_risiko if not provided
        if not komentar.tahun and reference:
            komentar.tahun = reference.get("tahun")
            
    elif tipe_komentar == TipeKomentar.ANALISIS:
        reference = await db.analisis_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "analisis_risiko"
        ref_field = "id_analisis_risiko"
        
        # Get tahun from analisis_risiko if not provided
        if not komentar.tahun and reference:
            komentar.tahun = reference.get("tahun")
            
    elif tipe_komentar == TipeKomentar.EVALUASI:
        reference = await db.evaluasi_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "evaluasi_risiko"
        ref_field = "id_evaluasi_risiko"
        
        # For evaluasi, get tahun from associated identifikasi_risiko
        if reference and not komentar.tahun:
            identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(reference.get("identifikasi_risiko_id"))})
            if identifikasi:
                komentar.tahun = identifikasi.get("tahun")
                
        # Handle case where id_instansi is missing in evaluasi risiko
        if reference and ("id_instansi" not in reference or not reference.get("id_instansi")):
            try:
                # Try to get id_instansi from related identifikasi_risiko
                identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(reference.get("identifikasi_risiko_id"))})
                if identifikasi and "id_instansi" in identifikasi:
                    reference["id_instansi"] = identifikasi["id_instansi"]
            except Exception as e:
                print(f"Error getting id_instansi for evaluasi in get_komentar: {str(e)}")
                # If all else fails, use current user's instansi
                reference["id_instansi"] = current_user.get("instansi_id", "unknown")
    
    elif tipe_komentar == TipeKomentar.RTP:
        reference = await db.rtp.find_one({"_id": ObjectId(ref_id)})
        collection_name = "rtp"
        ref_field = "id_rtp"
        
        # For RTP, get id_instansi and tahun from associated evaluasi_risiko
        if reference:
            evaluasi = await db.evaluasi_risiko.find_one({"_id": ObjectId(reference["evaluasi_risiko_id"])})
            if evaluasi:
                reference["id_instansi"] = evaluasi["id_instansi"]
                identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(evaluasi.get("identifikasi_risiko_id"))})
                if identifikasi and not komentar.tahun:
                    komentar.tahun = identifikasi.get("tahun")
    
    if not reference:
        raise HTTPException(
            status_code=404,
            detail=f"Referenced {tipe_komentar.lower()} not found"
        )
    
    # Ensure id_instansi exists
    if "id_instansi" not in reference:
        raise HTTPException(
            status_code=500,
            detail="Could not determine institution ID for this item"
        )
        
    # Validate user has access to this instansi
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find(
            {"id_instansi": reference["id_instansi"]}
        ):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur:
            raise HTTPException(
                status_code=403,
                detail="You can only comment on items from your assigned institution"
            )

    # Prepare comment data
    komentar_dict = {
        "ref_id": ref_id,
        "tipe_komentar": tipe_komentar,
        "konten": komentar.konten,
        "id_instansi": reference["id_instansi"],
        "user_id": str(current_user["id"]),
        "nama_user": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
        "created_at": now,
        "depth": komentar.depth,
        "tahun": komentar.tahun,
        "status": komentar.status,
        ref_field: ref_id,  # Add specific reference field
        # Add compatibility fields for frontend
        "text": komentar.konten,
        "type": tipe_komentar
    }
    
    # Add parent_id if this is a reply
    if is_reply:
        komentar_dict["parent_id"] = komentar.parent_id
        
    # Handle metadata if provided (for analysis risk level type, etc.)
    if hasattr(komentar, 'metadata') and komentar.metadata:
        komentar_dict["metadata"] = komentar.metadata

    # Insert comment
    result = await db.komentar.insert_one(komentar_dict)
    created = await db.komentar.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])

    # If this is a top-level comment, update reference document with the new comment
    if not is_reply:
        await db[collection_name].update_one(
            {"_id": ObjectId(ref_id)},
            {"$push": {"comments": created["id"]}}
        )

    return KomentarResponse(**created)

@router.post("/reply", response_model=KomentarResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    reply: KomentarReply,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a reply to an existing comment.
    
    Parameters:
    - **konten**: Content of the reply
    - **parent_id**: ID of the parent comment
    
    Notes:
    - PEGAWAI role cannot create replies
    - Maximum reply depth is 2 levels
    - Cannot reply to closed comments
    """
    db = await Database.get_db()
    
    # Check if PEGAWAI (read-only)
    if current_user["role"] == UserRole.PEGAWAI:
        raise HTTPException(
            status_code=403,
            detail="PEGAWAI role cannot create replies"
        )
    
    # Get parent comment
    parent_comment = await db.komentar.find_one({"_id": ObjectId(reply.parent_id)})
    if not parent_comment:
        raise HTTPException(
            status_code=404,
            detail="Parent comment not found"
        )
    
    # Check if parent comment is closed
    if parent_comment.get("status") == KomentarStatus.CLOSED:
        raise HTTPException(
            status_code=403,
            detail="Cannot reply to a closed comment"
        )
    
    # Check reply depth
    if parent_comment.get("depth", 0) >= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot reply to a reply (maximum depth is 2 levels)"
        )
    
    # Create reply with parent's reference data
    komentar = KomentarCreate(
        tipe_komentar=parent_comment["tipe_komentar"],
        ref_id=parent_comment["ref_id"],
        konten=reply.konten,
        parent_id=reply.parent_id,
        depth=parent_comment.get("depth", 0) + 1,
        tahun=parent_comment.get("tahun"),
        status=KomentarStatus.OPEN  # Replies are always open initially
    )
    
    # Use the create_komentar function to create the reply
    return await create_komentar(komentar, current_user)

@router.put("/{komentar_id}/status", response_model=KomentarResponse)
async def update_komentar_status(
    komentar_id: str,
    status_update: KomentarStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update comment status (open/closed).
    
    Parameters:
    - **status**: New status (OPEN/CLOSED)
    
    Notes:
    - Only PENGAWAS_INTERN, UNIT_MANAJEMEN_RISIKO, and SUPER_ADMIN can change comment status
    - Closed comments cannot be replied to
    """
    db = await Database.get_db()
    
    # Check if user has permission to change status
    if current_user["role"] not in [UserRole.PENGAWAS_INTERN, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only PENGAWAS_INTERN, UNIT_MANAJEMEN_RISIKO, and SUPER_ADMIN can change comment status"
        )
    
    # Get comment
    existing = await db.komentar.find_one({"_id": ObjectId(komentar_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )
    
    # Prepare update data
    now = datetime.utcnow()
    update_data = {
        "status": status_update.status,
        "updated_at": now
    }
    
    # If closing the comment, add closure information
    if status_update.status == KomentarStatus.CLOSED:
        update_data["closed_at"] = now
        update_data["closed_by"] = str(current_user["id"])
        update_data["closed_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
    else:
        # If reopening, remove closure information
        update_data["closed_at"] = None
        update_data["closed_by"] = None
        update_data["closed_by_name"] = None
    
    # Update comment
    await db.komentar.update_one(
        {"_id": ObjectId(komentar_id)},
        {"$set": update_data}
    )
    
    # Get updated comment
    updated = await db.komentar.find_one({"_id": ObjectId(komentar_id)})
    updated["id"] = komentar_id
    
    # Get replies for this comment if it's a top-level comment
    if updated.get("depth", 0) == 0:
        replies = []
        async for reply in db.komentar.find({"parent_id": komentar_id}).sort("created_at", 1):
            reply["id"] = str(reply["_id"])
            replies.append(reply)
        updated["replies"] = replies
    else:
        updated["replies"] = []
    
    return KomentarResponse(**updated)

@router.get("/{ref_id}", response_model=List[KomentarResponse])
async def get_komentar(
    ref_id: str,
    tipe_komentar: TipeKomentar,
    tahun: Optional[int] = Query(None, description="Filter by year"),
    status: Optional[KomentarStatus] = Query(None, description="Filter by status (OPEN/CLOSED)"),
    metadata: Optional[str] = Query(None, description="Filter by metadata (e.g. analysis_type)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comments for a reference ID.

    Parameters:
    - **ref_id**: ID of the reference (identifikasi/analisis/evaluasi/rtp)
    - **tipe_komentar**: Type of comment to fetch
    - **tahun**: Optional year filter
    - **status**: Optional status filter (OPEN/CLOSED)
    - **metadata**: Optional metadata filter (e.g. analysis_type=inherent)
    """
    db = await Database.get_db()

    # Get reference to validate access
    if tipe_komentar == TipeKomentar.IDENTIFIKASI:
        reference = await db.identifikasi_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "identifikasi_risiko"
        ref_field = "id_identifikasi_risiko"
    elif tipe_komentar == TipeKomentar.ANALISIS:
        reference = await db.analisis_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "analisis_risiko"
        ref_field = "id_analisis_risiko"
    elif tipe_komentar == TipeKomentar.EVALUASI:
        reference = await db.evaluasi_risiko.find_one({"_id": ObjectId(ref_id)})
        collection_name = "evaluasi_risiko"
        ref_field = "id_evaluasi_risiko"
    elif tipe_komentar == TipeKomentar.RTP:
        reference = await db.rtp.find_one({"_id": ObjectId(ref_id)})
        collection_name = "rtp"
        ref_field = "id_rtp"

    if not reference:
        raise HTTPException(
            status_code=404,
            detail=f"Referenced {tipe_komentar.lower()} not found"
        )

    # Validate user has access to this instansi
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": reference["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur:
            raise HTTPException(
                status_code=403,
                detail="You can only view comments from your assigned institution"
            )

    # Build query with optional year filter
    query = {
        "$and": [
            {"$or": [
                {"ref_id": ref_id},
                {ref_field: ref_id}
            ]},
            {"tipe_komentar": tipe_komentar},
            {"depth": 0}  # Only get top-level comments
        ]
    }
    
    # Add year filter if provided
    if tahun:
        query["$and"].append({"tahun": tahun})
    
    # Add status filter if provided
    if status:
        query["$and"].append({"status": status})
        
    # Add metadata filter if provided
    if metadata:
        try:
            # Parse metadata filter (format: key=value)
            key, value = metadata.split('=', 1)
            query["$and"].append({f"metadata.{key}": value})
        except ValueError:
            # If metadata is not in key=value format, ignore it
            pass

    # Get all top-level comments
    comments = []
    comment_dict = {}  # To store comments by ID for organizing replies
    
    async for comment in db.komentar.find(query).sort("created_at", 1):
        # Convert ObjectId to string
        comment["id"] = str(comment["_id"])
        
        # Ensure text and type fields are set
        if "text" not in comment:
            comment["text"] = comment.get("konten", "")
        if "type" not in comment:
            comment["type"] = comment.get("tipe_komentar", "IDENTIFIKASI")
            
        comment_dict[comment["id"]] = comment
        comment["replies"] = []
        comments.append(comment)
    
    # Get all replies
    replies_query = {
        "$and": [
            {"$or": [
                {"ref_id": ref_id},
                {ref_field: ref_id}
            ]},
            {"tipe_komentar": tipe_komentar},
            {"depth": {"$gt": 0}},  # Only get replies
            {"parent_id": {"$exists": True}}
        ]
    }
    
    # Add year filter to replies query if provided
    if tahun:
        replies_query["$and"].append({"tahun": tahun})
    
    # Process replies
    async for reply in db.komentar.find(replies_query).sort("created_at", 1):
        reply["id"] = str(reply["_id"])
        
        # Ensure text and type fields are set for replies too
        if "text" not in reply:
            reply["text"] = reply.get("konten", "")
        if "type" not in reply:
            reply["type"] = reply.get("tipe_komentar", "IDENTIFIKASI")
            
        parent_id = reply.get("parent_id")
        
        # Add reply to its parent
        if parent_id in comment_dict:
            comment_dict[parent_id]["replies"].append(reply)
    
    # Return only top-level comments (replies are nested)
    return [KomentarResponse(**comment) for comment in comments]

@router.put("/{komentar_id}", response_model=KomentarResponse)
async def update_komentar(
    komentar_id: str,
    komentar: KomentarUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a comment"""
    db = await Database.get_db()

    existing = await db.komentar.find_one({"_id": ObjectId(komentar_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    # Only comment owner can update
    if str(existing["user_id"]) != str(current_user["id"]):
        raise HTTPException(
            status_code=403,
            detail="You can only update your own comments"
        )
    
    # Check if comment is closed
    if existing.get("status") == KomentarStatus.CLOSED:
        raise HTTPException(
            status_code=403,
            detail="Cannot update a closed comment"
        )

    update_data = komentar.dict()
    update_data["updated_at"] = datetime.utcnow()

    await db.komentar.update_one(
        {"_id": ObjectId(komentar_id)},
        {"$set": update_data}
    )

    updated = await db.komentar.find_one({"_id": ObjectId(komentar_id)})
    updated["id"] = komentar_id

    # Get replies for this comment if it's a top-level comment
    if updated.get("depth", 0) == 0:
        replies = []
        async for reply in db.komentar.find({"parent_id": komentar_id}).sort("created_at", 1):
            reply["id"] = str(reply["_id"])
            replies.append(reply)
        updated["replies"] = replies
    else:
        updated["replies"] = []

    return KomentarResponse(**updated)

@router.delete("/{komentar_id}")
async def delete_komentar(
    komentar_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a comment"""
    db = await Database.get_db()

    existing = await db.komentar.find_one({"_id": ObjectId(komentar_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    # Only comment owner or SUPER_ADMIN can delete
    if str(existing["user_id"]) != str(current_user["id"]) and current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments"
        )

    # If this is a top-level comment, also delete all replies
    if existing.get("depth", 0) == 0:
        await db.komentar.delete_many({"parent_id": komentar_id})
    
    # Delete the comment itself
    result = await db.komentar.delete_one({"_id": ObjectId(komentar_id)})
    return {"message": "Comment deleted successfully"} 