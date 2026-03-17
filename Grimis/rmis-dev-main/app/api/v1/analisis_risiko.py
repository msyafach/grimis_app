from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body, status
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from bson import ObjectId
import os
import base64
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import bson.errors
import gridfs

from app.schemas.risk import (
    AnalisisRisikoCreate,
    AnalisisRisikoUpdate,
    AnalisisRisikoResponse,
    KomentarResponse,
    ApprovalStatus,
    AttachmentResponse,
    AttachmentType,
    KomentarType,
    RiskScoreResponse,
    RiskScoreUpdate,
    MonitoringRisikoResponse,
    MonitoringStatus
)
from app.schemas.user import UserRole
from app.schemas.comment import TipeKomentar
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

async def get_kriteria_by_id(db: Database, kriteria_id: str, jenis: str):
    """Helper function to get kriteria by ID"""
    if not kriteria_id:
        raise HTTPException(
            status_code=400,
            detail=f"Missing {jenis.lower()} criteria ID"
        )
        
    collection = db.kriteria_kemungkinan if jenis == "KEMUNGKINAN" else db.kriteria_dampak
    
    # Handle potential ObjectId conversion errors
    try:
        obj_id = ObjectId(kriteria_id)
    except (TypeError, bson.errors.InvalidId):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {jenis.lower()} criteria ID format: {kriteria_id}"
        )
    
    kriteria = await collection.find_one({"_id": obj_id})
    if not kriteria:
        raise HTTPException(
            status_code=404, 
            detail=f"Kriteria {jenis.lower()} not found with ID: {kriteria_id}"
        )
    return kriteria

async def get_matrix_value_for_criteria(db: Database, kriteria_id: str, jenis: str, template_id: str = None):
    """
    Get the matrix value associated with a criteria based on its classification
    
    Args:
        db: Database connection
        kriteria_id: ID of the criteria (kemungkinan or dampak)
        jenis: Type of criteria ("KEMUNGKINAN" or "DAMPAK")
        template_id: Optional template ID to use for lookup
        
    Returns:
        The matrix value (score) associated with the criteria
    """
    # Get the criteria details first
    kriteria = await get_kriteria_by_id(db, kriteria_id, jenis)
    
    # If no template_id provided, try to find one from the criteria's induk_unit_kerja
    if not template_id and "id_induk_unit_kerja" in kriteria:
        # Find the template for this induk_unit_kerja
        template = await db.peta_risiko_template.find_one({
            "id_induk_unit_kerja": kriteria.get("id_induk_unit_kerja")
        })
        if template:
            template_id = str(template["_id"])
    
    # If we still don't have a template ID, we can't proceed
    if not template_id:
        # Just return the criteria's nilai as fallback
        return float(kriteria.get("nilai", 0))
    
    # Convert jenis to the format used in peta_risiko
    jenis_peta = "FREKUENSI" if jenis == "KEMUNGKINAN" else "DAMPAK"
    
    # Find the corresponding klasifikasi for this criteria
    klasifikasi = None
    async for klas in db.peta_risiko_klasifikasi.find({
        "template_id": template_id,
        "jenis": jenis_peta,
        "key": int(float(kriteria.get("nilai", 0)))  # Match by nilai converted to int
    }):
        klasifikasi = klas
        break
    
    if not klasifikasi:
        # Fallback to criteria's nilai if no matching classification
        return float(kriteria.get("nilai", 0))
    
    # Now find the matrix value for this classification
    matriks = None
    async for mat in db.peta_risiko_matriks.find({
        "template_id": template_id,
        "jenis": jenis_peta,
        "klasifikasi": klasifikasi.get("key", 0)
    }):
        matriks = mat
        break
    
    if not matriks:
        # Fallback to criteria's nilai if no matching matrix
        return float(kriteria.get("nilai", 0))
    
    # Return the matrix value, converting to float if possible
    matrix_value = matriks.get("value", "0")
    try:
        return float(matrix_value)
    except (ValueError, TypeError):
        # If value can't be converted to float, return original nilai
        return float(kriteria.get("nilai", 0))

async def calculate_risk_score(skor_kemungkinan: float, skor_dampak: float) -> float:
    """Calculate risk score from probability and impact scores"""
    return skor_kemungkinan * skor_dampak

async def calculate_risk_level(db: Database, template_id: str, skor_kemungkinan: Union[float, int], skor_dampak: Union[float, int]) -> int:
    """Calculate risk level based on kemungkinan and dampak scores for a specific template
    
    The level is determined by looking up the value in the peta_risiko_matriks_heatmap table.
    """
    # Ensure values are treated as floats for calculation
    skor_kemungkinan = float(skor_kemungkinan)
    skor_dampak = float(skor_dampak)
    
    # Return 0 if either score is 0
    if skor_kemungkinan == 0 or skor_dampak == 0:
        return 0
    
    # Look up the risk level from the heatmap table for this specific template
    heatmap_cell = await db.peta_risiko_matriks_heatmap.find_one({
        "template_id": template_id,
        "frekuensi": skor_kemungkinan,
        "dampak": skor_dampak
    })
    
    if heatmap_cell and "value" in heatmap_cell:
        value = heatmap_cell["value"]
        # Convert string value to integer if possible
        if isinstance(value, str) and value.isdigit():
            return int(value)
        elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
            # Handle float string values
            return int(float(value))
        elif isinstance(value, (int, float)):
            return int(value)
    
    # If no exact match found, try to find closest match with same scores
    try:
        # Try to find cells with the same frequency (kemungkinan)
        same_freq_cell = await db.peta_risiko_matriks_heatmap.find_one({
            "frekuensi": skor_kemungkinan
        })
        
        if same_freq_cell and "value" in same_freq_cell:
            value = same_freq_cell["value"]
            if isinstance(value, str) and value.isdigit():
                return int(value)
            elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                return int(float(value))
            elif isinstance(value, (int, float)):
                return int(value)
        
        # Try to find cells with the same impact (dampak)
        same_impact_cell = await db.peta_risiko_matriks_heatmap.find_one({
            "dampak": skor_dampak
        })
        
        if same_impact_cell and "value" in same_impact_cell:
            value = same_impact_cell["value"]
            if isinstance(value, str) and value.isdigit():
                return int(value)
            elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                return int(float(value))
            elif isinstance(value, (int, float)):
                return int(value)
    except Exception:
        # Continue to next fallback
        pass
    
    # Calculate risk score for reference in finding closest level
    risk_score = skor_kemungkinan * skor_dampak
    
    # Fetch some heatmap cell to determine the right template to use
    try:
        sample_cell = await db.peta_risiko_matriks_heatmap.find_one({})
        
        if sample_cell and "template_id" in sample_cell:
            # Get all cells from the same template to determine risk levels
            cells = []
            async for cell in db.peta_risiko_matriks_heatmap.find({"template_id": sample_cell["template_id"]}):
                if "value" in cell:
                    value = cell["value"]
                    if isinstance(value, str) and value.isdigit():
                        cells.append(int(value))
                    elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                        cells.append(int(float(value)))
                    elif isinstance(value, (int, float)):
                        cells.append(int(value))
            
            # Return the closest value
            if cells:
                cells.sort()
                for level in cells:
                    if risk_score <= level:
                        return level
                return max(cells)  # Return highest level if no match
    except Exception:
        # If we can't get any levels from heatmap, log and return default
        pass
    
    # If no values could be found in the heatmap at all, return a default minimum value of 1
    # to avoid returning zero, which has special meaning (no risk)
    return 1

async def calculate_memenuhi(level_risiko: int, selera_risiko: int) -> bool:
    """Calculate if risk level meets risk appetite"""
    if level_risiko is None:
        return False
    return level_risiko <= selera_risiko

async def get_selera_risiko(db: Database, identifikasi_risiko_id: str) -> int:
    """Get selera_risiko from struktur_organisasi through identifikasi_risiko"""
    identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_risiko_id)})
    if not identifikasi:
        raise HTTPException(status_code=404, detail="Risk identification not found")
        
    # Get struktur_organisasi based on id_instansi
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": identifikasi["id_instansi"]
    })
    if not struktur:
        raise HTTPException(status_code=404, detail="Organization structure not found")
        
    if "selera_risiko" not in struktur:
        raise HTTPException(status_code=400, detail="Risk appetite (selera_risiko) not set in organization structure")
        
    return struktur["selera_risiko"]

async def calculate_all_risk_levels(db: Database, template_id: str, data: dict, selera_risiko: Optional[int] = None) -> dict:
    """Calculate all risk levels for an analysis using a specific template"""
    result = data.copy()
    
    # If selera_risiko not provided, get from the identifikasi_risiko
    if selera_risiko is None and "identifikasi_risiko_id" in data:
        selera_risiko = await get_selera_risiko(db, data["identifikasi_risiko_id"])
    
    # Calculate inherit risk level
    skor_kemungkinan_inherit = float(data.get("skor_kemungkinan_inherit", 0))
    skor_dampak_inherit = float(data.get("skor_dampak_inherit", 0))
    
    if skor_kemungkinan_inherit > 0 and skor_dampak_inherit > 0:
        level_risiko_inherit = await calculate_risk_level(db, template_id, skor_kemungkinan_inherit, skor_dampak_inherit)
        result["level_risiko_inherit"] = level_risiko_inherit
        result["memenuhi_inherit"] = await calculate_memenuhi(level_risiko_inherit, selera_risiko)
    else:
        result["level_risiko_inherit"] = 0
        result["memenuhi_inherit"] = False
    
    # Calculate residual risk level
    skor_kemungkinan_residual = float(data.get("skor_kemungkinan_residual", 0))
    skor_dampak_residual = float(data.get("skor_dampak_residual", 0))
    
    # Check if there are attachments
    attachment_count = 0
    if "id" in data or "_id" in data:
        # Get the ID to check for attachments
        analysis_id = data.get("id", str(data.get("_id", "")))
        if analysis_id:
            # Count attachments of any PENGENDALIAN type for this analysis
            attachment_count = await db.attachments.count_documents({
                "ref_id": analysis_id,
                "type": {"$regex": "^PENGENDALIAN_"}
            })
    
    # Calculate residual risk level based on scores
    if skor_kemungkinan_residual > 0 and skor_dampak_residual > 0:
        # Only calculate if there are attachments
        if attachment_count > 0:
            level_risiko_residual = await calculate_risk_level(db, template_id, float(skor_kemungkinan_residual), float(skor_dampak_residual))
            result["level_risiko_residual"] = level_risiko_residual
            result["memenuhi_residual"] = await calculate_memenuhi(level_risiko_residual, selera_risiko)
        # For new records or records without attachments, don't change level_risiko_residual
        # If level_risiko_residual doesn't exist yet, initialize it to 0
        elif "level_risiko_residual" not in data:
            result["level_risiko_residual"] = 0
            result["memenuhi_residual"] = False
        # Else: Keep existing level_risiko_residual (not updated)
    elif skor_kemungkinan_residual == 0 or skor_dampak_residual == 0:
        result["level_risiko_residual"] = 0
        result["memenuhi_residual"] = False
    
    # Calculate treated risk level
    skor_kemungkinan_treated = float(data.get("skor_kemungkinan_treated", 0))
    skor_dampak_treated = float(data.get("skor_dampak_treated", 0))
    
    if skor_kemungkinan_treated > 0 and skor_dampak_treated > 0:
        level_risiko_treated = await calculate_risk_level(db, template_id, skor_kemungkinan_treated, skor_dampak_treated)
        result["level_risiko_treated"] = level_risiko_treated
        result["memenuhi_treated"] = await calculate_memenuhi(level_risiko_treated, selera_risiko)
    else:
        result["level_risiko_treated"] = 0
        result["memenuhi_treated"] = False
    
    # Calculate actual risk level
    skor_kemungkinan_actual = float(data.get("skor_kemungkinan_actual", 0))
    skor_dampak_actual = float(data.get("skor_dampak_actual", 0))
    
    if skor_kemungkinan_actual > 0 and skor_dampak_actual > 0:
        level_risiko_actual = await calculate_risk_level(db, template_id, skor_kemungkinan_actual, skor_dampak_actual)
        result["level_risiko_actual"] = level_risiko_actual
        result["memenuhi_actual"] = await calculate_memenuhi(level_risiko_actual, selera_risiko)
    else:
        result["level_risiko_actual"] = 0
        result["memenuhi_actual"] = False
    
    # Handle use_risk parameter
    if data.get("use_risk") == "A" and skor_kemungkinan_actual == 0:
        # If using actual risk but actual score is 0, use treated or inherit
        if skor_kemungkinan_treated > 0:
            result["memenuhi"] = result["memenuhi_treated"]
        else:
            result["memenuhi"] = result["memenuhi_inherit"]
    elif data.get("use_risk") == "T":
        result["memenuhi"] = result["memenuhi_treated"]
    elif data.get("use_risk") == "R":
        result["memenuhi"] = result["memenuhi_residual"]
    else:
        result["memenuhi"] = result["memenuhi_inherit"]
    
    return result

