from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    IdentifikasiRisikoCreate,
    IdentifikasiRisikoUpdate,
    IdentifikasiRisikoResponse,
    ApprovalCreate,
    ApprovalUpdate,
    ApprovalResponse,
    ApprovalStatus,
    ApprovalData,
    DisableData,
    RiskStatementGenerationRequest,
    RiskStatementGenerationResponse,
    RiskStatementSelectionRequest,
    RiskStatement,
    KomentarResponse,
    KomentarType,
    AttachmentType
)
from app.schemas.user import UserRole
from app.schemas.comment import TipeKomentar
from app.database import Database
from app.utils.auth import get_current_user
from app.utils.azure_openai import generate_risk_statements, get_selected_statements, cleanup_generation_session, GENERATED_STATEMENTS
from app.api.v1.analisis_risiko import calculate_risk_level, get_selera_risiko, calculate_memenuhi

router = APIRouter()

@router.post("", response_model=IdentifikasiRisikoResponse)
async def create_identifikasi_risiko(
    identifikasi: IdentifikasiRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk identification.
    
    This endpoint supports two modes:
    1. Manual mode: Provide all required fields including pernyataan_risiko and deskripsi
    2. AI-assisted mode: Provide generation_id and statement_id to use an AI-generated risk statement
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can create risk identifications"
        )

    # Validate that either pernyataan_risiko is provided directly or generation_id and statement_id are provided
    if not identifikasi.pernyataan_risiko and not (identifikasi.generation_id and identifikasi.statement_id):
        raise HTTPException(
            status_code=400,
            detail="Either provide pernyataan_risiko directly or use generation_id and statement_id for AI-generated statements"
        )

    db = await Database.get_db()

    # Check if using AI-generated risk statement
    if identifikasi.generation_id and identifikasi.statement_id:
        # Get the selected statement from the generation session
        try:
            if identifikasi.generation_id not in GENERATED_STATEMENTS:
                raise HTTPException(
                    status_code=404,
                    detail="Generation session not found or expired"
                )
                
            statements = GENERATED_STATEMENTS[identifikasi.generation_id]
            selected_statement = next((s for s in statements if s["id"] == identifikasi.statement_id), None)
            
            if not selected_statement:
                raise HTTPException(
                    status_code=404,
                    detail="Selected statement not found in generation session"
                )
                
            # Update the identifikasi with the selected statement
            identifikasi.pernyataan_risiko = selected_statement["pernyataan"]
            if "deskripsi" in selected_statement and selected_statement["deskripsi"]:
                identifikasi.deskripsi = selected_statement["deskripsi"]
                
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving AI-generated statement: {str(e)}"
            )
    
    # Validate jenis konteks is SASARAN from struktur_organisasi
    struktur = await db.struktur_organisasi.find_one({
        "jenis_konteks": {
            "$elemMatch": {
                "id": identifikasi.id_jenis_konteks_sasaran,
                "jenis": "SASARAN"
            }
        }
    })
    if not struktur:
        raise HTTPException(
            status_code=400,
            detail="Invalid context type for risk identification. Must be SASARAN type"
        )

    # Get the jenis_konteks from struktur
    jenis_konteks = None
    for jk in struktur["jenis_konteks"]:
        if jk["id"] == identifikasi.id_jenis_konteks_sasaran:
            jenis_konteks = jk
            break

    # Remove redundant structure check since we already have it
    if not jenis_konteks:
        raise HTTPException(
            status_code=404,
            detail="Context type not found in structure"
        )

    # Validate structure exists for this context type
    struktur = await db.struktur_organisasi.find_one({
        "jenis_konteks": {
            "$elemMatch": {
                "id": str(jenis_konteks["id"])
            }
        }
    })
    if not struktur:
        raise HTTPException(
            status_code=404,
            detail="Structure not found for this context type"
        )

    # Validate konteks sasaran belongs to the correct jenis_konteks
    # First, get the konteks by ID
    konteks_sasaran = await db.konteks.find_one({
        "_id": ObjectId(identifikasi.id_konteks_sasaran)
    })
    
    if not konteks_sasaran:
        raise HTTPException(
            status_code=404,
            detail="SASARAN context not found"
        )
    
    # Check if the SASARAN context is disabled
    if konteks_sasaran.get("is_disabled", False):
        raise HTTPException(
            status_code=400,
            detail="Cannot create risk identification using disabled SASARAN context"
        )
    
    # Then check if it's associated with the correct jenis_konteks - checking both string and ObjectId cases
    # Use 'or' instead of 'and' to check if EITHER condition matches (we want the check to pass if EITHER format matches)
    if not (konteks_sasaran.get("id_jenis_konteks") == identifikasi.id_jenis_konteks_sasaran or 
            str(konteks_sasaran.get("id_jenis_konteks")) == identifikasi.id_jenis_konteks_sasaran):
        # Log the values for debugging
        print(f"Mismatch: konteks_sasaran.id_jenis_konteks={konteks_sasaran.get('id_jenis_konteks')}, identifikasi.id_jenis_konteks_sasaran={identifikasi.id_jenis_konteks_sasaran}")
        
        raise HTTPException(
            status_code=404,
            detail="SASARAN context doesn't match the specified context type"
        )

    # Validate and get all related data
    konteks_probis = await db.konteks.find_one({
        "_id": ObjectId(identifikasi.id_konteks_probis)
    })
    kategori_risiko = await db.kategori_risiko.find_one({
        "_id": ObjectId(identifikasi.id_kategori_risiko)
    })

    # Validate all data exists and from same institution
    if not all([
        konteks_probis, kategori_risiko
    ]):
        raise HTTPException(
            status_code=400,
            detail="One or more related data not found"
        )

    if not all(item["id_instansi"] == identifikasi.id_instansi for item in [
        konteks_probis, kategori_risiko
    ]):
        raise HTTPException(
            status_code=400,
            detail="All data must be from the same institution"
        )

    # Validate context types
    if konteks_sasaran["jenis_konteks"] != "SASARAN":
        raise HTTPException(
            status_code=400,
            detail="Invalid SASARAN context"
        )

    if konteks_probis["jenis_konteks"] != "PROBIS":
        raise HTTPException(
            status_code=400,
            detail="Invalid PROBIS context"
        )

    # Validate indicator belongs to SASARAN context
    indikator = await db.indikator.find_one({
        "_id": ObjectId(identifikasi.id_indikator),
        "id_konteks": identifikasi.id_konteks_sasaran
    })
    if not indikator:
        raise HTTPException(
            status_code=400,
            detail="Invalid indicator or indicator doesn't belong to selected SASARAN context"
        )

    # Validate user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": identifikasi.id_instansi}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only create risk identifications for your assigned KLP"
            )

    # Create identifikasi risiko
    identifikasi_dict = identifikasi.dict()
    identifikasi_dict["created_at"] = datetime.utcnow()
    identifikasi_dict["created_by"] = str(current_user["id"])
    identifikasi_dict["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
    identifikasi_dict["status_approval"] = ApprovalStatus.DRAFT
    identifikasi_dict["is_enabled"] = True
    identifikasi_dict["id_induk_unit_kerja"] = konteks_sasaran["id_induk_unit_kerja"]

    # Ensure id_bagan_risiko is optional
    if not identifikasi_dict.get("id_bagan_risiko"):
        identifikasi_dict["id_bagan_risiko"] = None

    result = await db.identifikasi_risiko.insert_one(identifikasi_dict)

    # Add risk statement to kamus_risiko (for both AI-generated and manual entries)
    # Check if this risk statement already exists in kamus_risiko
    existing_kamus = await db.kamus_risiko.find_one({
        "nama": identifikasi.pernyataan_risiko,
        "id_instansi": identifikasi.id_instansi
    })
    
    if not existing_kamus:
        # Generate a unique code for the kamus_risiko entry
        # Format: R-[year]-[sequential number]
        year = str(identifikasi.tahun)
        count = await db.kamus_risiko.count_documents({"id_instansi": identifikasi.id_instansi})
        kode = f"R-{year}-{count+1:03d}"
        
        # Create a new kamus_risiko entry
        kamus_data = {
            "kode": kode,
            "nama": identifikasi.pernyataan_risiko,
            "id_kategori_risiko": identifikasi.id_kategori_risiko,
            "id_instansi": identifikasi.id_instansi,
            "created_at": datetime.utcnow(),
            "nama_klp": kategori_risiko.get("nama_klp", ""),
            "nama_kategori": kategori_risiko.get("nama", "")
        }
        await db.kamus_risiko.insert_one(kamus_data)

    # Project final fields
    pipeline = [
        {"$match": {"_id": result.inserted_id}},
        # Join with jenis konteks SASARAN
        {"$lookup": {
            "from": "jenis_konteks",
            "let": {"id": {"$toObjectId": "$id_jenis_konteks_sasaran"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "jenis_sasaran"
        }},
        {"$unwind": "$jenis_sasaran"},
        # Join with konteks SASARAN
        {"$lookup": {
            "from": "konteks",
            "let": {"id": {"$toObjectId": "$id_konteks_sasaran"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "konteks_sasaran"
        }},
        {"$unwind": "$konteks_sasaran"},
        # Join with indikator
        {"$lookup": {
            "from": "indikator",
            "let": {"id": {"$toObjectId": "$id_indikator"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "indikator"
        }},
        {"$unwind": "$indikator"},
        # Join with konteks PROBIS
        {"$lookup": {
            "from": "konteks",
            "let": {"id": {"$toObjectId": "$id_konteks_probis"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "konteks_probis"
        }},
        {"$unwind": "$konteks_probis"},
        # Join with kategori risiko
        {"$lookup": {
            "from": "kategori_risiko",
            "let": {"id": {"$toObjectId": "$id_kategori_risiko"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "kategori_risiko"
        }},
        {"$unwind": "$kategori_risiko"},
        # Project final fields
        {"$project": {
            "id": {"$toString": "$_id"},
            "tahun": 1,
            "id_instansi": 1,
            "id_jenis_konteks_sasaran": 1,
            "id_konteks_sasaran": 1,
            "id_konteks_probis": 1,
            "id_indikator": 1,
            "id_bagan_risiko": 1,
            "id_kategori_risiko": 1,
            "id_metode_spip": 1,
            "id_induk_unit_kerja": 1,
            "pernyataan_risiko": 1,
            "deskripsi": 1,
            "status_approval": 1,
            "is_enabled": 1,
            "created_at": 1,
            "created_by": 1,
            "created_by_name": 1,
            "updated_at": 1,
            "disabled": 1,
            "disabled_reason": 1,
            "uraian_dampak": 1,
            "comments": {"$literal": []},
            "approval": {"$literal": None}
        }}
    ]

    try:
        created = await db.identifikasi_risiko.aggregate(pipeline).next()
        return IdentifikasiRisikoResponse(**created)
    except StopAsyncIteration:
        # If aggregation fails, get the raw document
        created = await db.identifikasi_risiko.find_one({"_id": result.inserted_id})
        created["id"] = str(created.pop("_id"))  # Convert _id to string and remove _id field
        return IdentifikasiRisikoResponse(**created)

@router.get("", response_model=List[IdentifikasiRisikoResponse])
async def get_identifikasi_risiko(
    tahun: int,
    id_instansi: str,
    search: Optional[str] = Query(None, description="Search in pernyataan_risiko and deskripsi"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk identifications.
    Filter by year and institution.
    Optional search parameter to filter by pernyataan_risiko and deskripsi.
    """
    db = await Database.get_db()
    
    # Build base query
    query = {
        "tahun": tahun,
        "id_instansi": id_instansi
    }

    # Add search criteria if provided
    if search:
        # Build more comprehensive search
        query["$or"] = [
            {"pernyataan_risiko": {"$regex": search, "$options": "i"}},
            {"deskripsi": {"$regex": search, "$options": "i"}},
            {"uraian_dampak": {"$regex": search, "$options": "i"}},
            {"disabled_reason": {"$regex": search, "$options": "i"}},
            {"created_by_name": {"$regex": search, "$options": "i"}}
        ]
        
        # Also try to match risiko IDs if the search looks like an ID
        if len(search) >= 10 and search.isalnum():  # IDs are usually alphanumeric and longish
            query["$or"].extend([
                {"_id": {"$regex": search, "$options": "i"}},
                {"id_konteks_sasaran": {"$regex": search, "$options": "i"}},
                {"id_konteks_probis": {"$regex": search, "$options": "i"}},
                {"id_indikator": {"$regex": search, "$options": "i"}},
                {"id_bagan_risiko": {"$regex": search, "$options": "i"}},
                {"id_kategori_risiko": {"$regex": search, "$options": "i"}},
                {"id_metode_spip": {"$regex": search, "$options": "i"}}
            ])
    
    # For non-admin users, only show data from their assigned KLPs
    if current_user["role"] != UserRole.SUPER_ADMIN:
        assigned_klps = []
        async for struktur in db.struktur_organisasi.find({"id_instansi": id_instansi}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_klps.append(str(struktur["id_induk_unit_kerja"]))
                    break
        
        if not assigned_klps:
            return []
        
        # Get all konteks for assigned KLPs
        konteks_ids = []
        async for konteks in db.konteks.find({"id_induk_unit_kerja": {"$in": assigned_klps}}):
            konteks_ids.append(str(konteks["_id"]))
        
        if not konteks_ids:
            return []
        
        # Add konteks filter to query
        if "$or" in query:
            # If we already have a search $or clause, we need to use $and to combine with the permissions filter
            query = {
                "$and": [
                    {"$or": [
                        {"id_konteks_sasaran": {"$in": konteks_ids}},
                        {"id_konteks_probis": {"$in": konteks_ids}}
                    ]},
                    query
                ]
            }
        else:
            # If no search, just add the permissions $or directly
            query["$or"] = [
                {"id_konteks_sasaran": {"$in": konteks_ids}},
                {"id_konteks_probis": {"$in": konteks_ids}}
            ]
    
    pipeline = [
        {"$match": query},
        # Project final fields
        {"$project": {
            "id": {"$toString": "$_id"},
            "tahun": 1,
            "id_instansi": 1,
            "id_jenis_konteks_sasaran": 1,
            "id_konteks_sasaran": 1,
            "id_konteks_probis": 1,
            "id_indikator": 1,
            "id_bagan_risiko": 1,
            "id_kategori_risiko": 1,
            "id_metode_spip": 1,
            "id_induk_unit_kerja": 1,
            "pernyataan_risiko": 1,
            "deskripsi": 1,
            "status_approval": 1,
            "is_enabled": 1,
            "created_at": 1,
            "created_by": 1,
            "created_by_name": 1,
            "updated_at": 1,
            "disabled": 1,
            "disabled_reason": 1,
            "uraian_dampak": 1,
            "comments": {"$literal": []},
            "approval": {"$literal": None}
        }}
    ]
    
    results = []
    async for doc in db.identifikasi_risiko.aggregate(pipeline):
        # Convert ObjectId to string
        doc["id"] = str(doc["_id"])
        
        # Get comments
        comments = []
        async for comment in db.komentar.find({
            "tipe_komentar": TipeKomentar.IDENTIFIKASI,
            "$or": [
                {"ref_id": str(doc["_id"])},
                {"id_identifikasi_risiko": str(doc["_id"])}
            ]
        }).sort("created_at", 1):  # Sort by creation date ascending
            # Convert ObjectId to string and prepare comment data
            comment_data = {
                "id": str(comment["_id"]),
                "text": comment.get("konten", ""),  # Map konten to text
                "type": "IDENTIFIKASI",  # Add required type field
                "tipe_komentar": comment.get("tipe_komentar", "IDENTIFIKASI"),
                "konten": comment.get("konten", ""),
                "id_instansi": comment.get("id_instansi", ""),
                "user_id": comment.get("user_id", ""),
                "nama_user": comment.get("nama_user", ""),
                "created_at": comment.get("created_at", datetime.utcnow()),
                "created_by": comment.get("created_by"),
                "updated_at": comment.get("updated_at"),
                "ref_id": str(doc["_id"]),  # Add ref_id field
                "id_identifikasi_risiko": str(doc["_id"])  # Add required field
            }
            comments.append(comment_data)
        
        # Add comments to document
        doc["comments"] = comments
        
        # Get related data
        try:
            jenis_sasaran = await db.jenis_konteks.find_one({"_id": ObjectId(doc["id_jenis_konteks_sasaran"])})
            konteks_sasaran = await db.konteks.find_one({"_id": ObjectId(doc["id_konteks_sasaran"])})
            indikator = await db.indikator.find_one({"_id": ObjectId(doc["id_indikator"])})
            konteks_probis = await db.konteks.find_one({"_id": ObjectId(doc["id_konteks_probis"])})
            kategori_risiko = await db.kategori_risiko.find_one({"_id": ObjectId(doc["id_kategori_risiko"])})
            
            # Get approval data if status is APPROVED or REJECTED
            approval = None
            if doc.get("status_approval") in ["APPROVED", "REJECTED"]:
                approval = await db.approval.find_one({
                    "id_identifikasi_risiko": str(doc["_id"]),
                    "type": "IDENTIFIKASI",
                    "status": doc["status_approval"]
                }, sort=[("created_at", -1)])
                
                if approval:
                    # Format approval data consistently
                    approval_response = {
                        "id": str(approval["_id"]),
                        "type": approval["type"],
                        "status": approval["status"],
                        "notes": approval.get("notes", ""),
                        "catatan": approval.get("notes", ""),  # For backwards compatibility
                        "data": {
                            "identifikasi_risiko_id": str(doc["_id"]),
                            "pernyataan_risiko": doc.get("pernyataan_risiko", ""),
                            "deskripsi": doc.get("deskripsi", ""),
                            "tahun": doc.get("tahun"),
                            "id_instansi": doc.get("id_instansi"),
                            "notes": approval.get("notes", ""),
                            "approved_by": approval["created_by"],
                            "approved_by_name": approval.get("created_by_name", ""),
                            "approved_at": approval["created_at"]
                        },
                        "id_identifikasi_risiko": approval["id_identifikasi_risiko"],
                        "approved_by": approval["created_by"],
                        "approved_at": approval["created_at"],
                        "created_at": approval["created_at"],
                        "updated_at": approval.get("updated_at"),
                        "created_by": approval["created_by"],
                        "updated_by": approval.get("updated_by")
                    }
                    approval = approval_response
            
            # Get comment count
            comment_count = await db.komentar.count_documents({
                "ref_id": doc["id"],
                "ref_type": "IDENTIFIKASI"
            })
            
            # Add related data
            doc["jenis_sasaran"] = jenis_sasaran["nama"] if jenis_sasaran else ""
            doc["nama_sasaran"] = konteks_sasaran["nama"] if konteks_sasaran else ""
            doc["indikator"] = indikator["nama"] if indikator else ""
            doc["nama_probis"] = konteks_probis["nama"] if konteks_probis else ""
            doc["kategori_risiko"] = kategori_risiko["nama"] if kategori_risiko else ""
            doc["jumlah_komentar"] = comment_count
            doc["status"] = "Disabled" if not doc.get("is_enabled", True) else "Enabled"
            doc["approval"] = approval  # Add approval data to response
            
            results.append(IdentifikasiRisikoResponse(**doc))
        except Exception as e:
            # Skip documents with missing related data
            continue
    
    return results

@router.get("/autocomplete")
async def get_autocomplete(
    q: str = Query(..., description="Search query"),
    tahun: Optional[int] = None,
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get autocomplete suggestions for identifikasi risiko.
    """
    db = await Database.get_db()
    
    query = {}
    if tahun:
        query["tahun"] = tahun
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Add text search
    query["$or"] = [
        {"pernyataan_risiko": {"$regex": q, "$options": "i"}},
        {"deskripsi": {"$regex": q, "$options": "i"}}
    ]
    
    results = []
    async for doc in db.identifikasi_risiko.find(query).limit(10):
        doc["id"] = str(doc["_id"])
        results.append({
            "id": doc["id"],
            "text": doc["pernyataan_risiko"],
            "description": doc.get("deskripsi", "")
        })
    
    return results

@router.post("/{id}/submit")
async def submit_for_approval(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit identifikasi risiko for approval.
    """
    db = await Database.get_db()
    
    identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(id)})
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )
    
    # Create approval record
    approval_data = {
        "id_identifikasi_risiko": id,
        "status": ApprovalStatus.SUBMITTED,
        "type": "IDENTIFIKASI",
        "data": identifikasi,
        "created_at": datetime.utcnow(),
        "created_by": str(current_user["id"])
    }
    
    result = await db.approval.insert_one(approval_data)
    
    # Update identifikasi status
    await db.identifikasi_risiko.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "status_approval": ApprovalStatus.SUBMITTED,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["id"])
            }
        }
    )
    
    return {"message": "Risk identification submitted for approval"}

@router.post("/{identifikasi_id}/approve")
async def approve_identifikasi_risiko(
    identifikasi_id: str,
    approval: ApprovalData,
    current_user: dict = Depends(get_current_user)
):
    """
    Approve or reject a risk identification.
    Only SUPER_ADMIN and PENGELOLA_RISIKO can approve/reject.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can approve/reject risk identifications"
        )

    db = await Database.get_db()
    
    # Get existing data
    existing = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )
    
    # Validate KLP access for PENGELOLA_RISIKO
    if current_user["role"] != UserRole.SUPER_ADMIN:
        konteks_sasaran = await db.konteks.find_one({
            "_id": ObjectId(existing["id_konteks_sasaran"])
        })
        
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only approve/reject risk identifications for your assigned KLP"
            )

    # Create approval record
    approval_status = ApprovalStatus.APPROVED if approval.is_approved else ApprovalStatus.REJECTED
    approval_data = {
        "id_identifikasi_risiko": identifikasi_id,
        "type": "IDENTIFIKASI",
        "status": approval_status,
        "notes": approval.notes,
        "created_at": datetime.utcnow(),
        "created_by": str(current_user["id"]),
        "created_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
        "data": {
            "identifikasi_risiko_id": str(existing["_id"]),
            "pernyataan_risiko": existing.get("pernyataan_risiko", ""),
            "deskripsi": existing.get("deskripsi", ""),
            "tahun": existing.get("tahun"),
            "id_instansi": existing.get("id_instansi"),
            "notes": approval.notes,
            "approved_by": str(current_user["id"]),
            "approved_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
            "approved_at": datetime.utcnow()
        }
    }
    
    approval_result = await db.approval.insert_one(approval_data)

    # Build update data for identifikasi risiko
    update_data = {
        "status_approval": approval_status,
        "approval_notes": approval.notes,
        "approved_at": datetime.utcnow(),
        "approved_by": str(current_user["id"]),
        "approved_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}",
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"])
    }

    # Update document
    result = await db.identifikasi_risiko.update_one(
        {"_id": ObjectId(identifikasi_id)},
        {"$set": update_data}
    )

    # Get updated document with approval
    updated = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found after update"
        )

    # Convert ObjectId to string and prepare response
    updated_response = {
        **updated,
        "id": str(updated["_id"]),
        "_id": str(updated["_id"])
    }
    del updated_response["_id"]

    # Get and prepare the approval data
    approval_doc = await db.approval.find_one({"_id": approval_result.inserted_id})
    if approval_doc:
        approval_response = {
            "id": str(approval_doc["_id"]),
            "type": approval_doc["type"],
            "status": approval_doc["status"],
            "notes": approval_doc["notes"],
            "created_at": approval_doc["created_at"],
            "created_by": approval_doc["created_by"],
            "created_by_name": approval_doc["created_by_name"],
            "data": approval_doc["data"]
        }
    else:
        approval_response = None
    
    return {
        "message": f"Risk identification {'approved' if approval.is_approved else 'rejected'}",
        "data": {
            **updated_response,
            "approval": approval_response
        }
    }

@router.post("/{identifikasi_id}/enable")
async def enable_identifikasi_risiko(
    identifikasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Enable a risk identification.
    Only SUPER_ADMIN and PENGELOLA_RISIKO can enable.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can enable risk identifications"
        )

    db = await Database.get_db()
    
    # Get existing data
    existing = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate KLP access for PENGELOLA_RISIKO
    if current_user["role"] != UserRole.SUPER_ADMIN:
        konteks_sasaran = await db.konteks.find_one({
            "_id": ObjectId(existing["id_konteks_sasaran"])
        })
        
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only enable risk identifications for your assigned KLP"
            )

    # Build update data
    update_data = {
        "disabled": False,
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"])
    }

    # Update document
    result = await db.identifikasi_risiko.update_one(
        {"_id": ObjectId(identifikasi_id)},
        {
            "$set": update_data,
            "$unset": {"disabled_reason": ""}
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found or no changes made"
        )

    return {"message": "Risk identification enabled"}

@router.post("/{identifikasi_id}/disable")
async def disable_identifikasi_risiko(
    identifikasi_id: str,
    disable_data: DisableData,
    current_user: dict = Depends(get_current_user)
):
    """
    Disable a risk identification.
    Only SUPER_ADMIN and PENGELOLA_RISIKO can disable.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can disable risk identifications"
        )

    db = await Database.get_db()
    
    # Get existing data
    existing = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate KLP access for PENGELOLA_RISIKO
    if current_user["role"] != UserRole.SUPER_ADMIN:
        konteks_sasaran = await db.konteks.find_one({
            "_id": ObjectId(existing["id_konteks_sasaran"])
        })
        
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only disable risk identifications for your assigned KLP"
            )

    # Build update data
    update_data = {
        "disabled": True,
        "disabled_reason": disable_data.reason,
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"])
    }

    # Update document
    result = await db.identifikasi_risiko.update_one(
        {"_id": ObjectId(identifikasi_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found or no changes made"
        )

    return {"message": "Risk identification disabled"}

@router.put("/{identifikasi_id}", response_model=IdentifikasiRisikoResponse)
async def update_identifikasi_risiko(
    identifikasi_id: str,
    identifikasi: IdentifikasiRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk identification.
    Can update:
    - Selected data (contexts, indicator, risk)
    - Impact description
    - Enable/disable status
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk identifications"
        )

    db = await Database.get_db()
    
    # Get existing data
    existing = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate KLP access for PENGELOLA_RISIKO
    if current_user["role"] != UserRole.SUPER_ADMIN:
        konteks_sasaran = await db.konteks.find_one({
            "_id": ObjectId(existing["id_konteks_sasaran"])
        })
        
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update risk identifications for your assigned KLP"
            )

    # Build update data
    update_data = identifikasi.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["id"])

    # Update document
    result = await db.identifikasi_risiko.update_one(
        {"_id": ObjectId(identifikasi_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found or no changes made"
        )

    # If pernyataan_risiko was updated, update or create kamus_risiko entry
    if "pernyataan_risiko" in update_data:
        # Get updated document to access the full data
        updated_identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
        
        # Check if this risk statement already exists in kamus_risiko
        existing_kamus = await db.kamus_risiko.find_one({
            "nama": update_data["pernyataan_risiko"],
            "id_instansi": updated_identifikasi["id_instansi"]
        })
        
        if not existing_kamus:
            # Get kategori_risiko for additional data
            kategori_risiko = await db.kategori_risiko.find_one({
                "_id": ObjectId(updated_identifikasi["id_kategori_risiko"])
            })
            
            # Generate a unique code for the kamus_risiko entry
            year = str(updated_identifikasi["tahun"])
            count = await db.kamus_risiko.count_documents({"id_instansi": updated_identifikasi["id_instansi"]})
            kode = f"R-{year}-{count+1:03d}"
            
            # Create a new kamus_risiko entry
            kamus_data = {
                "kode": kode,
                "nama": update_data["pernyataan_risiko"],
                "id_kategori_risiko": updated_identifikasi["id_kategori_risiko"],
                "id_instansi": updated_identifikasi["id_instansi"],
                "created_at": datetime.utcnow(),
                "nama_klp": kategori_risiko.get("nama_klp", "") if kategori_risiko else "",
                "nama_kategori": kategori_risiko.get("nama", "") if kategori_risiko else ""
            }
            await db.kamus_risiko.insert_one(kamus_data)

    # Get updated document
    updated = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found after update"
        )

    # Convert _id to string
    updated["id"] = str(updated.pop("_id"))
    return updated

@router.delete("/{identifikasi_id}")
async def delete_identifikasi_risiko(
    identifikasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk identification.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can delete risk identifications"
        )

    db = await Database.get_db()

    # Get existing data first for validation
    existing = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate KLP access for PENGELOLA_RISIKO
    if current_user["role"] != UserRole.SUPER_ADMIN:
        konteks_sasaran = await db.konteks.find_one({
            "_id": ObjectId(existing["id_konteks_sasaran"])
        })
        
        assigned_struktur = None
        async for struktur in db.struktur_organisasi.find({"id_instansi": existing["id_instansi"]}):
            for assigned_user in struktur.get("assigned_users", []):
                if assigned_user["user_id"] == str(current_user["id"]):
                    assigned_struktur = struktur
                    break
            if assigned_struktur:
                break

        if not assigned_struktur or str(assigned_struktur["id_induk_unit_kerja"]) != konteks_sasaran["id_induk_unit_kerja"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete risk identifications for your assigned KLP"
            )

    # Validate if analysis exists for next year
    next_year = datetime.now().year + 1
    analysis_exists = await db.analisis_risiko.find_one({
        "identifikasi_risiko_id": identifikasi_id,
        "tahun": next_year
    })
    if analysis_exists:
        raise HTTPException(
            status_code=422,
            detail="Cannot disable risk that has analysis in next year"
        )

    # Add approval flow
    approval_data = {
        "type": "APPROVAL-IDENTIFIKASIRISIKO",
        "user_id": str(current_user["id"]), 
        "data": {
            "klp_id": existing["id_instansi"],
            "identifikasi_risiko_id": identifikasi_id,
            "proposed_by": str(current_user["id"]),
            "type": "DELETE",
            "description": "Hapus identifikasi risiko"
        }
    }
    await db.approval.insert_one(approval_data)

    result = await db.identifikasi_risiko.delete_one({"_id": ObjectId(identifikasi_id)})
    return {"message": "Risk identification deleted successfully"}

@router.post("/generate-statements", response_model=RiskStatementGenerationResponse)
async def generate_risk_statements_endpoint(
    request: RiskStatementGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate risk statements using Azure OpenAI based on the provided context IDs.
    
    This endpoint uses Azure OpenAI to generate risk statements based on the target context,
    indicator, and business process context IDs.
    
    Parameters:
    - id_konteks_sasaran: Target context ID
    - id_indikator: Indicator ID
    - id_konteks_probis: Business process context ID
    - count: Number of risk statements to generate (default: 5)
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can generate risk statements"
        )
    
    db = await Database.get_db()
    
    # Fetch konteks sasaran
    konteks_sasaran = await db.konteks.find_one({"_id": ObjectId(request.id_konteks_sasaran)})
    if not konteks_sasaran:
        raise HTTPException(status_code=404, detail="Target context not found")
    
    # Fetch jenis konteks sasaran to get the proper name
    jenis_konteks_sasaran = None
    struktur = await db.struktur_organisasi.find_one({
        "jenis_konteks": {
            "$elemMatch": {
                "id": konteks_sasaran.get("id_jenis_konteks")
            }
        }
    })
    
    if struktur:
        for jk in struktur.get("jenis_konteks", []):
            if jk.get("id") == konteks_sasaran.get("id_jenis_konteks"):
                jenis_konteks_sasaran = jk
                break
    
    # Fetch indikator
    indikator = await db.indikator.find_one({"_id": ObjectId(request.id_indikator)})
    if not indikator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    
    # Fetch konteks probis
    konteks_probis = await db.konteks.find_one({"_id": ObjectId(request.id_konteks_probis)})
    if not konteks_probis:
        raise HTTPException(status_code=404, detail="Business process context not found")
    
    # Call the Azure OpenAI utility to generate risk statements
    result = await generate_risk_statements(
        nama_sasaran=jenis_konteks_sasaran.get("nama", "Sasaran") if jenis_konteks_sasaran else "Sasaran",
        konteks_sasaran=konteks_sasaran.get("nama", ""),
        indikator=indikator.get("nama", ""),
        konteks_probis=konteks_probis.get("nama", ""),
        count=request.count
    )
    
    # Return the generation result with the generation_id
    return {
        "generation_id": result["generation_id"],
        "statements": [
            RiskStatement(
                id=statement["id"],
                pernyataan_risiko=statement["pernyataan"],
                deskripsi=statement.get("deskripsi"),
                tag=statement.get("tag", "NORMAL")
            ) for statement in result["statements"]
        ]
    }

@router.post("/select-statements")
async def select_risk_statements(
    request: RiskStatementSelectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Select risk statements from a generation session.
    
    This endpoint allows users to select which generated risk statements they want to keep.
    The selected statements will be returned, and the non-selected ones will be discarded.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can select risk statements"
        )
    
    # Get the selected statements
    selected_statements = get_selected_statements(
        generation_id=request.generation_id,
        selected_ids=request.selected_ids
    )
    
    # Return the selected statements
    return {
        "selected_statements": selected_statements
    }

@router.delete("/cleanup-generation/{generation_id}")
async def cleanup_generation(
    generation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Clean up a generation session.
    
    This endpoint removes all generated risk statements for a specific generation session.
    It should be called when the user is done with the generation session.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can clean up generation sessions"
        )
    
    # Clean up the generation session
    cleanup_generation_session(generation_id)
    
    return {"message": "Generation session cleaned up successfully"}

@router.get("/summary")
async def get_identifikasi_risiko_summary(
    tahun: int = Query(..., description="Year"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive summary for each identifikasi_risiko, including risk levels, 
    attachment count, and RTP count.
    Joins data from analisis_risiko and rtp collections.
    """
    db = await Database.get_db()
    
    # Build base query for identifikasi_risiko
    query = {"tahun": tahun, "id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja

    # Simpler approach using multiple queries
    identifikasi_list = await db.identifikasi_risiko.find(query).to_list(None)
    
    result = []
    for identifikasi in identifikasi_list:
        identifikasi_id = str(identifikasi["_id"])
        
        # Get analisis_risiko
        analisis = await db.analisis_risiko.find_one({
            "identifikasi_risiko_id": identifikasi_id,
            "tahun": tahun
        })
        
        # Count RTPs through evaluasi_risiko and track realized RTPs
        total_rtp_count = 0
        realized_rtp_count = 0
        evaluasi_cursor = db.evaluasi_risiko.find({"identifikasi_risiko_id": identifikasi_id})
        async for evaluasi in evaluasi_cursor:
            evaluasi_id = str(evaluasi["_id"])
            # Get all RTPs for this evaluasi
            rtp_cursor = db.rtp.find({"evaluasi_risiko_id": evaluasi_id})
            async for rtp in rtp_cursor:
                total_rtp_count += 1
                # Check if RTP has been realized
                if rtp.get("tanggal_realisasi") is not None:
                    realized_rtp_count += 1
        
        # Count attachments
        attachment_count = 0
        analisis_id = None
        
        if analisis:
            analisis_id = str(analisis["_id"])
            # First check for attachments linked to analisis_risiko
            attachment_count = await db.attachments.count_documents({
                "$or": [
                    {"ref_id": analisis_id, "type": {"$regex": "^PENGENDALIAN"}},
                    {"id_analisis_risiko": analisis_id, "type": {"$regex": "^PENGENDALIAN"}},
                    {"analisis_risiko_id": analisis_id, "type": {"$regex": "^PENGENDALIAN"}}
                ]
            })
        
        # If no attachments found with analisis, check identifikasi
        if attachment_count == 0:
            attachment_count = await db.attachments.count_documents({
                "$or": [
                    {"ref_id": identifikasi_id},
                    {"id_identifikasi_risiko": identifikasi_id},
                    {"identifikasi_risiko_id": identifikasi_id}
                ]
            })
        
        # Create summary item
        summary_item = {
            "id_identifikasi": identifikasi_id,
            "pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
            "attachment_count": attachment_count,
            "rtp_count": f"{realized_rtp_count}/{total_rtp_count}"  # Format as fraction
        }
        
        # Add risk level fields (always include them even if null)
        summary_item.update({
            "level_risiko_inherit": 0,
            "level_risiko_residual": 0,
            "level_risiko_treated": 0,
            "level_risiko_actual": 0
        })
        
        # Update with actual values if analisis exists
        if analisis:
            # If analisis exists, recalculate all risk levels to ensure consistency
            try:
                # Get selera_risiko for risk appetite check
                selera_risiko = await get_selera_risiko(db, identifikasi_id)
                
                # Recalculate inherit risk level
                if analisis.get("skor_kemungkinan_inherit", 0) > 0 and analisis.get("skor_dampak_inherit", 0) > 0:
                    level_risiko_inherit = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_inherit", 0)),
                        float(analisis.get("skor_dampak_inherit", 0))
                    )
                    summary_item["level_risiko_inherit"] = level_risiko_inherit
                    summary_item["memenuhi_inherit"] = await calculate_memenuhi(level_risiko_inherit, selera_risiko)
                
                # For residual risk, recalculate if there are attachments and scores are available
                skor_kemungkinan_residual = float(analisis.get("skor_kemungkinan_residual", 0))
                skor_dampak_residual = float(analisis.get("skor_dampak_residual", 0))
                
                if skor_kemungkinan_residual > 0 and skor_dampak_residual > 0:
                    # If there are attachments, recalculate the level
                    if attachment_count > 0:
                        level_risiko_residual = await calculate_risk_level(
                            skor_kemungkinan_residual,
                            skor_dampak_residual
                        )
                        summary_item["level_risiko_residual"] = level_risiko_residual
                        summary_item["memenuhi_residual"] = await calculate_memenuhi(level_risiko_residual, selera_risiko)
                    else:
                        # If no attachments but stored level exists, use it
                        stored_level = analisis.get("level_risiko_residual", 0)
                        if stored_level > 0:
                            summary_item["level_risiko_residual"] = stored_level
                            summary_item["memenuhi_residual"] = analisis.get("memenuhi_residual", False)
                
                # Recalculate treated risk level
                if analisis.get("skor_kemungkinan_treated", 0) > 0 and analisis.get("skor_dampak_treated", 0) > 0:
                    level_risiko_treated = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_treated", 0)),
                        float(analisis.get("skor_dampak_treated", 0))
                    )
                    summary_item["level_risiko_treated"] = level_risiko_treated
                    summary_item["memenuhi_treated"] = await calculate_memenuhi(level_risiko_treated, selera_risiko)
                
                # Recalculate actual risk level
                if analisis.get("skor_kemungkinan_actual", 0) > 0 and analisis.get("skor_dampak_actual", 0) > 0:
                    level_risiko_actual = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_actual", 0)),
                        float(analisis.get("skor_dampak_actual", 0))
                    )
                    summary_item["level_risiko_actual"] = level_risiko_actual
                    summary_item["memenuhi_actual"] = await calculate_memenuhi(level_risiko_actual, selera_risiko)
                
                # Set memenuhi flag based on use_risk setting
                if analisis.get("use_risk") == "A" and analisis.get("skor_kemungkinan_actual", 0) > 0:
                    summary_item["memenuhi"] = summary_item.get("memenuhi_actual", False)
                elif analisis.get("use_risk") == "T":
                    summary_item["memenuhi"] = summary_item.get("memenuhi_treated", False)
                elif analisis.get("use_risk") == "R":
                    summary_item["memenuhi"] = summary_item.get("memenuhi_residual", False)
                else:
                    summary_item["memenuhi"] = summary_item.get("memenuhi_inherit", False)
            except Exception:
                # If there's an error in calculation, use the stored values
                summary_item.update({
                    "level_risiko_inherit": analisis.get("level_risiko_inherit", 0) or 0,
                    "level_risiko_residual": analisis.get("level_risiko_residual", 0) or 0, 
                    "level_risiko_treated": analisis.get("level_risiko_treated", 0) or 0,
                    "level_risiko_actual": analisis.get("level_risiko_actual", 0) or 0,
                    "memenuhi_inherit": analisis.get("memenuhi_inherit", False),
                    "memenuhi_residual": analisis.get("memenuhi_residual", False),
                    "memenuhi_treated": analisis.get("memenuhi_treated", False),  
                    "memenuhi_actual": analisis.get("memenuhi_actual", False),
                    "memenuhi": analisis.get("memenuhi", False)
                })
        
        result.append(summary_item)
    
    return result

@router.get("/{id}", response_model=IdentifikasiRisikoResponse)
async def get_identifikasi_risiko_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk identification by ID.
    """
    db = await Database.get_db()
    
    query = {"_id": ObjectId(id)}
    
    identifikasi = await db.identifikasi_risiko.find_one(query)
    if not identifikasi:
        raise HTTPException(status_code=404, detail="Risk identification not found")
    
    # Format response data
    doc = {
        "id": str(identifikasi["_id"]),
        "tahun": identifikasi["tahun"],
        "id_instansi": identifikasi["id_instansi"],
        "id_jenis_konteks_sasaran": identifikasi["id_jenis_konteks_sasaran"],
        "id_konteks_sasaran": identifikasi["id_konteks_sasaran"],
        "id_konteks_probis": identifikasi["id_konteks_probis"],
        "id_indikator": identifikasi["id_indikator"],
        "id_bagan_risiko": identifikasi["id_bagan_risiko"],
        "id_kategori_risiko": identifikasi["id_kategori_risiko"],
        "id_metode_spip": identifikasi.get("id_metode_spip"),
        "id_induk_unit_kerja": identifikasi.get("id_induk_unit_kerja"),
        "pernyataan_risiko": identifikasi.get("pernyataan_risiko"),
        "deskripsi": identifikasi.get("deskripsi"),
        "status_approval": identifikasi.get("status_approval", "DRAFT"),
        "is_enabled": not identifikasi.get("disabled", False),
        "created_at": identifikasi.get("created_at"),
        "created_by": identifikasi.get("created_by", ""),
        "created_by_name": identifikasi.get("created_by_name", ""),
        "updated_at": identifikasi.get("updated_at"),
        "disabled": identifikasi.get("disabled", False),
        "disabled_reason": identifikasi.get("disabled_reason"),
        "uraian_dampak": identifikasi.get("uraian_dampak"),
        "comments": [],
        "approval": None
    }
    
    # Get comments
    comments = []
    async for comment in db.komentar.find({
        "ref_id": id,
        "tipe_komentar": TipeKomentar.IDENTIFIKASI
    }).sort("created_at", 1):
        # Ensure text and type fields are set for compatibility
        if "text" not in comment:
            comment["text"] = comment.get("konten", "")
        if "type" not in comment:
            comment["type"] = comment.get("tipe_komentar", "IDENTIFIKASI")
        
        # Convert ObjectId to string and prepare comment data
        comment_data = {
            "id": str(comment["_id"]),
            "text": comment.get("text", comment.get("konten", "")),
            "type": comment.get("type", comment.get("tipe_komentar", "IDENTIFIKASI")),
            "tipe_komentar": comment.get("tipe_komentar", "IDENTIFIKASI"),
            "konten": comment.get("konten", ""),
            "id_instansi": comment.get("id_instansi", ""),
            "user_id": comment.get("user_id", ""),
            "nama_user": comment.get("nama_user", ""),
            "created_at": comment.get("created_at", datetime.utcnow()),
            "created_by": comment.get("created_by"),
            "updated_at": comment.get("updated_at"),
            "ref_id": str(doc["id"]),
            "id_identifikasi_risiko": str(doc["id"]),
            "status": comment.get("status", "OPEN"),
            "metadata": comment.get("metadata", {})
        }
        
        # Get replies if any
        if comment.get("depth", 0) == 0:  # Only for top-level comments
            replies = []
            async for reply in db.komentar.find({
                "parent_id": str(comment["_id"])
            }).sort("created_at", 1):
                # Ensure text and type fields for replies too
                if "text" not in reply:
                    reply["text"] = reply.get("konten", "")
                if "type" not in reply:
                    reply["type"] = reply.get("tipe_komentar", "IDENTIFIKASI")
                
                reply_data = {
                    "id": str(reply["_id"]),
                    "text": reply.get("text", reply.get("konten", "")),
                    "type": reply.get("type", reply.get("tipe_komentar", "IDENTIFIKASI")),
                    "tipe_komentar": reply.get("tipe_komentar", "IDENTIFIKASI"),
                    "konten": reply.get("konten", ""),
                    "id_instansi": reply.get("id_instansi", ""),
                    "user_id": reply.get("user_id", ""),
                    "nama_user": reply.get("nama_user", ""),
                    "created_at": reply.get("created_at", datetime.utcnow()),
                    "parent_id": str(comment["_id"]),
                    "depth": reply.get("depth", 1),
                    "ref_id": str(doc["id"]),
                    "status": reply.get("status", "OPEN"),
                    "metadata": reply.get("metadata", {})
                }
                replies.append(reply_data)
            
            comment_data["replies"] = replies
        else:
            comment_data["replies"] = []
            
        comments.append(comment_data)
    
    doc["comments"] = comments
    
    # Get approval data if status is not DRAFT
    if doc["status_approval"] != "DRAFT":
        approval = await db.approval.find_one({
            "id_identifikasi_risiko": id,
            "type": "IDENTIFIKASI",
            "status": doc["status_approval"]
        }, sort=[("created_at", -1)])
        
        if approval:
            # Format approval data
            approval_response = {
                "id": str(approval["_id"]),
                "type": approval["type"],
                "status": approval["status"],
                "notes": approval.get("notes", ""),
                "catatan": approval.get("notes", ""),
                "data": {
                    "identifikasi_risiko_id": id,
                    "pernyataan_risiko": doc.get("pernyataan_risiko", ""),
                    "deskripsi": doc.get("deskripsi", ""),
                    "tahun": doc.get("tahun"),
                    "id_instansi": doc.get("id_instansi"),
                    "notes": approval.get("notes", ""),
                    "approved_by": approval["created_by"],
                    "approved_by_name": approval.get("created_by_name", ""),
                    "approved_at": approval["created_at"]
                },
                "id_identifikasi_risiko": approval["id_identifikasi_risiko"],
                "approved_by": approval["created_by"],
                "approved_at": approval["created_at"],
                "created_at": approval["created_at"],
                "updated_at": approval.get("updated_at"),
                "created_by": approval["created_by"],
                "updated_by": approval.get("updated_by")
            }
            doc["approval"] = approval_response
    
    # Get related data to enrich response
    try:
        jenis_sasaran = await db.jenis_konteks.find_one({"_id": ObjectId(doc["id_jenis_konteks_sasaran"])})
        konteks_sasaran = await db.konteks.find_one({"_id": ObjectId(doc["id_konteks_sasaran"])})
        indikator = await db.indikator.find_one({"_id": ObjectId(doc["id_indikator"])})
        konteks_probis = await db.konteks.find_one({"_id": ObjectId(doc["id_konteks_probis"])})
        kategori_risiko = await db.kategori_risiko.find_one({"_id": ObjectId(doc["id_kategori_risiko"])})
        
        # Add related data
        doc["jenis_sasaran"] = jenis_sasaran["nama"] if jenis_sasaran else ""
        doc["nama_sasaran"] = konteks_sasaran["nama"] if konteks_sasaran else ""
        doc["indikator"] = indikator["nama"] if indikator else ""
        doc["nama_probis"] = konteks_probis["nama"] if konteks_probis else ""
        doc["kategori_risiko"] = kategori_risiko["nama"] if kategori_risiko else ""
        doc["status"] = "Disabled" if not doc.get("is_enabled", True) else "Enabled"
    except Exception as e:
        # Continue even if related data is missing
        pass
    
    return IdentifikasiRisikoResponse(**doc) 