from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    EvaluasiRisikoCreate,
    EvaluasiRisikoUpdate,
    EvaluasiRisikoResponse,
    RootCauseGenerationRequest,
    RootCauseGenerationResponse,
    RootCause,
    RootCauseSelectionRequest,
    KomentarResponse,
    KomentarType
)
from app.schemas.user import UserRole
from app.schemas.comment import TipeKomentar
from app.database import Database
from app.utils.auth import get_current_user
from app.utils.azure_openai import generate_root_causes, cleanup_generation_session, GENERATED_STATEMENTS

router = APIRouter()

@router.post("", response_model=EvaluasiRisikoResponse)
async def create_evaluasi_risiko(
    evaluasi: EvaluasiRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk evaluation.
    """
    db = await Database.get_db()
    
    # Validate identifikasi_risiko exists
    identifikasi = await db.identifikasi_risiko.find_one({
        "_id": ObjectId(evaluasi.identifikasi_risiko_id)
    })
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate analisis_risiko exists
    analisis = await db.analisis_risiko.find_one({
        "_id": ObjectId(evaluasi.analisis_risiko_id)
    })
    if not analisis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Check if using AI-generated root cause
    if evaluasi.generation_id and evaluasi.root_cause_id:
        if evaluasi.generation_id in GENERATED_STATEMENTS:
            root_causes = GENERATED_STATEMENTS[evaluasi.generation_id]
            for cause in root_causes:
                if cause["id"] == evaluasi.root_cause_id:
                    evaluasi.deskripsi = cause["deskripsi"]
                    evaluasi.jenis = cause["jenis"]
                    # Store pengendalian in a separate field if it exists
                    if "pengendalian" in cause:
                        evaluasi.pengendalian = cause["pengendalian"]
                    # Store jenis_pengendalian if it exists
                    if "jenis_pengendalian" in cause:
                        evaluasi.jenis_pengendalian = cause["jenis_pengendalian"]
                    # Clean up after using
                    cleanup_generation_session(evaluasi.generation_id)
                    break

    # Validate jenis_penyebab only if provided (for 'penyebab')
    if evaluasi.jenis.lower() == 'penyebab' and evaluasi.jenis_penyebab_id:
        jenis_penyebab = await db.jenis_penyebab.find_one({
            "_id": ObjectId(evaluasi.jenis_penyebab_id)
        })
        if not jenis_penyebab:
            raise HTTPException(
                status_code=404,
                detail="Cause type not found"
            )
    elif evaluasi.jenis.lower() == 'penyebab' and not evaluasi.jenis_penyebab_id:
        raise HTTPException(
            status_code=422,
            detail="Field 'jenis_penyebab_id' is required when 'jenis' is 'penyebab'"
        )
        
    # Create evaluasi risiko document
    evaluasi_doc = evaluasi.dict()
    evaluasi_doc.pop("generation_id", None)  # Remove AI generation fields
    evaluasi_doc.pop("root_cause_id", None)  # Remove AI generation fields 
    evaluasi_doc["created_at"] = datetime.utcnow()
    
    # Use correct key for user ID - it might be 'id' instead of 'user_id'
    evaluasi_doc["created_by"] = str(current_user.get("id", current_user.get("_id", "")))
    
    # Also handle possible missing keys for name
    first_name = current_user.get("nama_depan", current_user.get("first_name", ""))
    last_name = current_user.get("nama_belakang", current_user.get("last_name", ""))
    if not (first_name or last_name) and "full_name" in current_user:
        evaluasi_doc["created_by_name"] = current_user["full_name"]
    else:
        evaluasi_doc["created_by_name"] = f"{first_name} {last_name}".strip()
    
    # If created_by_name is empty, use a default value
    if not evaluasi_doc["created_by_name"]:
        evaluasi_doc["created_by_name"] = "Unknown User"
    
    result = await db.evaluasi_risiko.insert_one(evaluasi_doc)
    
    # Return created document
    created = await db.evaluasi_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    
    # Initialize empty komentar list
    created["komentar"] = []
    
    # Initialize RTP count
    created["rtp_count"] = "0/0"
    
    # Ensure all required fields are present for response model
    if "created_at" not in created:
        created["created_at"] = datetime.utcnow()
        
    if "created_by" not in created:
        created["created_by"] = str(current_user.get("id", current_user.get("_id", "")))
        
    if "created_by_name" not in created:
        created["created_by_name"] = evaluasi_doc["created_by_name"]  # Use the name we constructed earlier
    
    return EvaluasiRisikoResponse(**created)

@router.get("", response_model=List[EvaluasiRisikoResponse])
async def get_evaluasi_risiko_list(
    identifikasi_risiko_id: Optional[str] = None,
    analisis_risiko_id: Optional[str] = None,
    jenis: Optional[str] = Query(None, description="Filter by jenis (dampak/penyebab)"),
    search: Optional[str] = Query(None, description="Search in deskripsi and pengendalian fields"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk evaluations with optional filtering.
    """
    try:
        db = await Database.get_db()
        
        query = {}
        if identifikasi_risiko_id:
            query["identifikasi_risiko_id"] = identifikasi_risiko_id
        if analisis_risiko_id:
            query["analisis_risiko_id"] = analisis_risiko_id
        if jenis:
            query["jenis"] = jenis
        
        # Add search criteria if provided
        if search:
            query["$or"] = [
                {"deskripsi": {"$regex": search, "$options": "i"}},
                {"pengendalian": {"$regex": search, "$options": "i"}}
            ]
            
        evaluasi_list = []
        async for evaluasi in db.evaluasi_risiko.find(query).sort("created_at", -1):
            # Get user info for created_by
            user_info = None
            if "created_by" in evaluasi:
                user_info = await db.users.find_one({"_id": ObjectId(evaluasi["created_by"])})
            
            # Format data for response
            evaluasi["id"] = str(evaluasi["_id"])
            
            # Add created_by_name if user info exists
            if user_info:
                evaluasi["created_by_name"] = f"{user_info.get('nama_depan', '')} {user_info.get('nama_belakang', '')}"
            else:
                evaluasi["created_by_name"] = "Unknown User"
                
            # Remove MongoDB _id
            del evaluasi["_id"]
            
            # Get comments for this evaluasi
            comments_pipeline = [
                {"$match": {
                    "ref_id": evaluasi["id"],
                    "tipe_komentar": "EVALUASI"
                }},
                {"$sort": {"created_at": -1}}
            ]
            
            evaluasi["komentar"] = []
            async for comment in db.komentar.aggregate(comments_pipeline):
                comment["id"] = str(comment["_id"])
                del comment["_id"]
                
                # Get user info for the comment
                if "user_id" in comment:
                    commenter = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
                    if commenter:
                        comment["nama_user"] = f"{commenter.get('nama_depan', '')} {commenter.get('nama_belakang', '')}"
                    else:
                        comment["nama_user"] = "Unknown User"
                
                # Process replies
                if "replies" not in comment:
                    comment["replies"] = []
                
                evaluasi["komentar"].append(comment)
            
            # Get RTP count for this evaluasi
            rtp_count = await db.rtp.count_documents({"evaluasi_risiko_id": evaluasi["id"]})
            rtp_realized = await db.rtp.count_documents({
                "evaluasi_risiko_id": evaluasi["id"],
                "tanggal_realisasi": {"$ne": None}
            })
            evaluasi["rtp_count"] = f"{rtp_realized}/{rtp_count}"
            
            # Ensure all required fields are present
            if "deskripsi" not in evaluasi:
                evaluasi["deskripsi"] = ""  # Default empty string for deskripsi
                
            if "jenis" not in evaluasi:
                evaluasi["jenis"] = "penyebab"  # Default to penyebab
                
            # Ensure jenis_penyebab_id is present
            if "jenis_penyebab_id" not in evaluasi:
                # Try to find a default jenis_penyebab
                default_penyebab = await db.jenis_penyebab.find_one({})
                evaluasi["jenis_penyebab_id"] = str(default_penyebab["_id"]) if default_penyebab else "000000000000000000000000"
            
            evaluasi_list.append(evaluasi)
        
        return evaluasi_list
    except Exception as e:
        print(f"Error in get_evaluasi_risiko_list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluasi risiko: {str(e)}"
        )

@router.put("/{evaluasi_id}", response_model=EvaluasiRisikoResponse)
async def update_evaluasi_risiko(
    evaluasi_id: str,
    evaluasi: EvaluasiRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk evaluation.
    """
    db = await Database.get_db()
    
    existing = await db.evaluasi_risiko.find_one({"_id": ObjectId(evaluasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk evaluation not found"
        )

    update_data = evaluasi.dict(exclude_unset=True)
    
    # If updating jenis_penyebab, validate it exists
    if "jenis_penyebab_id" in update_data and update_data["jenis_penyebab_id"]:
        try:
            jenis_penyebab = await db.jenis_penyebab.find_one({
                "_id": ObjectId(update_data["jenis_penyebab_id"])
            })
            if not jenis_penyebab:
                raise HTTPException(
                    status_code=404,
                    detail="Cause type not found"
                )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid jenis_penyebab_id")

    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user.get("id", current_user.get("_id", "")))
    
    await db.evaluasi_risiko.update_one(
        {"_id": ObjectId(evaluasi_id)},
        {"$set": update_data}
    )
    
    updated = await db.evaluasi_risiko.find_one({"_id": ObjectId(evaluasi_id)})
    updated["id"] = str(updated.pop("_id"))  # Convert _id to string and remove _id field
    
    # Get comments
    komentar = []
    async for comment in db.komentar.find({
        "ref_id": updated["id"],
        "tipe_komentar": TipeKomentar.EVALUASI  # Fix to use tipe_komentar
    }):
        # Create a properly formatted comment object with all required fields
        comment_data = {
            "id": str(comment.pop("_id")) if "_id" in comment else str(ObjectId()),
            "text": comment.get("konten", ""),  # Map konten to text field
            "type": KomentarType.EVALUASI,  # Set the correct type
            "ref_id": updated["id"],
            "created_at": comment.get("created_at", datetime.utcnow()),
            "updated_at": comment.get("updated_at"),
            "created_by": comment.get("user_id"),
            "created_by_name": comment.get("nama_user", ""),
            "updated_by": comment.get("updated_by")
        }
        komentar.append(KomentarResponse(**comment_data))
    updated["komentar"] = komentar
    
    # Get RTP count
    rtp_cursor = db.rtp.find({"evaluasi_risiko_id": updated["id"]})
    total_rtp_count = 0
    realized_rtp_count = 0
    async for rtp in rtp_cursor:
        total_rtp_count += 1
        if rtp.get("tanggal_realisasi") is not None:
            realized_rtp_count += 1
    updated["rtp_count"] = f"{realized_rtp_count}/{total_rtp_count}"
    
    return EvaluasiRisikoResponse(**updated)

@router.delete("/{evaluasi_id}")
async def delete_evaluasi_risiko(
    evaluasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk evaluation.
    """
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete risk evaluations"
        )
    
    db = await Database.get_db()
    
    result = await db.evaluasi_risiko.delete_one({"_id": ObjectId(evaluasi_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk evaluation not found"
        )
    
    return {"message": "Risk evaluation deleted successfully"}

@router.get("/{evaluasi_id}", response_model=EvaluasiRisikoResponse)
async def get_evaluasi_risiko(
    evaluasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a risk evaluation by ID."""
    try:
        db = await Database.get_db()
        
        evaluasi = await db.evaluasi_risiko.find_one({"_id": ObjectId(evaluasi_id)})
        if not evaluasi:
            raise HTTPException(
                status_code=404,
                detail="Risk evaluation not found"
            )
        
        # Format data for response
        evaluasi["id"] = str(evaluasi["_id"])
        del evaluasi["_id"]
        
        # Get user info for created_by
        user_info = None
        if "created_by" in evaluasi:
            user_info = await db.users.find_one({"_id": ObjectId(evaluasi["created_by"])})
        
        # Add created_by_name if user info exists
        if user_info:
            evaluasi["created_by_name"] = f"{user_info.get('nama_depan', '')} {user_info.get('nama_belakang', '')}"
        else:
            evaluasi["created_by_name"] = "Unknown User"
        
        # Get comments for this evaluasi
        comments_pipeline = [
            {"$match": {
                "ref_id": evaluasi["id"],
                "tipe_komentar": "EVALUASI"
            }},
            {"$sort": {"created_at": -1}}
        ]
        
        evaluasi["komentar"] = []
        async for comment in db.komentar.aggregate(comments_pipeline):
            comment["id"] = str(comment["_id"])
            del comment["_id"]
            
            # Get user info for the comment
            if "user_id" in comment:
                commenter = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
                if commenter:
                    comment["nama_user"] = f"{commenter.get('nama_depan', '')} {commenter.get('nama_belakang', '')}"
                else:
                    comment["nama_user"] = "Unknown User"
            
            # Process replies
            replies = []
            if comment.get("depth", 0) == 0:  # Only get replies for top-level comments
                replies_pipeline = [
                    {"$match": {
                        "parent_id": comment["id"],
                        "tipe_komentar": "EVALUASI"
                    }},
                    {"$sort": {"created_at": 1}}
                ]
                
                async for reply in db.komentar.aggregate(replies_pipeline):
                    reply["id"] = str(reply["_id"])
                    del reply["_id"]
                    
                    # Get user info for the reply
                    if "user_id" in reply:
                        replier = await db.users.find_one({"_id": ObjectId(reply["user_id"])})
                        if replier:
                            reply["nama_user"] = f"{replier.get('nama_depan', '')} {replier.get('nama_belakang', '')}"
                        else:
                            reply["nama_user"] = "Unknown User"
                    
                    replies.append(reply)
            
            comment["replies"] = replies
            evaluasi["komentar"].append(comment)
        
        # Get RTP count for this evaluasi
        rtp_count = await db.rtp.count_documents({"evaluasi_risiko_id": evaluasi["id"]})
        rtp_realized = await db.rtp.count_documents({
            "evaluasi_risiko_id": evaluasi["id"],
            "tanggal_realisasi": {"$ne": None}
        })
        evaluasi["rtp_count"] = f"{rtp_realized}/{rtp_count}"
        
        # Ensure all required fields are present
        if "deskripsi" not in evaluasi:
            evaluasi["deskripsi"] = ""
        
        if "jenis" not in evaluasi:
            evaluasi["jenis"] = "penyebab"  # Default to penyebab
        
        # Ensure jenis_penyebab_id is present
        if "jenis_penyebab_id" not in evaluasi:
            # Try to find a default jenis_penyebab
            default_penyebab = await db.jenis_penyebab.find_one({})
            evaluasi["jenis_penyebab_id"] = str(default_penyebab["_id"]) if default_penyebab else "000000000000000000000000"
        
        return evaluasi
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_evaluasi_risiko: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluasi risiko: {str(e)}"
        )

@router.get("/by-identifikasi/{identifikasi_id}", response_model=List[EvaluasiRisikoResponse])
async def get_evaluasi_by_identifikasi(
    identifikasi_id: str,
    jenis: Optional[str] = Query(None, description="Filter by jenis (dampak/penyebab)"),
    search: Optional[str] = Query(None, description="Search in deskripsi and pengendalian fields"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all evaluasi risiko for a specific identifikasi risiko
    """
    try:
        db = await Database.get_db()
        query = {"identifikasi_risiko_id": identifikasi_id}
        
        # Add jenis filter if provided
        if jenis:
            query["jenis"] = jenis
            
        # Add search filter if provided
        if search:
            query["$or"] = [
                {"deskripsi": {"$regex": search, "$options": "i"}},
                {"pengendalian": {"$regex": search, "$options": "i"}}
            ]
            
        evaluasi_list = []
        async for evaluasi in db.evaluasi_risiko.find(query):
            # Get user info for created_by
            user_info = None
            if "created_by" in evaluasi:
                user_info = await db.users.find_one({"_id": ObjectId(evaluasi["created_by"])})
            
            # Format data for response
            evaluasi["id"] = str(evaluasi["_id"])
            
            # Add created_by_name if user info exists
            if user_info:
                evaluasi["created_by_name"] = f"{user_info.get('nama_depan', '')} {user_info.get('nama_belakang', '')}"
            else:
                evaluasi["created_by_name"] = "Unknown User"
                
            # Remove MongoDB _id
            del evaluasi["_id"]
            
            # Get comments for this evaluasi
            comments_pipeline = [
                {"$match": {
                    "ref_id": evaluasi["id"],
                    "tipe_komentar": "EVALUASI"
                }},
                {"$sort": {"created_at": -1}}
            ]
            
            evaluasi["komentar"] = []
            async for comment in db.komentar.aggregate(comments_pipeline):
                comment["id"] = str(comment["_id"])
                del comment["_id"]
                
                # Get user info for the comment
                if "user_id" in comment:
                    commenter = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
                    if commenter:
                        comment["nama_user"] = f"{commenter.get('nama_depan', '')} {commenter.get('nama_belakang', '')}"
                    else:
                        comment["nama_user"] = "Unknown User"
                
                # Process replies
                if "replies" not in comment:
                    comment["replies"] = []
                
                evaluasi["komentar"].append(comment)
            
            # Get RTP count for this evaluasi
            rtp_count = await db.rtp.count_documents({"evaluasi_risiko_id": evaluasi["id"]})
            rtp_realized = await db.rtp.count_documents({
                "evaluasi_risiko_id": evaluasi["id"],
                "tanggal_realisasi": {"$ne": None}
            })
            evaluasi["rtp_count"] = f"{rtp_realized}/{rtp_count}"
            
            evaluasi_list.append(evaluasi)
            
        return evaluasi_list
    except Exception as e:
        print(f"Error in get_evaluasi_by_identifikasi: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluasi risiko: {str(e)}"
        )

@router.get("/by-analisis/{analisis_id}", response_model=List[EvaluasiRisikoResponse])
async def get_evaluasi_by_analisis(
    analisis_id: str,
    jenis: Optional[str] = Query(None, description="Filter by jenis (dampak/penyebab)"),
    search: Optional[str] = Query(None, description="Search in deskripsi and pengendalian fields"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all evaluasi risiko for a specific analisis risiko
    """
    try:
        db = await Database.get_db()
        query = {"analisis_risiko_id": analisis_id}
        
        # Add jenis filter if provided
        if jenis:
            query["jenis"] = jenis
            
        # Add search filter if provided
        if search:
            query["$or"] = [
                {"deskripsi": {"$regex": search, "$options": "i"}},
                {"pengendalian": {"$regex": search, "$options": "i"}}
            ]
            
        evaluasi_list = []
        async for evaluasi in db.evaluasi_risiko.find(query):
            # Get user info for created_by
            user_info = None
            if "created_by" in evaluasi:
                user_info = await db.users.find_one({"_id": ObjectId(evaluasi["created_by"])})
            
            # Format data for response
            evaluasi["id"] = str(evaluasi["_id"])
            
            # Add created_by_name if user info exists
            if user_info:
                evaluasi["created_by_name"] = f"{user_info.get('nama_depan', '')} {user_info.get('nama_belakang', '')}"
            else:
                evaluasi["created_by_name"] = "Unknown User"
                
            # Remove MongoDB _id
            del evaluasi["_id"]
            
            # Get comments for this evaluasi
            comments_pipeline = [
                {"$match": {
                    "ref_id": evaluasi["id"],
                    "tipe_komentar": "EVALUASI"
                }},
                {"$sort": {"created_at": -1}}
            ]
            
            evaluasi["komentar"] = []
            async for comment in db.komentar.aggregate(comments_pipeline):
                comment["id"] = str(comment["_id"])
                del comment["_id"]
                
                # Get user info for the comment
                if "user_id" in comment:
                    commenter = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
                    if commenter:
                        comment["nama_user"] = f"{commenter.get('nama_depan', '')} {commenter.get('nama_belakang', '')}"
                    else:
                        comment["nama_user"] = "Unknown User"
                
                # Process replies
                if "replies" not in comment:
                    comment["replies"] = []
                
                evaluasi["komentar"].append(comment)
            
            # Get RTP count for this evaluasi
            rtp_count = await db.rtp.count_documents({"evaluasi_risiko_id": evaluasi["id"]})
            rtp_realized = await db.rtp.count_documents({
                "evaluasi_risiko_id": evaluasi["id"],
                "tanggal_realisasi": {"$ne": None}
            })
            evaluasi["rtp_count"] = f"{rtp_realized}/{rtp_count}"
            
            evaluasi_list.append(evaluasi)
            
        return evaluasi_list
    except Exception as e:
        print(f"Error in get_evaluasi_by_analisis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluasi risiko: {str(e)}"
        )

@router.post("/generate-root-causes", response_model=RootCauseGenerationResponse)
async def generate_root_causes_endpoint(
    request: RootCauseGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate root causes for a risk using AI based on the risk identification
    """
    db = await Database.get_db()
    
    # Get the risk identification data
    identifikasi = await db.identifikasi_risiko.find_one({
        "_id": ObjectId(request.identifikasi_risiko_id)
    })
    
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )
    
    # Get context information
    konteks_sasaran = await db.konteks.find_one({
        "_id": ObjectId(identifikasi["id_konteks_sasaran"])
    })
    
    if not konteks_sasaran:
        raise HTTPException(
            status_code=404,
            detail="Target context not found"
        )
    
    # Construct the context string
    jenis_konteks_sasaran = f"{konteks_sasaran['nama']}"
    
    # Get the risk statement from the identification
    pernyataan_risiko = identifikasi["pernyataan_risiko"]
    
    if not pernyataan_risiko:
        raise HTTPException(
            status_code=400,
            detail="Risk statement is missing in the identification"
        )
    
    # Call Azure OpenAI to generate root causes
    result = generate_root_causes(
        jenis_konteks_sasaran=jenis_konteks_sasaran,
        pernyataan_risiko=pernyataan_risiko
    )
    
    return result

@router.post("/select-root-cause")
async def select_root_cause(
    request: RootCauseSelectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Select a generated root cause
    
    Note: In the future, this endpoint will return additional metadata.
    Client code should be updated to handle a response with fields:
    {
        "root_cause": {...},
        "identifikasi_risiko_id": "...",
        "generation_id": "..."
    }
    """
    # Get the selected root cause from the global dictionary
    if request.generation_id not in GENERATED_STATEMENTS:
        raise HTTPException(
            status_code=404,
            detail="Generation session not found or expired"
        )
    
    root_causes = GENERATED_STATEMENTS[request.generation_id]
    selected = None
    
    # Find the selected root cause
    for cause in root_causes:
        if cause["id"] == request.selected_id:
            selected = cause
            break
    
    if not selected:
        raise HTTPException(
            status_code=404,
            detail="Selected root cause not found"
        )
    
    # For backward compatibility, just return the root cause object
    # TODO: In the future, return additional metadata
    return selected

@router.delete("/cleanup-generation/{generation_id}")
async def cleanup_root_cause_generation(
    generation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Clean up a root cause generation session
    """
    cleanup_generation_session(generation_id)
    return {"status": "success"}

@router.get("/bowtie/visualisasi/{id_identifikasi_risiko}")
async def get_bowtie_visualisasi(
    id_identifikasi_risiko: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get Bowtie visualization data for a specific risk identification.
    
    This endpoint returns the data needed to generate a Bowtie diagram showing:
    - The risk statement in the center (blue)
    - Causes on the left (white blue)
    - Controls for causes on the left center (blue)
    - Controls for impacts on the right center (orange)
    - Impacts on the right (white orange)
    
    Returns:
    - JSON data structure with all components needed for the Bowtie diagram
    """
    try:
        db = await Database.get_db()
        
        # 1. Get the risk identification
        identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(id_identifikasi_risiko)})
        if not identifikasi:
            raise HTTPException(status_code=404, detail="Risk identification not found")
        
        # 2. Get related context information (sasaran and probis)
        konteks_sasaran = await db.konteks.find_one({"_id": ObjectId(identifikasi.get("id_konteks_sasaran", ""))})
        konteks_probis = await db.konteks.find_one({"_id": ObjectId(identifikasi.get("id_konteks_probis", ""))})
        
        # 3. Get related evaluations (causes and impacts with controls)
        query = {"identifikasi_risiko_id": id_identifikasi_risiko}
        
        # Get all causes (penyebab)
        penyebab_query = {**query, "jenis": "penyebab"}
        penyebab_list = []
        async for evaluasi in db.evaluasi_risiko.find(penyebab_query):
            penyebab_list.append({
                "deskripsi": evaluasi.get("deskripsi", ""),
                "pengendalian": evaluasi.get("pengendalian", "")
            })
        
        # Get all impacts (dampak)
        dampak_query = {**query, "jenis": "dampak"}
        dampak_list = []
        async for evaluasi in db.evaluasi_risiko.find(dampak_query):
            dampak_list.append({
                "deskripsi": evaluasi.get("deskripsi", ""),
                "pengendalian": evaluasi.get("pengendalian", "")
            })
        
        # 4. Prepare the response
        result = {
            "nama_sasaran": konteks_sasaran.get("nama", "") if konteks_sasaran else "",
            "nama_probis": konteks_probis.get("nama", "") if konteks_probis else "",
            "nama_pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
            "penyebab": penyebab_list,
            "dampak": dampak_list
        }
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_bowtie_visualisasi: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Bowtie visualization: {str(e)}"
        )