@router.post("", response_model=AnalisisRisikoResponse)
async def create_analisis_risiko(
    analisis: AnalisisRisikoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new risk analysis.
    
    You can create a risk analysis with empty risk scores (all set to 0 by default),
    and then update each risk type (inherit, residual, treated, actual) individually later.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can create risk analysis"
        )

    db = await Database.get_db()

    # Validate risk identification exists and get selera_risiko
    selera_risiko = await get_selera_risiko(db, analisis.identifikasi_risiko_id)

    # Get identifikasi risiko to validate id_induk_unit_kerja
    identifikasi = await db.identifikasi_risiko.find_one({
        "_id": ObjectId(analisis.identifikasi_risiko_id)
    })
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Risk identification not found"
        )

    # Validate id_induk_unit_kerja matches
    if identifikasi["id_induk_unit_kerja"] != analisis.id_induk_unit_kerja:
        raise HTTPException(
            status_code=400,
            detail="id_induk_unit_kerja does not match with risk identification"
        )

    # Validate kemungkinan and dampak exist if provided
    if analisis.kemungkinan_id_inherit:
        await get_kriteria_by_id(db, analisis.kemungkinan_id_inherit, "KEMUNGKINAN")
    if analisis.dampak_id_inherit:
        await get_kriteria_by_id(db, analisis.dampak_id_inherit, "DAMPAK")

    # If residual risk criteria are provided, validate them
    if analisis.kemungkinan_id_residual:
        await get_kriteria_by_id(db, analisis.kemungkinan_id_residual, "KEMUNGKINAN")
    if analisis.dampak_id_residual:
        await get_kriteria_by_id(db, analisis.dampak_id_residual, "DAMPAK")
        
    # If treated risk criteria are provided, validate them
    if analisis.kemungkinan_id_treated:
        await get_kriteria_by_id(db, analisis.kemungkinan_id_treated, "KEMUNGKINAN")
    if analisis.dampak_id_treated:
        await get_kriteria_by_id(db, analisis.dampak_id_treated, "DAMPAK")
    
    # If actual risk criteria are provided, validate them
    if analisis.kemungkinan_id_actual:
        await get_kriteria_by_id(db, analisis.kemungkinan_id_actual, "KEMUNGKINAN")
    if analisis.dampak_id_actual:
        await get_kriteria_by_id(db, analisis.dampak_id_actual, "DAMPAK")

    analisis_dict = analisis.dict()
    analisis_dict["created_at"] = datetime.utcnow()
    analisis_dict["created_by"] = str(current_user["id"])
    analisis_dict["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
    analisis_dict["id_instansi"] = identifikasi["id_instansi"]
    
    # Ensure default values are set
    if not analisis_dict.get("skor_kemungkinan_inherit"):
        analisis_dict["skor_kemungkinan_inherit"] = 0
    if not analisis_dict.get("skor_dampak_inherit"):
        analisis_dict["skor_dampak_inherit"] = 0
    if not analisis_dict.get("skor_kemungkinan_residual"):
        analisis_dict["skor_kemungkinan_residual"] = 0
    if not analisis_dict.get("skor_dampak_residual"):
        analisis_dict["skor_dampak_residual"] = 0
    if not analisis_dict.get("skor_kemungkinan_treated"):
        analisis_dict["skor_kemungkinan_treated"] = 0
    if not analisis_dict.get("skor_dampak_treated"):
        analisis_dict["skor_dampak_treated"] = 0
    if not analisis_dict.get("skor_kemungkinan_actual"):
        analisis_dict["skor_kemungkinan_actual"] = 0
    if not analisis_dict.get("skor_dampak_actual"):
        analisis_dict["skor_dampak_actual"] = 0
        
    # Set default use_risk if not provided
    if not analisis_dict.get("use_risk"):
        analisis_dict["use_risk"] = "I"
    
    # Auto-copy inherent criteria IDs to other risk types if they're not provided
    if analisis_dict.get("kemungkinan_id_inherit") and not analisis_dict.get("kemungkinan_id_residual"):
        analisis_dict["kemungkinan_id_residual"] = analisis_dict["kemungkinan_id_inherit"]
    
    if analisis_dict.get("dampak_id_inherit") and not analisis_dict.get("dampak_id_residual"):
        analisis_dict["dampak_id_residual"] = analisis_dict["dampak_id_inherit"]
    
    if analisis_dict.get("kemungkinan_id_inherit") and not analisis_dict.get("kemungkinan_id_treated"):
        analisis_dict["kemungkinan_id_treated"] = analisis_dict["kemungkinan_id_inherit"]
    
    if analisis_dict.get("dampak_id_inherit") and not analisis_dict.get("dampak_id_treated"):
        analisis_dict["dampak_id_treated"] = analisis_dict["dampak_id_inherit"]
    
    if analisis_dict.get("kemungkinan_id_inherit") and not analisis_dict.get("kemungkinan_id_actual"):
        analisis_dict["kemungkinan_id_actual"] = analisis_dict["kemungkinan_id_inherit"]
    
    if analisis_dict.get("dampak_id_inherit") and not analisis_dict.get("dampak_id_actual"):
        analisis_dict["dampak_id_actual"] = analisis_dict["dampak_id_inherit"]
    
    # Get template_id for the given year and unit
    from app.api.v1.peta_risiko import get_or_create_template
    template_id = await get_or_create_template(db, analisis.id_instansi, analisis.tahun, analisis.id_induk_unit_kerja)
    
    # Calculate all risk levels and memenuhi flags
    analisis_dict = await calculate_all_risk_levels(db, template_id, analisis_dict, selera_risiko)

    result = await db.analisis_risiko.insert_one(analisis_dict)
    created = await db.analisis_risiko.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))  # Convert _id to string and remove _id field
    
    return AnalisisRisikoResponse(**created)

