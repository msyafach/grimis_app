from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import base64
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import bson.errors

from app.schemas.risk import (
    RTPCreate,
    RTPUpdate,
    RTPResponse,
    RTPVerify,
    KomentarResponse,
    KomentarType,
    RTPResponRisiko,
    AttachmentResponse,
    AttachmentType
)
from app.schemas.user import UserRole
from app.schemas.comment import TipeKomentar
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=RTPResponse)
async def create_rtp(
    rtp: RTPCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new Risk Treatment Plan (RTP).
    """
    db = await Database.get_db()
    
    # Validate evaluasi_risiko exists
    evaluasi = await db.evaluasi_risiko.find_one({
        "_id": ObjectId(rtp.evaluasi_risiko_id)
    })
    if not evaluasi:
        raise HTTPException(
            status_code=404,
            detail="Risk evaluation not found"
        )

    rtp_dict = rtp.dict()
    
    # Ensure target_waktu is a datetime object
    if "target_waktu" in rtp_dict and not isinstance(rtp_dict["target_waktu"], datetime):
        try:
            rtp_dict["target_waktu"] = datetime.fromisoformat(str(rtp_dict["target_waktu"]))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid target_waktu format. Use ISO format (YYYY-MM-DD)."
            )
    
    # Ensure uraian_hambatan is set to None if not provided
    if "uraian_hambatan" not in rtp_dict or rtp_dict["uraian_hambatan"] is None:
        rtp_dict["uraian_hambatan"] = None
    
    # Validate uraian_hambatan can only be set when tanggal_realisasi is provided
    if rtp_dict.get("uraian_hambatan") and not rtp_dict.get("tanggal_realisasi"):
        raise HTTPException(
            status_code=400,
            detail="Cannot set uraian_hambatan without setting tanggal_realisasi first."
        )
    
    rtp_dict["created_at"] = datetime.utcnow()
    rtp_dict["created_by"] = str(current_user["id"])
    rtp_dict["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
    rtp_dict["updated_at"] = None
    rtp_dict["updated_by"] = None
    rtp_dict["status"] = "DRAFT"
    rtp_dict["komentar"] = []
    
    result = await db.rtp.insert_one(rtp_dict)
    rtp_dict["id"] = str(result.inserted_id)
    del rtp_dict["_id"]
    
    return RTPResponse(**rtp_dict)

@router.get("", response_model=List[RTPResponse])
async def get_rtp_list(
    evaluasi_risiko_id: Optional[str] = None,
    respon_risiko: Optional[RTPResponRisiko] = Query(None, description="Filter by response type (REDUCE_IMPACT/REDUCE_FREQUENCY)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of Risk Treatment Plans (RTP).
    
    Parameters:
    - evaluasi_risiko_id: Optional filter by evaluation ID
    - respon_risiko: Optional filter by response type (REDUCE_IMPACT/REDUCE_FREQUENCY)
    """
    db = await Database.get_db()
    
    query = {}
    if evaluasi_risiko_id:
        query["evaluasi_risiko_id"] = evaluasi_risiko_id
    if respon_risiko:
        query["respon_risiko"] = respon_risiko
    
    cursor = db.rtp.find(query)
    rtps = []
    async for rtp in cursor:
        rtp["id"] = str(rtp["_id"])
        del rtp["_id"]
        
        # Get comments
        komentar = []
        async for comment in db.komentar.find({
            "tipe_komentar": TipeKomentar.RTP,
            "$or": [
                {"ref_id": rtp["id"]},
                {"id_rtp": rtp["id"]}
            ]
        }).sort("created_at", 1):
            comment_data = {
                "id": str(comment["_id"]),
                "text": comment.get("konten", ""),  # Map konten to text field
                "type": "RTP",
                "ref_id": rtp["id"],
                "created_at": comment.get("created_at", datetime.utcnow()),
                "created_by": comment.get("user_id"),
                "created_by_name": comment.get("nama_user", ""),
                "updated_at": comment.get("updated_at"),
                "updated_by": comment.get("updated_by")
            }
            komentar.append(KomentarResponse(**comment_data))
        rtp["komentar"] = komentar
        
        # Get attachments
        attachments = []
        async for attachment in db.attachments.find({
            "ref_id": rtp["id"],
            "type": AttachmentType.RTP
        }):
            attachment["id"] = str(attachment["_id"])
            del attachment["_id"]
            attachments.append(AttachmentResponse(**attachment))
        rtp["attachments"] = attachments
        
        rtps.append(RTPResponse(**rtp))
    
    return rtps

@router.put("/{rtp_id}", response_model=RTPResponse)
async def update_rtp(
    rtp_id: str,
    rtp_update: RTPUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a Risk Treatment Plan (RTP).
    """
    db = await Database.get_db()
    
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    update_dict = rtp_update.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    update_dict["updated_by"] = str(current_user["id"])
    
    # Handle tanggal_realisasi field if provided and valid
    if "tanggal_realisasi" in update_dict and update_dict["tanggal_realisasi"]:
        # Ensure it's a valid datetime
        if not isinstance(update_dict["tanggal_realisasi"], datetime):
            try:
                update_dict["tanggal_realisasi"] = datetime.fromisoformat(str(update_dict["tanggal_realisasi"]))
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid tanggal_realisasi format. Use ISO format (YYYY-MM-DD)."
                )
    
    # Validate uraian_hambatan can only be set when tanggal_realisasi is provided
    if "uraian_hambatan" in update_dict and update_dict["uraian_hambatan"]:
        # Check if tanggal_realisasi is being set in this update or already exists
        has_tanggal_realisasi = (
            ("tanggal_realisasi" in update_dict and update_dict["tanggal_realisasi"]) or
            ("tanggal_realisasi" in rtp and rtp["tanggal_realisasi"])
        )
        
        if not has_tanggal_realisasi:
            raise HTTPException(
                status_code=400,
                detail="Cannot set uraian_hambatan without setting tanggal_realisasi first."
            )
    
    # Ensure komentar is always a list
    if "komentar" not in rtp or rtp["komentar"] is None:
        update_dict["komentar"] = []
    
    await db.rtp.update_one(
        {"_id": ObjectId(rtp_id)},
        {"$set": update_dict}
    )
    
    updated_rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    updated_rtp["id"] = str(updated_rtp["_id"])
    del updated_rtp["_id"]
    
    return updated_rtp

@router.post("/{rtp_id}/verify", response_model=RTPResponse)
async def verify_rtp(
    rtp_id: str,
    verify_data: RTPVerify,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify a Risk Treatment Plan (RTP).
    """
    db = await Database.get_db()
    
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    update_dict = {
        "status": verify_data.status,
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"]),
        "verified_at": datetime.utcnow(),
        "verified_by": str(current_user["id"])
    }

    # Handle komentar as a list of KomentarResponse
    if verify_data.komentar:
        new_comment = {
            "id": str(ObjectId()),
            "text": verify_data.komentar,
            "type": KomentarType.RTP,
            "ref_id": rtp_id,
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"]),
            "updated_at": None,
            "updated_by": None
        }
        if "komentar" not in rtp or not rtp["komentar"]:
            update_dict["komentar"] = [new_comment]
        else:
            update_dict["komentar"] = rtp["komentar"] + [new_comment]
    
    await db.rtp.update_one(
        {"_id": ObjectId(rtp_id)},
        {"$set": update_dict}
    )
    
    updated_rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    updated_rtp["id"] = str(updated_rtp["_id"])
    del updated_rtp["_id"]
    
    return updated_rtp

@router.delete("/{rtp_id}", response_model=dict)
async def delete_rtp(
    rtp_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a Risk Treatment Plan (RTP).
    """
    db = await Database.get_db()
    
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    await db.rtp.delete_one({"_id": ObjectId(rtp_id)})
    
    return {"message": "RTP record deleted successfully"}

@router.post("/from-evaluasi/{evaluasi_id}", response_model=RTPResponse)
async def create_rtp_from_evaluasi(
    evaluasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new Risk Treatment Plan (RTP) directly from a risk evaluation,
    automatically using the pengendalian and jenis_pengendalian from the bowtie analysis.
    """
    db = await Database.get_db()
    
    # Get the evaluation
    evaluasi = await db.evaluasi_risiko.find_one({
        "_id": ObjectId(evaluasi_id)
    })
    
    if not evaluasi:
        raise HTTPException(
            status_code=404,
            detail="Risk evaluation not found"
        )
    
    # Check if the evaluation has pengendalian data
    if not evaluasi.get("pengendalian"):
        raise HTTPException(
            status_code=400,
            detail="This evaluation doesn't have a recommended control"
        )
    
    # Create a new RTP based on the evaluation data
    target_date = datetime.utcnow() + timedelta(days=90)  # 3 months from now
    
    rtp_dict = {
        "evaluasi_risiko_id": evaluasi_id,
        "deskripsi": f"Control for {evaluasi.get('jenis', 'risk')} - {evaluasi.get('deskripsi', '')}",
        "rencana_aksi": evaluasi.get("pengendalian", ""),
        "target_waktu": target_date,  # Now using a datetime object
        "pic": "",  # To be filled by the user
        "indikator": "Implementation of control verified",
        "output": "",
        "anggaran": 0.0,  # Default value, to be updated by the user
        "created_at": datetime.utcnow(),
        "created_by": str(current_user["id"]),
        "created_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
        "updated_at": None,
        "updated_by": None,
        "status": "DRAFT",
        "komentar": [],
        "tanggal_realisasi": None,
        "uraian_hambatan": None
    }
    
    # Set the respon_risiko based on jenis_pengendalian
    if evaluasi.get("jenis_pengendalian") == "Mengurangi dampak":
        rtp_dict["respon_risiko"] = "REDUCE_IMPACT"
    else:
        rtp_dict["respon_risiko"] = "REDUCE_FREQUENCY"  # Default for "Mengurangi kemungkinan"
    
    result = await db.rtp.insert_one(rtp_dict)
    rtp_dict["id"] = str(result.inserted_id)
    
    return RTPResponse(**rtp_dict)

@router.post("/bulk-create/identifikasi/{identifikasi_id}")
async def bulk_create_rtp(
    identifikasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Create RTPs for all evaluations associated with a risk identification.
    This will create RTPs based on the pengendalian and jenis_pengendalian fields
    from the bowtie analysis.
    """
    db = await Database.get_db()
    
    # Check if the identification exists
    identifikasi = await db.identifikasi_risiko.find_one({
        "_id": ObjectId(identifikasi_id)
    })
    
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )
    
    # Get all evaluations for this identification
    evaluasi_list = await db.evaluasi_risiko.find({
        "identifikasi_risiko_id": identifikasi_id
    }).to_list(None)
    
    if not evaluasi_list:
        raise HTTPException(
            status_code=404,
            detail="No evaluations found for this risk identification"
        )
    
    # Count created and skipped RTPs
    created_count = 0
    skipped_count = 0
    
    # Create RTPs for each evaluation that has pengendalian data
    for evaluasi in evaluasi_list:
        evaluasi_id = str(evaluasi["_id"])
        
        # Check if this evaluation already has RTPs
        existing_rtp = await db.rtp.find_one({
            "evaluasi_risiko_id": evaluasi_id
        })
        
        if existing_rtp:
            skipped_count += 1
            continue
        
        # Skip evaluations without pengendalian
        if not evaluasi.get("pengendalian"):
            skipped_count += 1
            continue
        
        # Create a new RTP based on the evaluation data
        target_date = datetime.utcnow() + timedelta(days=90)  # 3 months from now
        
        rtp_dict = {
            "evaluasi_risiko_id": evaluasi_id,
            "deskripsi": f"Control for {evaluasi.get('jenis', 'risk')} - {evaluasi.get('deskripsi', '')}",
            "rencana_aksi": evaluasi.get("pengendalian", ""),
            "target_waktu": target_date,  # Now using a datetime object
            "pic": "",  # To be filled by the user
            "indikator": "Implementation of control verified",
            "output": "",
            "anggaran": 0.0,  # Default value, to be updated by the user
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"]),
            "created_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
            "updated_at": None,
            "updated_by": None,
            "status": "DRAFT",
            "komentar": [],
            "tanggal_realisasi": None,
            "uraian_hambatan": None
        }
        
        # Set the respon_risiko based on jenis_pengendalian
        if evaluasi.get("jenis_pengendalian") == "Mengurangi dampak":
            rtp_dict["respon_risiko"] = "REDUCE_IMPACT"
        else:
            rtp_dict["respon_risiko"] = "REDUCE_FREQUENCY"  # Default for "Mengurangi kemungkinan"
        
        await db.rtp.insert_one(rtp_dict)
        created_count += 1
    
    return {
        "message": f"Created {created_count} RTPs, skipped {skipped_count} evaluations",
        "created": created_count,
        "skipped": skipped_count
    }

@router.get("/{rtp_id}", response_model=RTPResponse)
async def get_rtp_by_id(
    rtp_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a Risk Treatment Plan (RTP) by ID.
    """
    db = await Database.get_db()
    
    # Get RTP
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    # Format response
    response = {
        "id": str(rtp["_id"]),
        "evaluasi_risiko_id": rtp["evaluasi_risiko_id"],
        "rencana_pengendalian": rtp.get("rencana_pengendalian", ""),
        "penanggung_jawab": rtp.get("penanggung_jawab", ""),
        "target_waktu": rtp.get("target_waktu"),
        "biaya": rtp.get("biaya"),
        "respon_risiko": rtp.get("respon_risiko", "REDUCE_IMPACT"),
        "status": rtp.get("status", "BELUM_DILAKSANAKAN"),
        "tanggal_realisasi": rtp.get("tanggal_realisasi"),
        "bukti_realisasi": rtp.get("bukti_realisasi", ""),
        "created_at": rtp.get("created_at"),
        "updated_at": rtp.get("updated_at"),
        "created_by": rtp.get("created_by"),
        "updated_by": rtp.get("updated_by"),
        "verified_by": rtp.get("verified_by"),
        "verified_at": rtp.get("verified_at"),
        "comments": []
    }
    
    # Get comments
    comments = []
    komentar = []
    async for comment in db.komentar.find({
        "tipe_komentar": TipeKomentar.RTP,
        "$or": [
            {"ref_id": rtp_id},
            {"id_rtp": rtp_id}
        ]
    }).sort("created_at", 1):
        # Ensure text and type fields are set
        if "text" not in comment:
            comment["text"] = comment.get("konten", "")
        if "type" not in comment:
            comment["type"] = comment.get("tipe_komentar", "RTP")
        
        # Prepare comment data
        comment_data = {
            "id": str(comment["_id"]),
            "text": comment.get("text", comment.get("konten", "")),
            "type": comment.get("type", comment.get("tipe_komentar", "RTP")),
            "tipe_komentar": comment.get("tipe_komentar", "RTP"),
            "konten": comment.get("konten", ""),
            "id_instansi": comment.get("id_instansi", ""),
            "user_id": comment.get("user_id", ""),
            "nama_user": comment.get("nama_user", ""),
            "created_at": comment.get("created_at", datetime.utcnow()),
            "created_by": comment.get("created_by"),
            "updated_at": comment.get("updated_at"),
            "ref_id": rtp_id,
            "id_rtp": rtp_id,
            "status": comment.get("status", "OPEN"),
            "metadata": comment.get("metadata", {})
        }
        
        # Get replies if this is a top-level comment
        if comment.get("depth", 0) == 0:
            replies = []
            async for reply in db.komentar.find({
                "parent_id": str(comment["_id"])
            }).sort("created_at", 1):
                # Ensure text and type fields for replies
                if "text" not in reply:
                    reply["text"] = reply.get("konten", "")
                if "type" not in reply:
                    reply["type"] = reply.get("tipe_komentar", "RTP")
                
                reply_data = {
                    "id": str(reply["_id"]),
                    "text": reply.get("text", reply.get("konten", "")),
                    "type": reply.get("type", reply.get("tipe_komentar", "RTP")),
                    "tipe_komentar": reply.get("tipe_komentar", "RTP"),
                    "konten": reply.get("konten", ""),
                    "id_instansi": reply.get("id_instansi", ""),
                    "user_id": reply.get("user_id", ""),
                    "nama_user": reply.get("nama_user", ""),
                    "created_at": reply.get("created_at", datetime.utcnow()),
                    "parent_id": str(comment["_id"]),
                    "depth": reply.get("depth", 1),
                    "ref_id": rtp_id,
                    "status": reply.get("status", "OPEN"),
                    "metadata": reply.get("metadata", {})
                }
                replies.append(reply_data)
            
            comment_data["replies"] = replies
        else:
            comment_data["replies"] = []
        
        comments.append(comment_data)
        
        # Create simplified version for komentar field
        simplified_comment = {
            "id": str(comment["_id"]),
            "text": comment.get("konten", ""),  # Map konten to text field
            "type": "RTP",
            "ref_id": rtp_id,
            "created_at": comment.get("created_at", datetime.utcnow()),
            "created_by": comment.get("user_id"),
            "created_by_name": comment.get("nama_user", ""),
            "updated_at": comment.get("updated_at"),
            "updated_by": comment.get("updated_by")
        }
        komentar.append(KomentarResponse(**simplified_comment))
    
    response["comments"] = comments
    response["komentar"] = komentar
    
    # Get associated evaluasi risiko
    evaluasi = await db.evaluasi_risiko.find_one({"_id": ObjectId(rtp["evaluasi_risiko_id"])})
    if evaluasi:
        response["deskripsi_evaluasi"] = evaluasi.get("deskripsi", "")
        response["jenis_evaluasi"] = evaluasi.get("jenis", "")
        response["kategori_evaluasi"] = evaluasi.get("kategori", "")
        
        # Get associated identifikasi risiko
        identifikasi_id = evaluasi.get("identifikasi_risiko_id")
        if identifikasi_id:
            identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
            if identifikasi:
                response["pernyataan_risiko"] = identifikasi.get("pernyataan_risiko", "")
    
    # Get attachments
    attachments = []
    async for attachment in db.attachments.find({
        "ref_id": rtp_id,
        "type": AttachmentType.RTP
    }):
        attachment["id"] = str(attachment["_id"])
        del attachment["_id"]
        attachments.append(AttachmentResponse(**attachment))
    response["attachments"] = attachments
    
    # Copy all remaining fields from rtp that aren't already in response
    for key, value in rtp.items():
        if key != "_id" and key not in response:
            response[key] = value
    
    return response

@router.get("/by-identifikasi/{identifikasi_id}", response_model=List[RTPResponse])
async def get_rtp_by_identifikasi(
    identifikasi_id: str,
    respon_risiko: Optional[RTPResponRisiko] = Query(None, description="Filter by response type (REDUCE_IMPACT/REDUCE_FREQUENCY)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get RTPs by identifikasi risiko ID.
    RTPs are linked to evaluasi_risiko, so we need to get evaluasi_risiko first.
    """
    db = await Database.get_db()
    
    # Get analisis_risiko for this identifikasi
    analisis = await db.analisis_risiko.find_one({"identifikasi_risiko_id": identifikasi_id})
    if not analisis:
        return []  # Return empty list if no analysis exists yet
    
    # Get evaluasi_risiko for this analisis
    evaluasi_cursor = db.evaluasi_risiko.find({"analisis_risiko_id": str(analisis["_id"])})
    
    evaluasi_ids = []
    async for evaluasi in evaluasi_cursor:
        evaluasi_ids.append(str(evaluasi["_id"]))
    
    if not evaluasi_ids:
        return []  # Return empty list if no evaluations exist yet
    
    # Construct query for RTPs
    query = {"evaluasi_risiko_id": {"$in": evaluasi_ids}}
    if respon_risiko:
        query["respon_risiko"] = respon_risiko
    
    # Get RTPs
    cursor = db.rtp.find(query)
    rtps = []
    async for rtp in cursor:
        rtp["id"] = str(rtp["_id"])
        del rtp["_id"]
        
        # Get comments
        komentar = []
        async for comment in db.komentar.find({
            "tipe_komentar": TipeKomentar.RTP,
            "$or": [
                {"ref_id": rtp["id"]},
                {"id_rtp": rtp["id"]}
            ]
        }).sort("created_at", 1):
            comment_data = {
                "id": str(comment["_id"]),
                "text": comment.get("konten", ""),  # Map konten to text field
                "type": "RTP",
                "ref_id": rtp["id"],
                "created_at": comment.get("created_at", datetime.utcnow()),
                "created_by": comment.get("user_id"),
                "created_by_name": comment.get("nama_user", ""),
                "updated_at": comment.get("updated_at"),
                "updated_by": comment.get("updated_by")
            }
            komentar.append(KomentarResponse(**comment_data))
        rtp["komentar"] = komentar
        
        # Get attachments
        attachments = []
        async for attachment in db.attachments.find({
            "ref_id": rtp["id"],
            "type": AttachmentType.RTP
        }):
            attachment["id"] = str(attachment["_id"])
            del attachment["_id"]
            attachments.append(AttachmentResponse(**attachment))
        rtp["attachments"] = attachments
        
        rtps.append(RTPResponse(**rtp))
    
    return rtps

@router.post("/{rtp_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(
    rtp_id: str,
    file: UploadFile = File(...),
    unsur_spip_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an attachment for a Risk Treatment Plan (RTP).
    The file is stored in GridFS with base64 encoding for security.
    """
    db = await Database.get_db()
    
    # Validate RTP exists
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    try:
        # Read file content
        contents = await file.read()
        
        # Encode file content as base64
        encoded_content = base64.b64encode(contents)
        
        # Create GridFS bucket
        fs = AsyncIOMotorGridFSBucket(db)
        
        # Store file metadata
        metadata = {
            "type": "RTP",
            "ref_id": rtp_id,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "encoding": "base64",  # Mark that content is base64 encoded
            "tahun": rtp.get("tahun", datetime.utcnow().year),
            "unsur_spip_id": unsur_spip_id,
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"])
        }
        
        # Upload base64 encoded content to GridFS
        file_id = await fs.upload_from_stream(
            file.filename,
            encoded_content,  # Store the base64 encoded content
            metadata=metadata
        )
        
        # Create attachment record
        attachment_data = {
            "type": AttachmentType.RTP,
            "ref_id": rtp_id,
            "file_name": file.filename,
            "file_id": str(file_id),
            "content_type": file.content_type,
            "file_size": len(contents),  # Original file size before encoding
            "encoding": "base64",  # Mark that content is base64 encoded
            "tahun": rtp.get("tahun", datetime.utcnow().year),
            "unsur_spip_id": unsur_spip_id,
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"])
        }
        
        result = await db.attachments.insert_one(attachment_data)
        created = await db.attachments.find_one({"_id": result.inserted_id})
        created["id"] = str(created["_id"])
        
        return AttachmentResponse(**created)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save file: {str(e)}"
        )

@router.get("/{rtp_id}/attachments", response_model=List[AttachmentResponse])
async def get_rtp_attachments(
    rtp_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all attachments for a specific RTP.
    """
    db = await Database.get_db()
    
    # Validate RTP exists
    rtp = await db.rtp.find_one({"_id": ObjectId(rtp_id)})
    if not rtp:
        raise HTTPException(
            status_code=404,
            detail="RTP not found"
        )
    
    attachments = []
    async for attachment in db.attachments.find({"ref_id": rtp_id, "type": AttachmentType.RTP}):
        attachment["id"] = str(attachment["_id"])
        del attachment["_id"]
        attachments.append(AttachmentResponse(**attachment))
    
    return attachments

@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an attachment.
    Only SUPER_ADMIN or the attachment creator can delete.
    """
    db = await Database.get_db()
    
    # Get attachment first to get file ID
    attachment = await db.attachments.find_one({"_id": ObjectId(attachment_id)})
    if not attachment:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found"
        )
    
    # Check permission - only creator or super admin can delete
    if (current_user["role"] != UserRole.SUPER_ADMIN and 
        attachment.get("created_by") != str(current_user["id"])):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this attachment"
        )
    
    # Delete file from GridFS
    try:
        if "file_id" in attachment:
            fs = AsyncIOMotorGridFSBucket(db)
            await fs.delete(ObjectId(attachment["file_id"]))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete file: {str(e)}"
        )
    
    # Delete record
    result = await db.attachments.delete_one({"_id": ObjectId(attachment_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found"
        )
    
    return {"message": "Attachment deleted successfully"}

@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download an attachment file for RTP.
    Retrieves the base64 encoded content from GridFS and decodes it before sending.
    """
    db = await Database.get_db()
    
    # Get attachment metadata
    try:
        attachment = await db.attachments.find_one({"_id": ObjectId(attachment_id)})
        if not attachment:
            raise HTTPException(
                status_code=404,
                detail="Attachment not found"
            )
            
        # Verify this is an RTP attachment
        if attachment.get("type") != AttachmentType.RTP:
            raise HTTPException(
                status_code=400,
                detail="This is not an RTP attachment"
            )
    except bson.errors.InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid attachment ID format"
        )
    
    # Get file from GridFS
    fs = AsyncIOMotorGridFSBucket(db)
    
    try:
        # Create a grid_out object
        grid_out = await fs.open_download_stream(ObjectId(attachment["file_id"]))
        
        # Read content (it's base64 encoded in GridFS)
        encoded_content = await grid_out.read()
        
        # Decode the base64 content
        try:
            if attachment.get("encoding") == "base64":
                content = base64.b64decode(encoded_content)
            else:
                # For backward compatibility with non-encoded files
                content = encoded_content
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error decoding file content: {str(e)}"
            )
        
        # Create an async generator to yield file content
        async def file_stream():
            yield content
        
        # Ensure filename is properly quoted for Content-Disposition header
        filename = attachment.get('file_name', 'download')
        safe_filename = filename.replace('"', '\\"')
        
        # Return streaming response with decoded content
        return StreamingResponse(
            file_stream(),
            media_type=attachment.get("content_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Length": str(len(content))
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving file: {str(e)}"
        ) 