@router.get("/{id}", response_model=AnalisisRisikoResponse)
async def get_analisis_risiko_by_id(
    id: str,
    tahun: int = Query(..., description="Year of risk analysis"),
    metadata_filter: Optional[str] = Query(None, description="Filter comments by metadata (e.g. analysis_type=inherent)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk analysis by ID.
    
    Parameters:
    - id: The ID of the risk analysis
    - tahun: The year of the risk analysis
    - metadata_filter: Optional filter for comments based on metadata (e.g. analysis_type=inherent)
    """
    db = await Database.get_db()
    
    # Get analisis risiko
    analisis = await db.analisis_risiko.find_one({
        "_id": ObjectId(id),
        "tahun": tahun
    })
    
    if not analisis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Get identifikasi risiko
    identifikasi = await db.identifikasi_risiko.find_one({
        "_id": ObjectId(analisis["identifikasi_risiko_id"])
    })
    
    if not identifikasi:
        raise HTTPException(
            status_code=404,
            detail="Associated risk identification not found"
        )
    
    # Format response
    response = {
        "id": str(analisis["_id"]),
        "identifikasi_risiko_id": analisis["identifikasi_risiko_id"],
        "tahun": analisis["tahun"],
        "skor_kemungkinan_inherit": analisis.get("skor_kemungkinan_inherit", 0),
        "skor_dampak_inherit": analisis.get("skor_dampak_inherit", 0),
        "skor_risiko_inherit": analisis.get("skor_risiko_inherit", 0),
        "level_risiko_inherit": analisis.get("level_risiko_inherit", 0),
        "skor_kemungkinan_residual": analisis.get("skor_kemungkinan_residual", 0),
        "skor_dampak_residual": analisis.get("skor_dampak_residual", 0),
        "skor_risiko_residual": analisis.get("skor_risiko_residual", 0),
        "level_risiko_residual": analisis.get("level_risiko_residual", 0),
        "skor_kemungkinan_treated": analisis.get("skor_kemungkinan_treated", 0),
        "skor_dampak_treated": analisis.get("skor_dampak_treated", 0),
        "skor_risiko_treated": analisis.get("skor_risiko_treated", 0),
        "level_risiko_treated": analisis.get("level_risiko_treated", 0),
        "skor_kemungkinan_actual": analisis.get("skor_kemungkinan_actual", 0),
        "skor_dampak_actual": analisis.get("skor_dampak_actual", 0),
        "skor_risiko_actual": analisis.get("skor_risiko_actual", 0),
        "level_risiko_actual": analisis.get("level_risiko_actual", 0),
        "use_risk": analisis.get("use_risk", "I"),
        "memenuhi": analisis.get("memenuhi", False),
        "memenuhi_inherit": analisis.get("memenuhi_inherit", False),
        "memenuhi_residual": analisis.get("memenuhi_residual", False),
        "memenuhi_treated": analisis.get("memenuhi_treated", False),
        "memenuhi_actual": analisis.get("memenuhi_actual", False),
        "created_at": analisis.get("created_at"),
        "updated_at": analisis.get("updated_at"),
        "created_by": analisis.get("created_by"),
        "updated_by": analisis.get("updated_by"),
        "kemungkinan_id_inherit": analisis.get("kemungkinan_id_inherit"),
        "dampak_id_inherit": analisis.get("dampak_id_inherit"),
        "kemungkinan_id_residual": analisis.get("kemungkinan_id_residual"),
        "dampak_id_residual": analisis.get("dampak_id_residual"),
        "kemungkinan_id_treated": analisis.get("kemungkinan_id_treated"),
        "dampak_id_treated": analisis.get("dampak_id_treated"),
        "kemungkinan_id_actual": analisis.get("kemungkinan_id_actual"),
        "dampak_id_actual": analisis.get("dampak_id_actual"),
        "pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
        "comments": []
    }
    
    # Get comments
    comments_query = {
        "ref_id": id,
        "tipe_komentar": "ANALISIS"
    }
    
    # Parse metadata filter if provided
    if metadata_filter:
        try:
            key, value = metadata_filter.split('=', 1)
            comments_query[f"metadata.{key}"] = value
        except ValueError:
            # If format is invalid, ignore the filter
            pass
    
    # Get comments
    comments = []
    async for comment in db.komentar.find(comments_query).sort("created_at", 1):
        # Ensure text and type fields are set
        if "text" not in comment:
            comment["text"] = comment.get("konten", "")
        if "type" not in comment:
            comment["type"] = comment.get("tipe_komentar", "ANALISIS")
        
        # Prepare comment data
        comment_data = {
            "id": str(comment["_id"]),
            "text": comment.get("text", comment.get("konten", "")),
            "type": comment.get("type", comment.get("tipe_komentar", "ANALISIS")),
            "tipe_komentar": comment.get("tipe_komentar", "ANALISIS"),
            "konten": comment.get("konten", ""),
            "id_instansi": comment.get("id_instansi", ""),
            "user_id": comment.get("user_id", ""),
            "nama_user": comment.get("nama_user", ""),
            "created_at": comment.get("created_at", datetime.utcnow()),
            "created_by": comment.get("created_by"),
            "updated_at": comment.get("updated_at"),
            "ref_id": id,
            "id_analisis_risiko": id,
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
                    reply["type"] = reply.get("tipe_komentar", "ANALISIS")
                
                reply_data = {
                    "id": str(reply["_id"]),
                    "text": reply.get("text", reply.get("konten", "")),
                    "type": reply.get("type", reply.get("tipe_komentar", "ANALISIS")),
                    "tipe_komentar": reply.get("tipe_komentar", "ANALISIS"),
                    "konten": reply.get("konten", ""),
                    "id_instansi": reply.get("id_instansi", ""),
                    "user_id": reply.get("user_id", ""),
                    "nama_user": reply.get("nama_user", ""),
                    "created_at": reply.get("created_at", datetime.utcnow()),
                    "parent_id": str(comment["_id"]),
                    "depth": reply.get("depth", 1),
                    "ref_id": id,
                    "status": reply.get("status", "OPEN"),
                    "metadata": reply.get("metadata", {})
                }
                replies.append(reply_data)
            
            comment_data["replies"] = replies
        else:
            comment_data["replies"] = []
        
        comments.append(comment_data)
    
    response["comments"] = comments
    
    return response

@router.get("", response_model=List[AnalisisRisikoResponse])
async def get_analisis_risiko_list(
    tahun: int = Query(..., description="Year of risk analysis"),
    identifikasi_risiko_id: Optional[str] = None,
    search: Optional[str] = Query(None, description="Search for related risk identification text"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of risk analyses with optional filtering by year and risk identification.
    Optional search parameter to filter by related identifikasi_risiko text.
    """
    db = await Database.get_db()

    # If search parameter is provided, first find matching identifikasi_risiko records
    matching_identifikasi_ids = []
    if search and not identifikasi_risiko_id:
        # Search in identifikasi_risiko
        search_query = {
            "$or": [
                {"pernyataan_risiko": {"$regex": search, "$options": "i"}},
                {"deskripsi": {"$regex": search, "$options": "i"}},
                {"uraian_dampak": {"$regex": search, "$options": "i"}}
            ]
        }
        
        async for doc in db.identifikasi_risiko.find(search_query):
            matching_identifikasi_ids.append(str(doc["_id"]))
    
    # Base query
    query = {"tahun": tahun}
    
    # Apply identifikasi_risiko_id filter
    if identifikasi_risiko_id:
        query["identifikasi_risiko_id"] = identifikasi_risiko_id
    elif matching_identifikasi_ids:
        query["identifikasi_risiko_id"] = {"$in": matching_identifikasi_ids}
    elif search and not identifikasi_risiko_id and not matching_identifikasi_ids:
        # If we searched for identifikasi but found none, use query that will always return empty result
        # This prevents returning all results when no matches are found
        query["_id"] = {"$exists": False}  # This will never match any documents
    
    # Add direct search in analisis_risiko
    if search:
        # If we already have identifikasi filters, use $and to combine them with direct search
        if "identifikasi_risiko_id" in query:
            direct_search = {
                "$or": [
                    {"created_by_name": {"$regex": search, "$options": "i"}},
                    {"use_risk": {"$regex": search, "$options": "i"}}
                ]
            }
            
            # Try to match IDs or score values if the search looks like a number or ID
            if search.replace(".", "", 1).isdigit():  # Check if it's a potential number
                direct_search["$or"].extend([
                    {"skor_kemungkinan_inherit": float(search) if search.replace(".", "", 1).isdigit() else None},
                    {"skor_dampak_inherit": float(search) if search.replace(".", "", 1).isdigit() else None},
                    {"skor_kemungkinan_residual": float(search) if search.replace(".", "", 1).isdigit() else None},
                    {"skor_dampak_residual": float(search) if search.replace(".", "", 1).isdigit() else None},
                    {"level_risiko_inherit": int(search) if search.isdigit() else None},
                    {"level_risiko_residual": int(search) if search.isdigit() else None}
                ])
            
            if len(search) >= 5 and search.isalnum():  # IDs are usually alphanumeric and longish
                direct_search["$or"].extend([
                    {"_id": {"$regex": search, "$options": "i"}},
                    {"kemungkinan_id_inherit": {"$regex": search, "$options": "i"}},
                    {"dampak_id_inherit": {"$regex": search, "$options": "i"}},
                    {"kemungkinan_id_residual": {"$regex": search, "$options": "i"}},
                    {"dampak_id_residual": {"$regex": search, "$options": "i"}}
                ])
                
            # Combine with existing query using $and
            query = {
                "$and": [
                    query,
                    direct_search
                ]
            }
        else:
            # If no existing identifikasi filters, just add the $or directly
            query["$or"] = [
                {"created_by_name": {"$regex": search, "$options": "i"}},
                {"use_risk": {"$regex": search, "$options": "i"}}
            ]
            
            # Try to match IDs or score values
            if search.replace(".", "", 1).isdigit():  # Check if it's a potential number
                try:
                    float_val = float(search)
                    int_val = int(float_val) if float_val.is_integer() else None
                    
                    query["$or"].extend([
                        {"skor_kemungkinan_inherit": float_val},
                        {"skor_dampak_inherit": float_val},
                        {"skor_kemungkinan_residual": float_val},
                        {"skor_dampak_residual": float_val}
                    ])
                    
                    if int_val is not None:
                        query["$or"].extend([
                            {"level_risiko_inherit": int_val},
                            {"level_risiko_residual": int_val}
                        ])
                except (ValueError, TypeError):
                    pass
            
            if len(search) >= 5 and search.isalnum():  # IDs are usually alphanumeric and longish
                query["$or"].extend([
                    {"_id": {"$regex": search, "$options": "i"}},
                    {"identifikasi_risiko_id": {"$regex": search, "$options": "i"}},
                    {"kemungkinan_id_inherit": {"$regex": search, "$options": "i"}},
                    {"dampak_id_inherit": {"$regex": search, "$options": "i"}},
                    {"kemungkinan_id_residual": {"$regex": search, "$options": "i"}},
                    {"dampak_id_residual": {"$regex": search, "$options": "i"}}
                ])

    pipeline = [
        {"$match": query},
        # Join with identifikasi_risiko to get status_approval
        {"$lookup": {
            "from": "identifikasi_risiko",
            "let": {"id": {"$toObjectId": "$identifikasi_risiko_id"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "identifikasi"
        }},
        {"$unwind": "$identifikasi"},
        # Join with kriteria_kemungkinan for inherit
        {"$lookup": {
            "from": "kriteria_kemungkinan",
            "let": {"id": {"$toObjectId": "$kemungkinan_id_inherit"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "kemungkinan_inherit"
        }},
        {"$unwind": "$kemungkinan_inherit"},
        # Join with kriteria_dampak for inherit
        {"$lookup": {
            "from": "kriteria_dampak",
            "let": {"id": {"$toObjectId": "$dampak_id_inherit"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$id"]}}}
            ],
            "as": "dampak_inherit"
        }},
        {"$unwind": "$dampak_inherit"},
        # Project final fields
        {"$project": {
            "id": {"$toString": "$_id"},
            "tahun": 1,
            "identifikasi_risiko_id": 1,
            "kemungkinan_id_inherit": 1,
            "dampak_id_inherit": 1,
            "kemungkinan_id_residual": 1,
            "dampak_id_residual": 1,
            "skor_kemungkinan_inherit": 1,
            "skor_dampak_inherit": 1,
            "skor_kemungkinan_residual": 1,
            "skor_dampak_residual": 1,
            "skor_kemungkinan_treated": 1,
            "skor_dampak_treated": 1,
            "use_risk": 1,
            "level_risiko_inherit": 1,
            "level_risiko_residual": 1,
            "level_risiko_treated": 1,
            "is_akhir_tahun": 1,
            "created_at": 1,
            "created_by": 1,
            "created_by_name": 1,
            "updated_at": 1,
            "comments": {"$literal": []},
            "memenuhi_inherit": 1,
            "memenuhi_residual": 1
        }}
    ]
    
    results = []
    async for doc in db.analisis_risiko.aggregate(pipeline):
        # Get comments
        comments = []
        async for comment in db.komentar.find({
            "tipe_komentar": TipeKomentar.ANALISIS,
            "$or": [
                {"ref_id": doc["id"]},
                {"id_analisis_risiko": doc["id"]}
            ]
        }).sort("created_at", 1):
            comment_data = {
                "id": str(comment["_id"]),
                "text": comment.get("konten", ""),  # Map konten to text
                "type": "ANALISIS",  # Add required type field
                "tipe_komentar": comment.get("tipe_komentar", "ANALISIS"),
                "konten": comment.get("konten", ""),
                "id_instansi": comment.get("id_instansi", ""),
                "user_id": comment.get("user_id", ""),
                "nama_user": comment.get("nama_user", ""),
                "created_at": comment.get("created_at", datetime.utcnow()),
                "created_by": comment.get("user_id"),  # Use user_id as created_by
                "created_by_name": comment.get("nama_user", ""),  # Use nama_user as created_by_name
                "updated_at": comment.get("updated_at"),
                "ref_id": doc["id"],  # Add ref_id field
                "updated_by": comment.get("updated_by")
            }
            comments.append(KomentarResponse(**comment_data))
        doc["comments"] = comments
        
        # Get selera_risiko and recalculate risk levels
        selera_risiko = await get_selera_risiko(db, doc["identifikasi_risiko_id"])
        
        # Get template_id for the given year and unit
        from app.api.v1.peta_risiko import get_or_create_template
        template_id = await get_or_create_template(db, doc["id_instansi"], doc["tahun"], doc["id_induk_unit_kerja"])
        
        doc = await calculate_all_risk_levels(db, template_id, doc, selera_risiko)
        
        results.append(AnalisisRisikoResponse(**doc))
    
    return results

@router.put("/{id}", response_model=AnalisisRisikoResponse)
async def update_analisis_risiko(
    id: str,
    analisis: AnalisisRisikoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk analysis.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk analysis"
        )

    db = await Database.get_db()
    
    try:
        existing = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Risk analysis not found"
            )
        
        # Log the existing record for debugging
        print(f"Existing analysis record: {existing}")
    except bson.errors.InvalidId:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis ID format: {id}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analysis: {str(e)}"
        )

    update_data = analisis.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    # If updating risk scores or classifications, validate and recalculate
    if any(field in update_data for field in [
        "kemungkinan_id_inherit", "dampak_id_inherit",
        "kemungkinan_id_residual", "dampak_id_residual",
        "skor_kemungkinan_inherit", "skor_dampak_inherit",
        "skor_kemungkinan_residual", "skor_dampak_residual",
        "skor_kemungkinan_treated", "skor_dampak_treated",
        "skor_kemungkinan_actual", "skor_dampak_actual",
        "use_risk"
    ]):
        # Validate criteria if updating
        if "kemungkinan_id_inherit" in update_data:
            await get_kriteria_by_id(db, update_data["kemungkinan_id_inherit"], "KEMUNGKINAN")
        if "dampak_id_inherit" in update_data:
            await get_kriteria_by_id(db, update_data["dampak_id_inherit"], "DAMPAK")
        if "kemungkinan_id_residual" in update_data:
            await get_kriteria_by_id(db, update_data["kemungkinan_id_residual"], "KEMUNGKINAN")
        if "dampak_id_residual" in update_data:
            await get_kriteria_by_id(db, update_data["dampak_id_residual"], "DAMPAK")
        if "kemungkinan_id_treated" in update_data:
            await get_kriteria_by_id(db, update_data["kemungkinan_id_treated"], "KEMUNGKINAN")
        if "dampak_id_treated" in update_data:
            await get_kriteria_by_id(db, update_data["dampak_id_treated"], "DAMPAK")
        if "kemungkinan_id_actual" in update_data:
            await get_kriteria_by_id(db, update_data["kemungkinan_id_actual"], "KEMUNGKINAN")
        if "dampak_id_actual" in update_data:
            await get_kriteria_by_id(db, update_data["dampak_id_actual"], "DAMPAK")
        
        # Get selera_risiko for calculations
        selera_risiko = await get_selera_risiko(db, existing["identifikasi_risiko_id"])
        
        # Recalculate inherit risk level if scores are updated
        if "skor_kemungkinan_inherit" in update_data or "skor_dampak_inherit" in update_data:
            kemungkinan = update_data.get("skor_kemungkinan_inherit", existing.get("skor_kemungkinan_inherit", 0))
            dampak = update_data.get("skor_dampak_inherit", existing.get("skor_dampak_inherit", 0))
            
            if kemungkinan > 0 and dampak > 0:
                update_data["level_risiko_inherit"] = await calculate_risk_level(float(kemungkinan), float(dampak))
                update_data["memenuhi_inherit"] = await calculate_memenuhi(
                    update_data["level_risiko_inherit"], selera_risiko)
            else:
                update_data["level_risiko_inherit"] = 0
                update_data["memenuhi_inherit"] = False
        
        # Recalculate residual risk level if scores are updated
        if "skor_kemungkinan_residual" in update_data or "skor_dampak_residual" in update_data:
            kemungkinan = update_data.get("skor_kemungkinan_residual", existing.get("skor_kemungkinan_residual", 0))
            dampak = update_data.get("skor_dampak_residual", existing.get("skor_dampak_residual", 0))
            
            if kemungkinan > 0 and dampak > 0:
                # Check attachment count to determine if risk level should be recalculated
                attachment_count = await db.attachments.count_documents({
                    "ref_id": id,
                    "type": AttachmentType.PENGENDALIAN
                })
                
                # Only recalculate if there are attachments
                if attachment_count > 0:
                    update_data["level_risiko_residual"] = await calculate_risk_level(float(kemungkinan), float(dampak))
                    update_data["memenuhi_residual"] = await calculate_memenuhi(
                        update_data["level_risiko_residual"], selera_risiko)
                # Else: Keep existing level_risiko_residual and memenuhi_residual (not updated)
            else:
                update_data["level_risiko_residual"] = 0
                update_data["memenuhi_residual"] = False
        
        # Recalculate treated risk level if scores are updated
        if "skor_kemungkinan_treated" in update_data or "skor_dampak_treated" in update_data:
            kemungkinan = update_data.get("skor_kemungkinan_treated", existing.get("skor_kemungkinan_treated", 0))
            dampak = update_data.get("skor_dampak_treated", existing.get("skor_dampak_treated", 0))
            
            if kemungkinan > 0 and dampak > 0:
                update_data["level_risiko_treated"] = await calculate_risk_level(float(kemungkinan), float(dampak))
                # Update memenuhi_residual if use_risk is "T"
                if update_data.get("use_risk") == "T" or existing.get("use_risk") == "T":
                    update_data["memenuhi_residual"] = await calculate_memenuhi(
                        update_data["level_risiko_treated"], selera_risiko)
            else:
                update_data["level_risiko_treated"] = 0
                if update_data.get("use_risk") == "T":
                    update_data["memenuhi_residual"] = False
        
        # Recalculate actual risk level if scores are updated
        if "skor_kemungkinan_actual" in update_data or "skor_dampak_actual" in update_data:
            kemungkinan = update_data.get("skor_kemungkinan_actual", existing.get("skor_kemungkinan_actual", 0))
            dampak = update_data.get("skor_dampak_actual", existing.get("skor_dampak_actual", 0))
            
            if kemungkinan > 0 and dampak > 0:
                update_data["level_risiko_actual"] = await calculate_risk_level(float(kemungkinan), float(dampak))
                update_data["memenuhi_actual"] = await calculate_memenuhi(
                    update_data["level_risiko_actual"], selera_risiko)
                
                # Update memenuhi_residual if use_risk is "A"
                if update_data.get("use_risk") == "A" or existing.get("use_risk") == "A":
                    update_data["memenuhi_residual"] = update_data["memenuhi_actual"]
            else:
                update_data["level_risiko_actual"] = 0
                update_data["memenuhi_actual"] = False
                if update_data.get("use_risk") == "A":
                    update_data["memenuhi_residual"] = False
        
        # Update memenuhi_residual if only use_risk changes
        if "use_risk" in update_data and "memenuhi_residual" not in update_data:
            use_risk = update_data["use_risk"].upper()
            
            if use_risk == "I":
                update_data["memenuhi_residual"] = update_data.get("memenuhi_inherit", 
                                                               existing.get("memenuhi_inherit", False))
            elif use_risk == "R":
                update_data["memenuhi_residual"] = update_data.get("memenuhi_residual", 
                                                               existing.get("memenuhi_residual", False))
            elif use_risk == "T":
                level_risiko_treated = update_data.get("level_risiko_treated", existing.get("level_risiko_treated", 0))
                update_data["memenuhi_residual"] = await calculate_memenuhi(
                    level_risiko_treated, selera_risiko)
            elif use_risk == "A":
                update_data["memenuhi_residual"] = update_data.get("memenuhi_actual", 
                                                               existing.get("memenuhi_actual", False))

    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    updated = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated["_id"])
    
    return AnalisisRisikoResponse(**updated)

@router.delete("/{id}")
async def delete_analisis_risiko(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk analysis.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can delete risk analysis"
        )

    db = await Database.get_db()
    
    # Check if analysis exists
    existing = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )

    # Delete the analysis
    result = await db.analisis_risiko.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )

    return {"message": "Risk analysis deleted successfully"}

@router.get("/by-identifikasi/{identifikasi_id}", response_model=List[AnalisisRisikoResponse])
async def get_analisis_by_identifikasi(
    identifikasi_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all analisis risiko for a specific identifikasi.
    """
    db = await Database.get_db()
    
    pipeline = [
        {"$match": {"identifikasi_risiko_id": identifikasi_id}},
        {"$project": {
            "id": {"$toString": "$_id"},
            "tahun": 1,
            "identifikasi_risiko_id": 1,
            "kemungkinan_id_inherit": 1,
            "dampak_id_inherit": 1,
            "kemungkinan_id_residual": 1,
            "dampak_id_residual": 1,
            "skor_kemungkinan_inherit": 1,
            "skor_dampak_inherit": 1,
            "skor_kemungkinan_residual": 1,
            "skor_dampak_residual": 1,
            "skor_kemungkinan_treated": 1,
            "skor_dampak_treated": 1,
            "kemungkinan_id_treated": 1,
            "dampak_id_treated": 1,
            "kemungkinan_id_actual": 1,
            "dampak_id_actual": 1,
            "skor_kemungkinan_actual": 1,
            "skor_dampak_actual": 1,
            "use_risk": 1,
            "level_risiko_inherit": 1,
            "level_risiko_residual": 1,
            "level_risiko_treated": 1,
            "level_risiko_actual": 1,
            "is_akhir_tahun": 1,
            "created_at": 1,
            "created_by": 1,
            "created_by_name": 1,
            "updated_at": 1,
            "updated_by": 1,
            "last_updated": 1,
            "comments": {"$literal": []},
            "memenuhi_inherit": 1,
            "memenuhi_residual": 1,
            "memenuhi_actual": 1
        }}
    ]
    
    analisis_list = []
    async for analisis in db.analisis_risiko.aggregate(pipeline):
        # Get comments
        comments = []
        async for comment in db.komentar.find({
            "tipe_komentar": TipeKomentar.ANALISIS,
            "$or": [
                {"ref_id": analisis["id"]},
                {"id_analisis_risiko": analisis["id"]}
            ]
        }).sort("created_at", 1):
            comment_data = {
                "id": str(comment["_id"]),
                "text": comment.get("konten", ""),  # Map konten to text
                "type": "ANALISIS",  # Add required type field
                "tipe_komentar": comment.get("tipe_komentar", "ANALISIS"),
                "konten": comment.get("konten", ""),
                "id_instansi": comment.get("id_instansi", ""),
                "user_id": comment.get("user_id", ""),
                "nama_user": comment.get("nama_user", ""),
                "created_at": comment.get("created_at", datetime.utcnow()),
                "created_by": comment.get("user_id"),  # Use user_id as created_by
                "created_by_name": comment.get("nama_user", ""),  # Use nama_user as created_by_name
                "updated_at": comment.get("updated_at"),
                "ref_id": analisis["id"],  # Add ref_id field
                "updated_by": comment.get("updated_by")
            }
            comments.append(KomentarResponse(**comment_data))
        analisis["comments"] = comments
        
        # Fix for actual risk calculation when use_risk is "A" but actual scores are 0
        if analisis.get("use_risk") == "A":
            skor_kemungkinan_actual = analisis.get("skor_kemungkinan_actual", 0)
            skor_dampak_actual = analisis.get("skor_dampak_actual", 0)
            
            # If both values are 0, use another set of values for risk level calculation
            if skor_kemungkinan_actual == 0 and skor_dampak_actual == 0:
                # Try using residual values first
                if analisis.get("skor_kemungkinan_residual", 0) > 0 and analisis.get("skor_dampak_residual", 0) > 0:
                    analisis["level_risiko_actual"] = analisis.get("level_risiko_residual")
                # Fall back to inherit values if needed
                elif analisis.get("level_risiko_inherit"):
                    analisis["level_risiko_actual"] = analisis.get("level_risiko_inherit")
                    
                # Ensure we have proper level set if it's still missing or 0
                if not analisis.get("level_risiko_actual"):
                    # Manually calculate based on inherit scores
                    kemungkinan = analisis.get("skor_kemungkinan_inherit", 0)
                    dampak = analisis.get("skor_dampak_inherit", 0)
                    
                    # Get template_id for the given year and unit
                    from app.api.v1.peta_risiko import get_or_create_template
                    template_id = await get_or_create_template(db, analisis["id_instansi"], analisis["tahun"], analisis["id_induk_unit_kerja"])
                    
                    analisis["level_risiko_actual"] = await calculate_risk_level(db, template_id, kemungkinan, dampak)
        
        # Get selera_risiko and recalculate risk levels
        selera_risiko = await get_selera_risiko(db, analisis["identifikasi_risiko_id"])
        
        # Get template_id for the given year and unit
        from app.api.v1.peta_risiko import get_or_create_template
        template_id = await get_or_create_template(db, analisis["id_instansi"], analisis["tahun"], analisis["id_induk_unit_kerja"])
        
        analisis = await calculate_all_risk_levels(db, template_id, analisis, selera_risiko)
        
        analisis_list.append(AnalisisRisikoResponse(**analisis))
    
    return analisis_list

@router.get("/{analisis_id}/attachments", response_model=List[AttachmentResponse])
async def get_attachments(
    analisis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all attachments for an analisis risiko.
    """
    db = await Database.get_db()
    
    attachments = []
    async for attachment in db.attachments.find({
        "ref_id": analisis_id,
        "type": {"$regex": "^PENGENDALIAN"}
    }):
        attachment["id"] = str(attachment["_id"])
        attachments.append(AttachmentResponse(**attachment))
    
    return attachments

@router.post("/{analisis_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(
    analisis_id: str,
    file: UploadFile = File(...),
    unsur_spip_id: Optional[str] = Form(None),
    deskripsi: Optional[str] = Form(None),
    type: AttachmentType = Form(AttachmentType.PENGENDALIAN_DOKUMEN),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an attachment for an analisis risiko.
    The file is stored in GridFS with base64 encoding for security.
    
    Adding attachments does not automatically change the residual risk level.
    The risk level will remain at its last updated value.
    
    Parameters:
    - file: The file to upload
    - unsur_spip_id: Optional SPIP element ID
    - deskripsi: Optional description of the attachment
    - type: Type of control (PENGENDALIAN_FISIK, PENGENDALIAN_DOKUMEN, PENGENDALIAN_APLIKASI)
    """
    db = await Database.get_db()
    
    # Validate analisis exists
    analisis = await db.analisis_risiko.find_one({"_id": ObjectId(analisis_id)})
    if not analisis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
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
            "type": type,
            "ref_id": analisis_id,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "encoding": "base64",  # Mark that content is base64 encoded
            "tahun": analisis["tahun"],
            "unsur_spip_id": unsur_spip_id,
            "deskripsi": deskripsi,
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
            "type": type,
            "ref_id": analisis_id,
            "file_name": file.filename,
            "file_id": str(file_id),
            "content_type": file.content_type,
            "file_size": len(contents),  # Original file size before encoding
            "encoding": "base64",  # Mark that content is base64 encoded
            "tahun": analisis["tahun"],
            "unsur_spip_id": unsur_spip_id,
            "deskripsi": deskripsi,
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

@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download an attachment file.
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

@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an attachment.
    Only SUPER_ADMIN can delete attachments.
    
    After deletion, the risk analysis record is NOT updated. The residual risk level
    will remain at its last updated value, even if all attachments are deleted.
    """
    
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can delete attachments"
        )
    
    db = await Database.get_db()
    
    # Get attachment first to get file ID and ref_id (analysis ID)
    attachment = await db.attachments.find_one({"_id": ObjectId(attachment_id)})
    if not attachment:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found"
        )
    
    # Store the analysis ID for later use
    analysis_id = attachment.get("ref_id")
    
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
    
    # Note: We no longer update the risk analysis record when attachments are deleted
    # This ensures that the residual risk level remains at its last updated value
    
    return {"message": "Attachment deleted successfully"}

@router.post("/proses-akhir-tahun/{id}", response_model=AnalisisRisikoResponse)
async def save_akhir_tahun(
    id: str,
    update_data: dict = Body(
        ...,
        example={
            "skor_kemungkinan_actual": 2.0,
            "skor_dampak_actual": 3.0,
            "kemungkinan_id_actual": "6123456789abcdef01234567",
            "dampak_id_actual": "6123456789abcdef01234568"
        },
        description="Actual risk values for year-end processing (can be integers or floats)"
    ),
    current_user: dict = Depends(get_current_user)
):
    """
    Save year-end actual risk values for a specific risk analysis.
    
    This endpoint is used to set the actual risk values (skor_kemungkinan_actual and skor_dampak_actual)
    which are required before running the year-end process. When you call this endpoint, the use_risk
    field will automatically be set to "A" to indicate actual risk values are being used.
    
    Parameters:
    - id: The ID of the risk analysis to update
    - update_data: A JSON object containing the actual risk values (can be integers or floats)
    
    Sample requests:
    ```json
    {
      "skor_kemungkinan_actual": 2.0,
      "skor_dampak_actual": 3.0,
      "kemungkinan_id_actual": "6123456789abcdef01234567",
      "dampak_id_actual": "6123456789abcdef01234568"
    }
    ```
    
    Or with integers:
    ```json
    {
      "skor_kemungkinan_actual": 2,
      "skor_dampak_actual": 3,
      "kemungkinan_id_actual": "6123456789abcdef01234567",
      "dampak_id_actual": "6123456789abcdef01234568"
    }
    ```
    
    You can also omit the criteria IDs if you're only updating scores:
    ```json
    {
      "skor_kemungkinan_actual": 2,
      "skor_dampak_actual": 3
    }
    ```
    
    This endpoint should be used to prepare each risk analysis before running the batch year-end process
    with the /proses-akhir-tahun endpoint. All risk analyses must have actual values set before the
    year-end process can be executed.
    
    The actual values represent the final assessment of risks at the end of the year, based on real
    incidents and observations, as opposed to the estimated values set during risk planning.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update year-end risk values"
        )

    db = await Database.get_db()
    
    try:
        existing = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Risk analysis not found"
            )
    except bson.errors.InvalidId:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis ID format: {id}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analysis: {str(e)}"
        )

    # Update only allowed fields for actual risk values
    actual_data = {}
    if "skor_kemungkinan_actual" in update_data:
        # Convert to float to ensure consistency in calculations
        actual_data["skor_kemungkinan_actual"] = float(update_data["skor_kemungkinan_actual"])
    if "skor_dampak_actual" in update_data:
        # Convert to float to ensure consistency in calculations
        actual_data["skor_dampak_actual"] = float(update_data["skor_dampak_actual"])
    
    # Add criteria IDs if provided
    if "kemungkinan_id_actual" in update_data and update_data["kemungkinan_id_actual"]:
        # Directly check in the database instead of using get_kriteria_by_id
        try:
            # Just validate that it's a valid ObjectId format
            ObjectId(update_data["kemungkinan_id_actual"])
            # Accept the ID even if it doesn't exist in the database
            actual_data["kemungkinan_id_actual"] = update_data["kemungkinan_id_actual"]
            
            # Optional: Log a warning if the ID doesn't exist
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(update_data["kemungkinan_id_actual"])})
            if not kemungkinan:
                pass  # Removed debug print
        except (TypeError, bson.errors.InvalidId):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid kemungkinan criteria ID format: {update_data['kemungkinan_id_actual']}"
            )
    elif "kemungkinan_id_actual" in update_data:
        # Handle empty or null value
        actual_data["kemungkinan_id_actual"] = None
    
    if "dampak_id_actual" in update_data and update_data["dampak_id_actual"]:
        # Directly check in the database instead of using get_kriteria_by_id
        try:
            # Just validate that it's a valid ObjectId format
            ObjectId(update_data["dampak_id_actual"])
            # Accept the ID even if it doesn't exist in the database
            actual_data["dampak_id_actual"] = update_data["dampak_id_actual"]
            
            # Optional: Log a warning if the ID doesn't exist
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(update_data["dampak_id_actual"])})
            if not dampak:
                pass  # Removed debug print
        except (TypeError, bson.errors.InvalidId):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid dampak criteria ID format: {update_data['dampak_id_actual']}"
            )
    elif "dampak_id_actual" in update_data:
        # Handle empty or null value
        actual_data["dampak_id_actual"] = None
    
    
    # Always set use_risk to "A" when updating actual values
    actual_data["use_risk"] = "A"
    actual_data["updated_at"] = datetime.utcnow()
    
    # Calculate risk level if both scores are provided
    if all(key in actual_data for key in ["skor_kemungkinan_actual", "skor_dampak_actual"]):
        kemungkinan = actual_data["skor_kemungkinan_actual"]
        dampak = actual_data["skor_dampak_actual"]
        
        if kemungkinan > 0 and dampak > 0:
            # Get selera_risiko and calculate risk level
            selera_risiko = await get_selera_risiko(db, existing["identifikasi_risiko_id"])
            
            # Calculate risk level using heatmap
            level_risiko_actual = await calculate_risk_level(float(kemungkinan), float(dampak))
            
            actual_data["level_risiko_actual"] = level_risiko_actual
            actual_data["memenuhi_actual"] = await calculate_memenuhi(level_risiko_actual, selera_risiko)
            actual_data["memenuhi_residual"] = actual_data["memenuhi_actual"]
        else:
            # Set to 0 if either score is 0
            actual_data["level_risiko_actual"] = 0
            actual_data["memenuhi_actual"] = False
            actual_data["memenuhi_residual"] = False

    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": actual_data}
    )
    
    updated = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    updated_data = dict(updated)
    updated_data["id"] = str(updated_data.pop("_id"))  # Convert _id to string and rename to id
    
    # Get comments and format them properly
    comments = []
    async for comment in db.komentar.find({
        "tipe_komentar": TipeKomentar.ANALISIS,
        "$or": [
            {"ref_id": updated_data["id"]},
            {"id_analisis_risiko": updated_data["id"]}
        ]
    }).sort("created_at", 1):
        comment_data = {
            "id": str(comment["_id"]),
            "text": comment.get("konten", ""),  # Map konten to text
            "type": "ANALISIS",  # Add required type field
            "ref_id": updated_data["id"],
            "created_at": comment.get("created_at", datetime.utcnow()),
            "created_by": comment.get("user_id", ""),
            "created_by_name": comment.get("nama_user", ""),
            "updated_at": comment.get("updated_at"),
            "updated_by": comment.get("updated_by")
        }
        comments.append(KomentarResponse(**comment_data))
    
    updated_data["comments"] = comments
    
    return AnalisisRisikoResponse(**updated_data)

@router.post("/proses-akhir-tahun", status_code=200)
async def proses_akhir_tahun(
    tahun: int = Query(..., description="Year"),
    id_instansi: str = Query(..., description="Institution ID"), 
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Process year-end risk analysis and copy to next year.
    
    This endpoint performs the complete year-end process:
    1. Validates all risks have actual values
    2. Creates next year's template if needed (with all categories, classifications, etc.)
    3. Copies current year's risk identifications to next year
    4. Copies current year's risk analyses to next year using actual values as residual values
    5. Copies current year's risk evaluations to next year
    6. Copies completed RTPs to next year as control activities
    7. Marks current year analyses as completed (sets is_akhir_tahun = True)
    
    IMPORTANT: Before running this process, ALL risk analyses for the given year and organizational units
    must have their actual risk values (skor_kemungkinan_actual and skor_dampak_actual) set using the
    /proses-akhir-tahun/{id} endpoint. This batch process will fail with a 422 error if any analysis
    is missing actual values.
    
    The process supports both integer and float values for actual risk scores.
    
    The process will:
    - Set is_akhir_tahun = True for current year analyses
    - Copy risk identifications to next year
    - Create new risk analyses records for the next year
    - Copy risk evaluations to next year
    - Copy completed RTPs as control activities for next year
    
    Sample usage:
    ```
    POST /proses-akhir-tahun?tahun=2025&id_instansi=67baf4c72465ae8b7645ea5a&id_induk_unit_kerja=67bafa17b885deaafaac2656
    ```
    
    If the process fails with:
    "Cannot process year-end, please fill actual values for all analyses first"
    
    It means some analyses are missing actual values. Use the individual /proses-akhir-tahun/{id} endpoint
    to set actual values for each analysis before trying again.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can process year-end risk"
        )

    db = await Database.get_db()
    
    # Get induk unit kerja data and children
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get all child induk unit kerja
    child_induk_units = []
    async for child in db.induk_unit_kerja.find({"parent_id": id_induk_unit_kerja}):
        child_induk_units.append(str(child["_id"]))
    
    all_induk_units = [id_induk_unit_kerja] + child_induk_units
    
    # Find all identifikasi_risiko records for these units for dedupe check
    identifikasi_dict = {}
    identifikasi_list = []
    async for identifikasi in db.identifikasi_risiko.find({
        "tahun": tahun,
        "id_induk_unit_kerja": {"$in": all_induk_units}
    }):
        identifikasi_dict[str(identifikasi["_id"])] = {
            "id": str(identifikasi["_id"]),
            "pernyataan_risiko": identifikasi.get("pernyataan_risiko", "N/A")
        }
        identifikasi_list.append(str(identifikasi["_id"]))
        
    total_expected = len(identifikasi_dict)
    
    # Clean up any duplicate analyses records first by keeping the most recently updated one
    for identifikasi_id in identifikasi_dict.keys():
        # Check for duplicate analyses
        count = await db.analisis_risiko.count_documents({
            "tahun": tahun,
            "identifikasi_risiko_id": identifikasi_id
        })
        
        if count > 1:
            # Find all duplicates sorted by updated_at (recent first)
            cursor = db.analisis_risiko.find({
                "tahun": tahun,
                "identifikasi_risiko_id": identifikasi_id
            }).sort("updated_at", -1)
            
            # Keep the first one (most recent), delete the rest
            keep_id = None
            async for doc in cursor:
                if keep_id is None:
                    keep_id = doc["_id"]
                else:
                    await db.analisis_risiko.delete_one({"_id": doc["_id"]})
    
    # Check if all risks have actual values - with improved query to handle both int and float
    missing_query = {
        "tahun": tahun,
        "id_induk_unit_kerja": {"$in": all_induk_units},
        "$or": [
            {"use_risk": {"$ne": "A"}},  # A for Actual
            {"skor_kemungkinan_actual": {"$exists": False}},
            {"skor_dampak_actual": {"$exists": False}},
            {"skor_kemungkinan_actual": None},
            {"skor_dampak_actual": None},
            {"skor_kemungkinan_actual": 0},
            {"skor_dampak_actual": 0}
        ]
    }
    
    # Find potential orphaned analyses (analyses without matching identifikasi_risiko)
    orphaned_query = {
        "tahun": tahun,
        "id_induk_unit_kerja": {"$in": all_induk_units},
        "identifikasi_risiko_id": {"$nin": identifikasi_list}
    }
    
    # Find identifications without analyses 
    all_analyses_ids = []
    async for analysis in db.analisis_risiko.find({
        "tahun": tahun,
        "id_induk_unit_kerja": {"$in": all_induk_units}
    }):
        all_analyses_ids.append(analysis["identifikasi_risiko_id"])
    
    missing_identifications = [id for id in identifikasi_list if id not in all_analyses_ids]
    
    # Count the total analyses
    total_analyses = await db.analisis_risiko.count_documents({
        "tahun": tahun,
        "id_induk_unit_kerja": {"$in": all_induk_units}
    })
    
    # Count the orphaned analyses
    orphaned_count = await db.analisis_risiko.count_documents(orphaned_query)
    
    # Count the missing actual values
    actual_missing = await db.analisis_risiko.count_documents(missing_query)
    
    # Detailed diagnostic information
    if actual_missing > 0 or orphaned_count > 0 or missing_identifications:
        error_details = {
            "total_expected_identifications": total_expected,
            "total_analyses_found": total_analyses,
            "analyses_missing_actual_values": actual_missing,
            "orphaned_analyses": orphaned_count,
            "identifications_without_analyses": len(missing_identifications)
        }
        
        # Add problematic records details
        problematic_records = []
        
        # Append analyses missing actual values
        async for doc in db.analisis_risiko.find(missing_query):
            problematic_records.append({
                "type": "missing_actual_values",
                "id": str(doc["_id"]),
                "identifikasi_risiko_id": doc["identifikasi_risiko_id"],
                "use_risk": doc.get("use_risk"),
                "skor_kemungkinan_actual": doc.get("skor_kemungkinan_actual"),
                "skor_dampak_actual": doc.get("skor_dampak_actual")
            })
        
        # Append orphaned analyses
        async for doc in db.analisis_risiko.find(orphaned_query):
            problematic_records.append({
                "type": "orphaned_analysis",
                "id": str(doc["_id"]),
                "identifikasi_risiko_id": doc["identifikasi_risiko_id"]
            })
        
        # Append identifications without analyses
        for id in missing_identifications:
            problematic_records.append({
                "type": "identification_without_analysis",
                "identifikasi_risiko_id": id,
                "pernyataan_risiko": identifikasi_dict.get(id, {}).get("pernyataan_risiko", "N/A")
            })
        
        error_details["problematic_records"] = problematic_records
        
        # Fix orphaned analyses if any
        if orphaned_count > 0:
            await db.analisis_risiko.delete_many(orphaned_query)
            error_details["action_taken"] = "Deleted orphaned analyses"
            
            # Recount after deletion
            total_analyses = await db.analisis_risiko.count_documents({
                "tahun": tahun,
                "id_induk_unit_kerja": {"$in": all_induk_units}
            })
            actual_missing = await db.analisis_risiko.count_documents(missing_query)
            error_details["total_analyses_after_cleanup"] = total_analyses
            error_details["analyses_missing_actual_values_after_cleanup"] = actual_missing
        
        if actual_missing > 0:
            # Abort process if still missing actual values
            raise HTTPException(
                status_code=422,
                detail=f"Cannot process year-end. {error_details}"
            )
    
    # Check if next year template exists
    next_year = tahun + 1
    template_next_year = await db.peta_risiko_template.find_one({
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "tahun": next_year
    })
    
    if not template_next_year:
        # Find the template ID for the current year
        current_template = await db.peta_risiko_template.find_one({
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "tahun": tahun
        })
        
        if current_template:
            # Use the comprehensive template copy functionality 
            # This will copy not just the template, but all its components
            # including categories, classifications, matrix, and heatmap
            template_id = str(current_template["_id"])
            
            # Define the copy parameters - same as what would be used in the API
            copy_params = {
                "source_id": template_id,
                "target_tahun": next_year,
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "user": current_user
            }
            
            # Call the copy_template function directly or prepare data to copy components
            try:
                # Prepare the template data
                template_data = current_template.copy()
                template_data["tahun"] = next_year
                template_data["created_at"] = datetime.utcnow()
                template_data["created_by"] = str(current_user["id"])
                template_id_old = template_data.pop("_id")
                
                # Insert the new template
                result = await db.peta_risiko_template.insert_one(template_data)
                new_template_id = result.inserted_id
                
                # Copy all kategori
                async for item in db.peta_risiko_kategori.find({"template_id": str(template_id_old)}):
                    item_data = item.copy()
                    item_data["template_id"] = str(new_template_id)
                    item_data["created_at"] = datetime.utcnow()
                    del item_data["_id"]
                    await db.peta_risiko_kategori.insert_one(item_data)
                
                # Copy all klasifikasi
                async for item in db.peta_risiko_klasifikasi.find({"template_id": str(template_id_old)}):
                    item_data = item.copy()
                    item_data["template_id"] = str(new_template_id)
                    item_data["created_at"] = datetime.utcnow()
                    del item_data["_id"]
                    await db.peta_risiko_klasifikasi.insert_one(item_data)
                
                # Copy all matriks
                async for item in db.peta_risiko_matriks.find({"template_id": str(template_id_old)}):
                    item_data = item.copy()
                    item_data["template_id"] = str(new_template_id)
                    item_data["created_at"] = datetime.utcnow()
                    del item_data["_id"]
                    await db.peta_risiko_matriks.insert_one(item_data)
                
                # Copy all matriks heatmap
                async for item in db.peta_risiko_matriks_heatmap.find({"template_id": str(template_id_old)}):
                    item_data = item.copy()
                    item_data["template_id"] = str(new_template_id)
                    item_data["created_at"] = datetime.utcnow()
                    del item_data["_id"]
                    await db.peta_risiko_matriks_heatmap.insert_one(item_data)
            
            except Exception as e:
                # If there's an error in copying template components, log it but continue
                print(f"Error copying template components: {str(e)}")
    
    # First, copy all identifikasi_risiko documents to next year
    processed_identifikasi_count = 0
    id_mapping = {}  # Map old identifikasi IDs to new IDs for reference when creating analyses
    
    async for identifikasi in db.identifikasi_risiko.find({
        "tahun": tahun,
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": {"$in": all_induk_units}
    }):
        # Check if this identification already exists for next year
        existing_next_year = await db.identifikasi_risiko.find_one({
            "tahun": next_year,
            "pernyataan_risiko": identifikasi["pernyataan_risiko"],
            "id_induk_unit_kerja": identifikasi["id_induk_unit_kerja"]
        })
        
        if existing_next_year:
            # If already exists, just store the mapping
            id_mapping[str(identifikasi["_id"])] = str(existing_next_year["_id"])
            continue
            
        # Create new identifikasi for next year
        new_identifikasi = identifikasi.copy()
        new_identifikasi["tahun"] = next_year
        new_identifikasi["created_at"] = datetime.utcnow()
        new_identifikasi["created_by"] = str(current_user["id"])
        new_identifikasi["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
        new_identifikasi["status_approval"] = ApprovalStatus.DRAFT
        new_identifikasi["disabled"] = False
        new_identifikasi["disabled_reason"] = None
        
        # Remove fields that should not be copied
        del new_identifikasi["_id"]
        if "updated_at" in new_identifikasi:
            del new_identifikasi["updated_at"]
        if "updated_by" in new_identifikasi:
            del new_identifikasi["updated_by"]
        
        # Insert new identification
        result = await db.identifikasi_risiko.insert_one(new_identifikasi)
        
        # Store mapping of old ID to new ID
        id_mapping[str(identifikasi["_id"])] = str(result.inserted_id)
        processed_identifikasi_count += 1
    
    # Now process risk analyses with mappings to new identification IDs
    # Get all risk analyses for this year with use_risk = "A"
    analyses_cursor = db.analisis_risiko.find({
        "tahun": tahun,
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": {"$in": all_induk_units},
        "use_risk": "A"
    })
    
    processed_analysis_count = 0
    analysis_id_mapping = {}  # Map old analysis IDs to new IDs for evaluations
    
    async for analysis in analyses_cursor:
        old_identifikasi_id = analysis["identifikasi_risiko_id"]
        
        # Skip if we don't have a mapping for this identification
        if old_identifikasi_id not in id_mapping:
            continue
            
        new_identifikasi_id = id_mapping[old_identifikasi_id]
            
        # Check if analysis already exists for next year
        existing_next_year = await db.analisis_risiko.find_one({
            "identifikasi_risiko_id": new_identifikasi_id,
            "tahun": next_year
        })
        
        if existing_next_year:
            # If already exists, just store the mapping
            analysis_id_mapping[str(analysis["_id"])] = str(existing_next_year["_id"])
            continue
            
        # Get the previous year's risk levels for comparison
        inherent_risk_level = analysis.get("level_risiko_inherit", 0)
        actual_risk_level = analysis.get("level_risiko_actual", 0)
        
        # Determine which inherent risk values to use for the new year
        if inherent_risk_level > actual_risk_level:
            # If inherent risk level is higher, keep the same inherent risk values
            new_inherent_kemungkinan_id = analysis.get("kemungkinan_id_inherit")
            new_inherent_dampak_id = analysis.get("dampak_id_inherit")
            new_inherent_skor_kemungkinan = analysis.get("skor_kemungkinan_inherit", 0)
            new_inherent_skor_dampak = analysis.get("skor_dampak_inherit", 0)
        else:
            # If actual risk level is higher or equal, use actual risk values as new inherent values
            new_inherent_kemungkinan_id = analysis.get("kemungkinan_id_actual")
            new_inherent_dampak_id = analysis.get("dampak_id_actual")
            new_inherent_skor_kemungkinan = analysis.get("skor_kemungkinan_actual", 0)
            new_inherent_skor_dampak = analysis.get("skor_dampak_actual", 0)
        
        # Create new analysis for next year based on current year's actual values
        new_analysis = {
            "identifikasi_risiko_id": new_identifikasi_id,
            "id_instansi": analysis["id_instansi"],
            "id_induk_unit_kerja": analysis["id_induk_unit_kerja"],
            "tahun": next_year,
            # Set inherent risk values based on comparison logic
            "kemungkinan_id_inherit": new_inherent_kemungkinan_id,
            "dampak_id_inherit": new_inherent_dampak_id,
            "skor_kemungkinan_inherit": new_inherent_skor_kemungkinan,
            "skor_dampak_inherit": new_inherent_skor_dampak,
            # Use actual values from this year as residual values for next year
            "kemungkinan_id_residual": analysis.get("kemungkinan_id_actual"),
            "dampak_id_residual": analysis.get("dampak_id_actual"),
            "skor_kemungkinan_residual": analysis.get("skor_kemungkinan_actual", 0),
            "skor_dampak_residual": analysis.get("skor_dampak_actual", 0),
            # Set treated and actual values to empty/zero
            "kemungkinan_id_treated": None,
            "dampak_id_treated": None,
            "skor_kemungkinan_treated": 0,
            "skor_dampak_treated": 0,
            "kemungkinan_id_actual": None,
            "dampak_id_actual": None,
            "skor_kemungkinan_actual": 0,
            "skor_dampak_actual": 0,
            "use_risk": "R",  # Default to using residual risk in the new year
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"]),
            "created_by_name": f"{current_user['nama_depan']} {current_user['nama_belakang']}"
        }
        
        # Calculate risk levels for the new analysis
        selera_risiko = await get_selera_risiko(db, new_identifikasi_id)
        
        # Use next year's template
        template_id_next = str(new_template_id)
        
        new_analysis = await calculate_all_risk_levels(db, template_id_next, new_analysis, selera_risiko)
        
        # Insert new analysis for next year
        result = await db.analisis_risiko.insert_one(new_analysis)
        
        # Store mapping of old analysis ID to new ID
        analysis_id_mapping[str(analysis["_id"])] = str(result.inserted_id)
        
        # Mark current year analysis as completed (is_akhir_tahun = True)
        await db.analisis_risiko.update_one(
            {"_id": analysis["_id"]},
            {"$set": {"is_akhir_tahun": True}}
        )
        
        processed_analysis_count += 1
    
    # Now copy evaluasi_risiko records using the ID mappings
    processed_evaluasi_count = 0
    evaluasi_id_mapping = {}  # Map old evaluasi IDs to new IDs for future reference
    
    # Find all evaluasi_risiko records for this year that match the identifications we've copied
    evaluasi_cursor = db.evaluasi_risiko.find({
        "identifikasi_risiko_id": {"$in": list(id_mapping.keys())}
    })
    
    async for evaluasi in evaluasi_cursor:
        old_identifikasi_id = evaluasi["identifikasi_risiko_id"]
        old_analisis_id = evaluasi["analisis_risiko_id"]
        
        # Skip if we don't have mappings for either identifikasi or analisis
        if old_identifikasi_id not in id_mapping or old_analisis_id not in analysis_id_mapping:
            continue
        
        new_identifikasi_id = id_mapping[old_identifikasi_id]
        new_analisis_id = analysis_id_mapping[old_analisis_id]
        
        # Check if evaluasi already exists for next year
        existing_next_year = await db.evaluasi_risiko.find_one({
            "identifikasi_risiko_id": new_identifikasi_id,
            "analisis_risiko_id": new_analisis_id,
            "deskripsi": evaluasi["deskripsi"]
        })
        
        if existing_next_year:
            # If already exists, just store the mapping
            evaluasi_id_mapping[str(evaluasi["_id"])] = str(existing_next_year["_id"])
            continue
        
        # Create new evaluasi for next year
        new_evaluasi = evaluasi.copy()
        new_evaluasi["identifikasi_risiko_id"] = new_identifikasi_id
        new_evaluasi["analisis_risiko_id"] = new_analisis_id
        new_evaluasi["created_at"] = datetime.utcnow()
        new_evaluasi["created_by"] = str(current_user["id"])
        new_evaluasi["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
        
        # Remove fields that should not be copied
        del new_evaluasi["_id"]
        if "updated_at" in new_evaluasi:
            del new_evaluasi["updated_at"]
        if "updated_by" in new_evaluasi:
            del new_evaluasi["updated_by"]
        if "root_cause_id" in new_evaluasi:
            del new_evaluasi["root_cause_id"]
        if "generation_id" in new_evaluasi:
            del new_evaluasi["generation_id"]
        
        # Insert new evaluasi
        result = await db.evaluasi_risiko.insert_one(new_evaluasi)
        
        # Store mapping of old evaluasi ID to new ID
        evaluasi_id_mapping[str(evaluasi["_id"])] = str(result.inserted_id)
        processed_evaluasi_count += 1
    
    # Process attachments (especially for RTP/control activities)
    # Find all relevant RTP attachments
    rtp_cursor = db.attachments.find({
        "tahun": tahun,
        "id_instansi": id_instansi,
        "type": "RTP"
    })
    
    copied_attachments = 0
    async for rtp in rtp_cursor:
        # Check if this RTP has been completed and should be copied as a control
        if not rtp.get("tanggal_realisasi"):
            continue
            
        # Check if attachment already exists for next year
        existing_attachment = await db.attachments.find_one({
            "ref_id": rtp["ref_id"],
            "type": "RTP",
            "sys_ref": str(rtp["_id"]),
            "tahun": next_year
        })
        
        if existing_attachment:
            # Skip if already processed
            continue
            
        # Get evaluasi_risiko for the RTP to determine the new identifikasi_risiko_id
        if "evaluasi_risiko_id" in rtp:
            evaluasi_id = rtp["evaluasi_risiko_id"]
            
            # Use the evaluasi mapping if available
            if evaluasi_id in evaluasi_id_mapping:
                new_ref_id = evaluasi_id_mapping[evaluasi_id]
            else:
                # Try to look up the evaluasi to get its identifikasi_risiko_id
                evaluasi = await db.evaluasi_risiko.find_one({"_id": ObjectId(evaluasi_id)})
                if evaluasi and "identifikasi_risiko_id" in evaluasi:
                    old_identifikasi_id = evaluasi["identifikasi_risiko_id"]
                    
                    # Skip if we don't have a mapping for this identification
                    if old_identifikasi_id not in id_mapping:
                        continue
                        
                    new_ref_id = id_mapping[old_identifikasi_id]
                else:
                    # If evaluasi not found or has no identifikasi_risiko_id, use original ref_id
                    new_ref_id = rtp["ref_id"]
        else:
            # If no evaluasi_risiko_id, use original ref_id
            new_ref_id = rtp["ref_id"]
            
        # Create new attachment record for next year
        new_attachment = {
            "ref_id": new_ref_id, # Use new identification ID or evaluasi ID
            "type": AttachmentType.PENGENDALIAN, # Change type to PENGENDALIAN as it becomes an existing control
            "name": rtp.get("name", ""),
            "keterangan": rtp.get("keterangan", ""),
            "file_path": rtp.get("file_path", "#"),
            "sys_ref": str(rtp["_id"]),
            "tahun": next_year,
            "id_instansi": rtp["id_instansi"],
            "id_induk_unit_kerja": rtp.get("id_induk_unit_kerja"),
            "unsur_spip_id": rtp.get("unsur_spip_id"),
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["id"])
        }
        
        # Copy file information if available - DUPLICATE the file in storage
        if "file_id" in rtp and rtp.get("is_uploaded", False):
            try:
                # Get file from GridFS
                fs = await Database.get_fs()
                file_id = ObjectId(rtp["file_id"])
                grid_out = await fs.open_download_stream(file_id)
                
                if grid_out:
                    # Read file data
                    file_data = await grid_out.read()
                    
                    # Create a new file in GridFS with the same content
                    new_file_id = await fs.upload_from_stream(
                        rtp.get("file_name", "file.bin"),
                        file_data,
                        metadata={
                            "content_type": rtp.get("content_type", "application/octet-stream"),
                            "created_at": datetime.utcnow(),
                            "created_by": str(current_user["id"]),
                            "tahun": next_year,
                            "original_file_id": str(rtp["file_id"])  # Track the original file
                        }
                    )
                    
                    # Set file information with the new file_id
                    new_attachment["file_id"] = str(new_file_id)
                    new_attachment["file_name"] = rtp.get("file_name")
                    new_attachment["content_type"] = rtp.get("content_type")
                    new_attachment["file_size"] = rtp.get("file_size")
                    new_attachment["is_uploaded"] = True
                    
                    print(f"Duplicated file {file_id} to {new_file_id} for next year")
                else:
                    # If file not found, set as not uploaded
                    new_attachment["is_uploaded"] = False
                    print(f"Original file {file_id} not found in GridFS")
            except Exception as e:
                # Log error but continue with the process
                print(f"Error duplicating file: {str(e)}")
                new_attachment["is_uploaded"] = False
        else:
            new_attachment["is_uploaded"] = False
        
        await db.attachments.insert_one(new_attachment)
        copied_attachments += 1
    
    # Copy realized RTPs to the next year
    copied_rtps = 0
    rtp_id_mapping = {}  # Map old RTP IDs to new IDs
    
    # Find all RTPs for evaluations that have been copied
    for old_evaluasi_id, new_evaluasi_id in evaluasi_id_mapping.items():
        # Find all RTPs for this evaluasi
        rtp_cursor = db.rtp.find({"evaluasi_risiko_id": old_evaluasi_id})
        
        async for rtp in rtp_cursor:
            # Only process RTPs that have been realized
            if rtp.get("tanggal_realisasi") is None:
                continue
                
            # Check if RTP already exists for next year
            existing_rtp = await db.rtp.find_one({
                "evaluasi_risiko_id": new_evaluasi_id,
                "deskripsi": rtp["deskripsi"]
            })
            
            if existing_rtp:
                # If already exists, just store the mapping
                rtp_id_mapping[str(rtp["_id"])] = str(existing_rtp["_id"])
                continue
                
            # Create new RTP for next year
            new_rtp = rtp.copy()
            new_rtp["evaluasi_risiko_id"] = new_evaluasi_id
            new_rtp["created_at"] = datetime.utcnow()
            new_rtp["created_by"] = str(current_user["id"])
            new_rtp["created_by_name"] = f"{current_user['nama_depan']} {current_user['nama_belakang']}"
            
            #make the output value from the rtp as the pengendalian value from the evaluasi_risiko
            
            # Remove fields that should not be copied
            del new_rtp["_id"]
            if "updated_at" in new_rtp:
                del new_rtp["updated_at"]
            if "updated_by" in new_rtp:
                del new_rtp["updated_by"]
            if "verified_at" in new_rtp:
                del new_rtp["verified_at"]
            if "verified_by" in new_rtp:
                del new_rtp["verified_by"]
            
            # Insert new RTP
            result = await db.rtp.insert_one(new_rtp)
            
            # Store mapping of old RTP ID to new ID
            rtp_id_mapping[str(rtp["_id"])] = str(result.inserted_id)
            copied_rtps += 1
            
            # Copy RTP attachments
            rtp_attachment_cursor = db.attachments.find({
                "ref_id": str(rtp["_id"]),
                "type": "RTP"
            })
            
            async for attachment in rtp_attachment_cursor:
                # Create new attachment for the new RTP
                new_attachment = attachment.copy()
                new_attachment["ref_id"] = str(result.inserted_id)
                new_attachment["tahun"] = next_year
                new_attachment["created_at"] = datetime.utcnow()
                new_attachment["created_by"] = str(current_user["id"])
                
                # Remove fields that should not be copied
                del new_attachment["_id"]
                if "updated_at" in new_attachment:
                    del new_attachment["updated_at"]
                if "updated_by" in new_attachment:
                    del new_attachment["updated_by"]
                
                # Duplicate the file in storage if it exists
                if "file_id" in attachment and attachment.get("is_uploaded", False):
                    try:
                        # Get file from GridFS
                        fs = await Database.get_fs()
                        file_id = ObjectId(attachment["file_id"])
                        grid_out = await fs.open_download_stream(file_id)
                        
                        if grid_out:
                            # Read file data
                            file_data = await grid_out.read()
                            
                            # Create a new file in GridFS with the same content
                            new_file_id = await fs.upload_from_stream(
                                attachment.get("file_name", "file.bin"),
                                file_data,
                                metadata={
                                    "content_type": attachment.get("content_type", "application/octet-stream"),
                                    "created_at": datetime.utcnow(),
                                    "created_by": str(current_user["id"]),
                                    "tahun": next_year,
                                    "original_file_id": str(attachment["file_id"])  # Track the original file
                                }
                            )
                            
                            # Set file information with the new file_id
                            new_attachment["file_id"] = str(new_file_id)
                            print(f"Duplicated RTP attachment file {file_id} to {new_file_id} for next year")
                        else:
                            # If file not found, set as not uploaded
                            new_attachment["is_uploaded"] = False
                            print(f"Original RTP attachment file {file_id} not found in GridFS")
                    except Exception as e:
                        # Log error but continue with the process
                        print(f"Error duplicating RTP attachment file: {str(e)}")
                        new_attachment["is_uploaded"] = False
                
                await db.attachments.insert_one(new_attachment)
                copied_attachments += 1
                
            # Update the evaluasi_risiko with the output value from the RTP
            # (Removed as per requirement: RTPs should be copied without using output as pengendalian)
    
    return {
        "message": "Year-end process completed successfully",
        "processed_identifications": processed_identifikasi_count,
        "processed_analyses": processed_analysis_count,
        "processed_evaluations": processed_evaluasi_count,
        "copied_attachments": copied_attachments,
        "copied_rtps": copied_rtps
    }

@router.get("/{id}/inherit", response_model=RiskScoreResponse)
async def get_inherit_risk(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get inherit risk scores and details for a specific risk analysis.
    
    This endpoint returns the inherit (inherent) risk scores, including:
    - Likelihood score
    - Impact score
    - Risk level
    - Whether it meets risk appetite
    - Criteria details
    
    Inherit risk represents the initial, unmitigated level of risk before any controls are applied.
    """
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Get likelihood and impact criteria details
    kemungkinan_criteria = None
    dampak_criteria = None
    
    if "kemungkinan_id_inherit" in analysis and analysis["kemungkinan_id_inherit"]:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(analysis["kemungkinan_id_inherit"])})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    if "dampak_id_inherit" in analysis and analysis["dampak_id_inherit"]:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(analysis["dampak_id_inherit"])})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    # Get selera_risiko to determine memenuhi
    selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
    memenuhi = await calculate_memenuhi(analysis.get("level_risiko_inherit", 0), selera_risiko)
    
    return RiskScoreResponse(
        skor_kemungkinan=analysis.get("skor_kemungkinan_inherit", 0),
        skor_dampak=analysis.get("skor_dampak_inherit", 0),
        kemungkinan_id=analysis.get("kemungkinan_id_inherit"),
        dampak_id=analysis.get("dampak_id_inherit"),
        level_risiko=analysis.get("level_risiko_inherit"),
        memenuhi=memenuhi,
        use_risk=analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.get("/{id}/residual", response_model=RiskScoreResponse)
async def get_residual_risk(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get residual risk scores and details for a specific risk analysis.
    
    This endpoint returns the residual risk scores, including:
    - Likelihood score
    - Impact score
    - Risk level
    - Whether it meets risk appetite
    - Criteria details
    
    Residual risk represents the level of risk that remains after existing controls are taken into account.
    The residual risk level will always reflect the last manually updated value, regardless of whether
    attachments exist or not.
    """
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Get residual risk values - always use the stored values
    skor_kemungkinan = analysis.get("skor_kemungkinan_residual", 0)
    skor_dampak = analysis.get("skor_dampak_residual", 0)
    level_risiko = analysis.get("level_risiko_residual", 0)
    kemungkinan_id = analysis.get("kemungkinan_id_residual")
    dampak_id = analysis.get("dampak_id_residual")
    memenuhi = analysis.get("memenuhi_residual", False)
    
    # Get likelihood and impact criteria details
    kemungkinan_criteria = None
    dampak_criteria = None
    
    if kemungkinan_id:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kemungkinan_id)})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    return RiskScoreResponse(
        skor_kemungkinan=skor_kemungkinan,
        skor_dampak=skor_dampak,
        kemungkinan_id=kemungkinan_id,
        dampak_id=dampak_id,
        level_risiko=level_risiko,
        memenuhi=memenuhi,
        use_risk=analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.get("/{id}/treated", response_model=RiskScoreResponse)
async def get_treated_risk(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get treated risk scores and details for a specific risk analysis.
    
    This endpoint returns the treated risk scores, including:
    - Likelihood score
    - Impact score
    - Risk level
    - Whether it meets risk appetite
    - Criteria details
    
    Treated risk represents the projected level of risk after planned risk treatments are implemented.
    """
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Get likelihood and impact criteria details
    kemungkinan_criteria = None
    dampak_criteria = None
    
    if "kemungkinan_id_treated" in analysis and analysis["kemungkinan_id_treated"]:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(analysis["kemungkinan_id_treated"])})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    # Use only treated risk dampak_id - no fallback
    dampak_id = analysis.get("dampak_id_treated")
        
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except (TypeError, bson.errors.InvalidId):
            # Handle invalid or empty ID
            pass
    
    # Get selera_risiko to determine memenuhi
    selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
    memenuhi = await calculate_memenuhi(analysis.get("level_risiko_treated", 0), selera_risiko)
    
    return RiskScoreResponse(
        skor_kemungkinan=analysis.get("skor_kemungkinan_treated", 0),
        skor_dampak=analysis.get("skor_dampak_treated", 0),
        kemungkinan_id=analysis.get("kemungkinan_id_treated"),
        dampak_id=dampak_id,
        level_risiko=analysis.get("level_risiko_treated"),
        memenuhi=memenuhi,
        use_risk=analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.get("/{id}/actual", response_model=RiskScoreResponse)
async def get_actual_risk(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get actual risk scores for a specific risk analysis.
    """
    db = await Database.get_db()
    
    # Get the risk analysis
    analisis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analisis:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    # Check if user has access to this risk analysis
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        
        if user_data.get("last_instansi_id") != analisis.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this risk analysis"
            )
    
    # Get the risk scores
    risk_score = {
        "skor_kemungkinan": analisis.get("skor_kemungkinan_actual", 0),
        "skor_dampak": analisis.get("skor_dampak_actual", 0),
        "kemungkinan_id": analisis.get("kemungkinan_id_actual"),
        "dampak_id": analisis.get("dampak_id_actual"),
        "level_risiko": analisis.get("level_risiko_actual", 0),
        "use_risk": analisis.get("use_risk", "I"),
        "last_updated": analisis.get("last_updated")
    }
    
    # Get the criteria details if available
    if analisis.get("kemungkinan_id_actual"):
        kriteria_kemungkinan = await db.kriteria_kemungkinan.find_one(
            {"_id": ObjectId(analisis["kemungkinan_id_actual"])}
        )
        if kriteria_kemungkinan:
            risk_score["kriteria_kemungkinan"] = {
                "id": str(kriteria_kemungkinan["_id"]),
                "kode": kriteria_kemungkinan["kode"],
                "nama": kriteria_kemungkinan["nama"],
                "nilai": kriteria_kemungkinan["nilai"],
                "deskripsi": kriteria_kemungkinan["deskripsi"]
            }
    
    if analisis.get("dampak_id_actual"):
        kriteria_dampak = await db.kriteria_dampak.find_one(
            {"_id": ObjectId(analisis["dampak_id_actual"])}
        )
        if kriteria_dampak:
            risk_score["kriteria_dampak"] = {
                "id": str(kriteria_dampak["_id"]),
                "kode": kriteria_dampak["kode"],
                "nama": kriteria_dampak["nama"],
                "nilai": kriteria_dampak["nilai"],
                "deskripsi": kriteria_dampak["deskripsi"]
            }
    
    # Get the risk appetite
    selera_risiko = await get_selera_risiko(db, analisis["identifikasi_risiko_id"])
    
    # Calculate if the risk meets the risk appetite
    risk_score["memenuhi"] = await calculate_memenuhi(risk_score.get("level_risiko", 0), selera_risiko)
    
    return risk_score

@router.get("/{id}/monitoring-data", response_model=List[MonitoringRisikoResponse])
async def get_monitoring_data_for_risk(
    id: str,
    tahun: Optional[int] = Query(None, description="Filter by year"),
    triwulan: Optional[int] = Query(None, description="Filter by quarter (1-4)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get monitoring data (incident reports) related to the risk statement in this analysis.
    This provides actual risk occurrences that have been reported and verified.
    """
    db = await Database.get_db()
    
    # First, get the analysis to find the identifikasi_risiko_id
    analisis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analisis:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    # Get the risk identification to get the pernyataan_risiko
    identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(analisis["identifikasi_risiko_id"])})
    if not identifikasi:
        raise HTTPException(status_code=404, detail="Risk identification not found")
    
    # Check if user has access to this risk analysis
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        
        if user_data.get("last_instansi_id") != analisis.get("id_instansi"):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this risk analysis"
            )
    
    # Build query for monitoring data
    query = {
        "id_identifikasi_risiko": str(identifikasi["_id"]),
        "status": MonitoringStatus.VERIFIED
    }
    
    # Add year filter if provided
    if tahun:
        query["tahun"] = tahun
    
    # Add triwulan filter if provided
    if triwulan and 1 <= triwulan <= 4:
        query["triwulan_periode_kejadian"] = triwulan
    
    # Get monitoring data
    monitoring_data = []
    async for item in db.monitoring_risiko.find(query).sort("waktu_kejadian", -1):
        # Convert ObjectId to string
        item["id"] = str(item["_id"])
        # Convert any nested ObjectId to string
        for key, value in item.items():
            if isinstance(value, ObjectId):
                item[key] = str(value)
        
        monitoring_data.append(MonitoringRisikoResponse(**item))
    
    return monitoring_data

@router.put("/{id}/inherit", response_model=RiskScoreResponse)
async def update_inherit_risk(
    id: str,
    risk_score: RiskScoreUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update inherit risk scores for a specific risk analysis.
    
    This endpoint allows updating the inherit (inherent) risk values, including:
    - Likelihood score
    - Impact score
    - Associated criteria IDs
    
    It will automatically recalculate the risk level and memenuhi flag based on the updated scores.
    The update is tracked in the last_updated field for audit purposes.
    
    When updating inherent risk criteria, the system will automatically update the residual, 
    treated, and actual risk criteria to match if they haven't been customized yet.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk values"
        )
    
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Find the template ID for this analysis
    template_id = None
    if "identifikasi_risiko_id" in analysis:
        # Get identifikasi risiko to find induk_unit_kerja
        identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(analysis["identifikasi_risiko_id"])})
        if identifikasi and "id_induk_unit_kerja" in identifikasi:
            # Find template for this induk_unit_kerja
            template = await db.peta_risiko_template.find_one({
                "id_induk_unit_kerja": identifikasi["id_induk_unit_kerja"]
            })
            if template:
                template_id = str(template["_id"])
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"]),
        "last_updated": "INHERIT",  # Track that inherit risk was updated
        "use_risk": "I"  # Set use_risk to Inherit when updating inherent risk
    }
    
    # Always use the provided scores directly
    update_data["skor_kemungkinan_inherit"] = float(risk_score.skor_kemungkinan)
    update_data["skor_dampak_inherit"] = float(risk_score.skor_dampak)
    
    # If criteria IDs are provided, store them but don't override the scores
    if risk_score.kemungkinan_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.kemungkinan_id, "KEMUNGKINAN")
        update_data["kemungkinan_id_inherit"] = risk_score.kemungkinan_id
        
        # Auto-update other risk types if they match the previous inherent criteria
        if analysis.get("kemungkinan_id_residual") == analysis.get("kemungkinan_id_inherit"):
            update_data["kemungkinan_id_residual"] = risk_score.kemungkinan_id
            
        if analysis.get("kemungkinan_id_treated") == analysis.get("kemungkinan_id_inherit"):
            update_data["kemungkinan_id_treated"] = risk_score.kemungkinan_id
            
        if analysis.get("kemungkinan_id_actual") == analysis.get("kemungkinan_id_inherit"):
            update_data["kemungkinan_id_actual"] = risk_score.kemungkinan_id
    
    if risk_score.dampak_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.dampak_id, "DAMPAK")
        update_data["dampak_id_inherit"] = risk_score.dampak_id
        
        # Auto-update other risk types if they match the previous inherent criteria
        if analysis.get("dampak_id_residual") == analysis.get("dampak_id_inherit"):
            update_data["dampak_id_residual"] = risk_score.dampak_id
            
        if analysis.get("dampak_id_treated") == analysis.get("dampak_id_inherit"):
            update_data["dampak_id_treated"] = risk_score.dampak_id
            
        if analysis.get("dampak_id_actual") == analysis.get("dampak_id_inherit"):
            update_data["dampak_id_actual"] = risk_score.dampak_id
    
    # Recalculate risk level only if both scores are non-zero
    skor_kemungkinan = update_data.get("skor_kemungkinan_inherit", 0)
    skor_dampak = update_data.get("skor_dampak_inherit", 0)
    
    if skor_kemungkinan > 0 and skor_dampak > 0:
        selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
        
        # First, try to look up risk level from heatmap table
        level_risiko_inherit = await calculate_risk_level(skor_kemungkinan, skor_dampak)
        
        update_data["level_risiko_inherit"] = level_risiko_inherit
        update_data["memenuhi_inherit"] = await calculate_memenuhi(
            update_data["level_risiko_inherit"],
            selera_risiko
        )
    else:
        # Set risk level to 0 if any score is 0
        update_data["level_risiko_inherit"] = 0
        update_data["memenuhi_inherit"] = False
    
    # Since we're setting use_risk to "I", update the main memenuhi flag
    update_data["memenuhi"] = update_data["memenuhi_inherit"]
    
    # Update the database
    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated document
    updated_analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    
    # Get likelihood and impact criteria details for response
    kemungkinan_criteria = None
    dampak_criteria = None
    
    kemungkinan_id = updated_analysis.get("kemungkinan_id_inherit")
    if kemungkinan_id:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kemungkinan_id)})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except:
            pass
    
    dampak_id = updated_analysis.get("dampak_id_inherit")
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except:
            pass
    
    return RiskScoreResponse(
        skor_kemungkinan=updated_analysis.get("skor_kemungkinan_inherit", 0),
        skor_dampak=updated_analysis.get("skor_dampak_inherit", 0),
        kemungkinan_id=updated_analysis.get("kemungkinan_id_inherit"),
        dampak_id=updated_analysis.get("dampak_id_inherit"),
        level_risiko=updated_analysis.get("level_risiko_inherit"),
        memenuhi=updated_analysis.get("memenuhi_inherit"),
        use_risk=updated_analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.put("/{id}/residual", response_model=RiskScoreResponse)
async def update_residual_risk(
    id: str,
    risk_score: RiskScoreUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update residual risk scores for a specific risk analysis.
    
    This endpoint allows updating the residual risk values, including:
    - Likelihood score
    - Impact score
    - Associated criteria IDs
    
    It will automatically recalculate the risk level and memenuhi flag based on the updated scores.
    The update is tracked in the last_updated field for audit purposes.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk values"
        )
    
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"]),
        "last_updated": "RESIDUAL",  # Track that residual risk was updated
        "use_risk": "R"  # Set use_risk to Residual when updating residual risk
    }
    
    # Always use the provided scores directly
    update_data["skor_kemungkinan_residual"] = float(risk_score.skor_kemungkinan)
    update_data["skor_dampak_residual"] = float(risk_score.skor_dampak)
    
    # If criteria IDs are provided, store them but don't override the scores
    if risk_score.kemungkinan_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.kemungkinan_id, "KEMUNGKINAN")
        update_data["kemungkinan_id_residual"] = risk_score.kemungkinan_id
    
    if risk_score.dampak_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.dampak_id, "DAMPAK")
        update_data["dampak_id_residual"] = risk_score.dampak_id
    
    # Count attachments to determine if residual risk can be calculated
    attachment_count = await db.attachments.count_documents({
        "ref_id": id,
        "type": {"$regex": "^PENGENDALIAN_"}
    })
    
    # Recalculate risk level only if both scores are non-zero and there are attachments
    skor_kemungkinan = update_data.get("skor_kemungkinan_residual", 0)
    skor_dampak = update_data.get("skor_dampak_residual", 0)
    
    if skor_kemungkinan > 0 and skor_dampak > 0 and attachment_count > 0:
        selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
        
        # Calculate residual risk level
        level_risiko_residual = await calculate_risk_level(skor_kemungkinan, skor_dampak)
        
        update_data["level_risiko_residual"] = level_risiko_residual
        update_data["memenuhi_residual"] = await calculate_memenuhi(
            update_data["level_risiko_residual"],
            selera_risiko
        )
    elif skor_kemungkinan == 0 or skor_dampak == 0:
        # Set risk level to 0 if any score is 0
        update_data["level_risiko_residual"] = 0
        update_data["memenuhi_residual"] = False
    
    # Since we're setting use_risk to "R", update the main memenuhi flag
    update_data["memenuhi"] = update_data.get("memenuhi_residual", False)
    
    # Update the database
    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated document
    updated_analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    
    # Get likelihood and impact criteria details for response
    kemungkinan_criteria = None
    dampak_criteria = None
    
    kemungkinan_id = updated_analysis.get("kemungkinan_id_residual")
    if kemungkinan_id:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kemungkinan_id)})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except:
            pass
    
    dampak_id = updated_analysis.get("dampak_id_residual")
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except:
            pass
    
    return RiskScoreResponse(
        skor_kemungkinan=updated_analysis.get("skor_kemungkinan_residual", 0),
        skor_dampak=updated_analysis.get("skor_dampak_residual", 0),
        kemungkinan_id=updated_analysis.get("kemungkinan_id_residual"),
        dampak_id=updated_analysis.get("dampak_id_residual"),
        level_risiko=updated_analysis.get("level_risiko_residual"),
        memenuhi=updated_analysis.get("memenuhi_residual"),
        use_risk=updated_analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.put("/{id}/treated", response_model=RiskScoreResponse)
async def update_treated_risk(
    id: str,
    risk_score: RiskScoreUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update treated risk scores for a specific risk analysis.
    
    This endpoint allows updating the treated risk values, including:
    - Likelihood score
    - Impact score
    - Associated criteria IDs
    
    It will automatically recalculate the risk level and memenuhi flag based on the updated scores.
    The update is tracked in the last_updated field for audit purposes.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk values"
        )
    
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"]),
        "last_updated": "TREATED",  # Track that treated risk was updated
        "use_risk": "T"  # Set use_risk to Treated when updating treated risk
    }
    
    # Always use the provided scores directly
    update_data["skor_kemungkinan_treated"] = float(risk_score.skor_kemungkinan)
    update_data["skor_dampak_treated"] = float(risk_score.skor_dampak)
    
    # If criteria IDs are provided, store them but don't override the scores
    if risk_score.kemungkinan_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.kemungkinan_id, "KEMUNGKINAN")
        update_data["kemungkinan_id_treated"] = risk_score.kemungkinan_id
    
    if risk_score.dampak_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.dampak_id, "DAMPAK")
        update_data["dampak_id_treated"] = risk_score.dampak_id
    
    # Recalculate risk level only if both scores are non-zero
    skor_kemungkinan = update_data.get("skor_kemungkinan_treated", 0)
    skor_dampak = update_data.get("skor_dampak_treated", 0)
    
    if skor_kemungkinan > 0 and skor_dampak > 0:
        selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
        
        # Calculate treated risk level
        level_risiko_treated = await calculate_risk_level(skor_kemungkinan, skor_dampak)
        
        update_data["level_risiko_treated"] = level_risiko_treated
        update_data["memenuhi_treated"] = await calculate_memenuhi(
            update_data["level_risiko_treated"],
            selera_risiko
        )
    else:
        # Set risk level to 0 if any score is 0
        update_data["level_risiko_treated"] = 0
        update_data["memenuhi_treated"] = False
    
    # Since we're setting use_risk to "T", update the main memenuhi flag
    update_data["memenuhi"] = update_data.get("memenuhi_treated", False)
    
    # Update the database
    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated document
    updated_analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    
    # Get likelihood and impact criteria details for response
    kemungkinan_criteria = None
    dampak_criteria = None
    
    kemungkinan_id = updated_analysis.get("kemungkinan_id_treated")
    if kemungkinan_id:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kemungkinan_id)})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except:
            pass
    
    dampak_id = updated_analysis.get("dampak_id_treated")
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except:
            pass
    
    return RiskScoreResponse(
        skor_kemungkinan=updated_analysis.get("skor_kemungkinan_treated", 0),
        skor_dampak=updated_analysis.get("skor_dampak_treated", 0),
        kemungkinan_id=updated_analysis.get("kemungkinan_id_treated"),
        dampak_id=updated_analysis.get("dampak_id_treated"),
        level_risiko=updated_analysis.get("level_risiko_treated"),
        memenuhi=updated_analysis.get("memenuhi_treated"),
        use_risk=updated_analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.put("/{id}/actual", response_model=RiskScoreResponse)
async def update_actual_risk(
    id: str,
    risk_score: RiskScoreUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update actual risk scores for a specific risk analysis.
    
    This endpoint allows updating the actual risk values, including:
    - Likelihood score
    - Impact score
    - Associated criteria IDs
    
    It will automatically recalculate the risk level and memenuhi flag based on the updated scores.
    The update is tracked in the last_updated field for audit purposes.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update risk values"
        )
    
    db = await Database.get_db()
    
    # Find the risk analysis
    analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis not found"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"]),
        "last_updated": "ACTUAL",  # Track that actual risk was updated
        "is_akhir_tahun": True,    # Mark as year-end processing
        "use_risk": "A"            # Set use_risk to Actual when updating actual risk
    }
    
    # Always use the provided scores directly
    update_data["skor_kemungkinan_actual"] = float(risk_score.skor_kemungkinan)
    update_data["skor_dampak_actual"] = float(risk_score.skor_dampak)
    
    # If criteria IDs are provided, store them but don't override the scores
    if risk_score.kemungkinan_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.kemungkinan_id, "KEMUNGKINAN")
        update_data["kemungkinan_id_actual"] = risk_score.kemungkinan_id
    
    if risk_score.dampak_id:
        # Validate the criteria exists
        await get_kriteria_by_id(db, risk_score.dampak_id, "DAMPAK")
        update_data["dampak_id_actual"] = risk_score.dampak_id
    
    # Recalculate risk level only if both scores are non-zero
    skor_kemungkinan = update_data.get("skor_kemungkinan_actual", 0)
    skor_dampak = update_data.get("skor_dampak_actual", 0)
    
    if skor_kemungkinan > 0 and skor_dampak > 0:
        selera_risiko = await get_selera_risiko(db, analysis["identifikasi_risiko_id"])
        
        # Calculate actual risk level
        level_risiko_actual = await calculate_risk_level(skor_kemungkinan, skor_dampak)
        
        update_data["level_risiko_actual"] = level_risiko_actual
        update_data["memenuhi_actual"] = await calculate_memenuhi(
            update_data["level_risiko_actual"],
            selera_risiko
        )
    else:
        # Set risk level to 0 if any score is 0
        update_data["level_risiko_actual"] = 0
        update_data["memenuhi_actual"] = False
    
    # Since we're setting use_risk to "A", update the main memenuhi flag
    update_data["memenuhi"] = update_data.get("memenuhi_actual", False)
    
    # Update the database
    await db.analisis_risiko.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated document
    updated_analysis = await db.analisis_risiko.find_one({"_id": ObjectId(id)})
    
    # Get likelihood and impact criteria details for response
    kemungkinan_criteria = None
    dampak_criteria = None
    
    kemungkinan_id = updated_analysis.get("kemungkinan_id_actual")
    if kemungkinan_id:
        try:
            kemungkinan = await db.kriteria_kemungkinan.find_one({"_id": ObjectId(kemungkinan_id)})
            if kemungkinan:
                kemungkinan_criteria = {
                    "id": str(kemungkinan["_id"]),
                    "kode": kemungkinan.get("kode", ""),
                    "nama": kemungkinan.get("nama", ""),
                    "nilai": kemungkinan.get("nilai", 0),
                    "deskripsi": kemungkinan.get("deskripsi", "")
                }
        except:
            pass
    
    dampak_id = updated_analysis.get("dampak_id_actual")
    if dampak_id:
        try:
            dampak = await db.kriteria_dampak.find_one({"_id": ObjectId(dampak_id)})
            if dampak:
                dampak_criteria = {
                    "id": str(dampak["_id"]),
                    "kode": dampak.get("kode", ""),
                    "nama": dampak.get("nama", ""),
                    "nilai": dampak.get("nilai", 0),
                    "deskripsi": dampak.get("deskripsi", "")
                }
        except:
            pass
    
    return RiskScoreResponse(
        skor_kemungkinan=updated_analysis.get("skor_kemungkinan_actual", 0),
        skor_dampak=updated_analysis.get("skor_dampak_actual", 0),
        kemungkinan_id=updated_analysis.get("kemungkinan_id_actual"),
        dampak_id=updated_analysis.get("dampak_id_actual"),
        level_risiko=updated_analysis.get("level_risiko_actual"),
        memenuhi=updated_analysis.get("memenuhi_actual"),
        use_risk=updated_analysis.get("use_risk"),
        kriteria_kemungkinan=kemungkinan_criteria,
        kriteria_dampak=dampak_criteria
    )

@router.put("/attachments/{attachment_id}", response_model=AttachmentResponse)
async def update_attachment(
    attachment_id: str,
    type: Optional[str] = Form(None),
    deskripsi: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Update an attachment's metadata (type and description).
    This endpoint allows updating the attachment type and description without re-uploading the file.
    
    Parameters:
    - type: Type of control (PENGENDALIAN_FISIK, PENGENDALIAN_DOKUMEN, PENGENDALIAN_APLIKASI, PENGENDALIAN)
    - deskripsi: Description of the attachment
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.PENGELOLA_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN and PENGELOLA_RISIKO can update attachments"
        )
    
    db = await Database.get_db()
    
    # Get attachment first to validate it exists
    try:
        attachment = await db.attachments.find_one({"_id": ObjectId(attachment_id)})
        if not attachment:
            raise HTTPException(
                status_code=404,
                detail="Attachment not found"
            )
    except bson.errors.InvalidId:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid attachment ID format: {attachment_id}"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
        "updated_by": str(current_user["id"])
    }
    
    if type is not None:
        # Validate that the type is a valid AttachmentType
        try:
            # Convert string to AttachmentType enum
            attachment_type = AttachmentType(type)
            update_data["type"] = attachment_type
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid attachment type: {type}. Valid types are: {[t.value for t in AttachmentType]}"
            )
    
    if deskripsi is not None:
        update_data["deskripsi"] = deskripsi
    
    # Update the attachment
    result = await db.attachments.update_one(
        {"_id": ObjectId(attachment_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        # This could happen if the data didn't change
        pass
    
    # Get updated attachment
    updated = await db.attachments.find_one({"_id": ObjectId(attachment_id)})
    updated["id"] = str(updated["_id"])
    
    return AttachmentResponse(**updated)