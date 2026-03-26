from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Union
from datetime import datetime
from bson import ObjectId
import bson.errors
import logging

from app.schemas.risk import (
    PetaRisikoTemplateCreate,
    PetaRisikoTemplateUpdate,
    PetaRisikoTemplateResponse,
    PetaRisikoKategoriCreate,
    PetaRisikoKategoriUpdate,
    PetaRisikoKategoriResponse,
    PetaRisikoKlasifikasiCreate,
    PetaRisikoKlasifikasiUpdate,
    PetaRisikoKlasifikasiResponse,
    PetaRisikoMatriksCreate,
    PetaRisikoMatriksUpdate,
    PetaRisikoMatriksResponse,
    PetaRisikoMatriksHeatmapCreate,
    PetaRisikoMatriksHeatmapUpdate,
    PetaRisikoMatriksHeatmapResponse,
    PetaRisikoCompleteView,
    SeleraRisiko,
    AttachmentType
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Helper functions for sync
async def get_klasifikasi_data(db, template_id, jenis):
    """
    Get klasifikasi data from peta risiko based on template_id and type
    """
    klasifikasi_list = []
    async for klasifikasi in db.peta_risiko_klasifikasi.find({"template_id": template_id, "jenis": jenis}).sort("key", 1):
        klasifikasi_list.append(klasifikasi)
    return klasifikasi_list

async def sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, jenis):
    """
    Sync klasifikasi data to kriteria kemungkinan/dampak
    jenis is either "FREKUENSI" (for kemungkinan) or "DAMPAK"
    """
    collection = "kriteria_kemungkinan" if jenis == "FREKUENSI" else "kriteria_dampak"
    
    # Clear existing kriteria for this institution/unit
    query = {"id_instansi": id_instansi}
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    delete_result = await db[collection].delete_many(query)
    
    # Insert new kriteria based on klasifikasi
    inserted_count = 0
    for item in klasifikasi_data:
        kriteria = {
            "kode": str(item["key"]),
            "nama": item["value"],
            "nilai": float(item["key"]),
            "deskripsi": item["value"],
            "id_instansi": id_instansi,
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "created_at": datetime.utcnow()
        }
        await db[collection].insert_one(kriteria)
        inserted_count += 1
    
    return inserted_count

async def get_or_create_template(db: Database, id_instansi: str, tahun: int, id_induk_unit_kerja: str) -> str:
    """Get existing template or create a new one based on kriteria counts"""
    
    # First try to find existing template
    template = await db.peta_risiko_template.find_one({
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "tahun": tahun
    })
    
    if template:
        return str(template["_id"])
        
    # Get kriteria counts from kriteria_risiko collections
    kemungkinan_count = await db.kriteria_kemungkinan.count_documents({
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": id_induk_unit_kerja
    })
    
    dampak_count = await db.kriteria_dampak.count_documents({
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": id_induk_unit_kerja
    })
    
    if not kemungkinan_count or not dampak_count:
        # If no kriteria found for induk_unit_kerja, try getting from parent
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        if induk_unit and induk_unit.get("parent_id"):
            kemungkinan_count = await db.kriteria_kemungkinan.count_documents({
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": induk_unit["parent_id"]
            })
            dampak_count = await db.kriteria_dampak.count_documents({
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": induk_unit["parent_id"]
            })
    
    # Use default values if no kriteria found
    if not kemungkinan_count:
        kemungkinan_count = 5  # Default to 5 levels for likelihood
    
    if not dampak_count:
        dampak_count = 5  # Default to 5 levels for impact
    
    template_data = {
        "kode": f"TEMPLATE-{tahun}",
        "nama": f"Template Peta Risiko {tahun}",
        "frekuensi": kemungkinan_count,
        "dampak": dampak_count,
        "tahun": tahun,
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "created_at": datetime.utcnow()
    }
    
    result = await db.peta_risiko_template.insert_one(template_data)
    return str(result.inserted_id)

def get_color_code(value: Union[int, str]) -> str:
    """Get color code based on risk level value"""
    # Convert value to int if it's a string
    if isinstance(value, str):
        try:
            value = int(value)
        except ValueError:
            # Default to red for non-numeric values
            return "#D0021B"
            
    if value >= 1 and value <= 15:
        return "#33cc00"  # Green for low risk (1-15)
    elif value >= 16 and value <= 20:
        return "#f5a623"  # Orange for medium risk (16-20)
    else:
        return "#D0021B"  # Red for high risk (21-25)

# Add this function after the get_color_code function
def get_custom_risk_value(dampak: int, frekuensi: int) -> int:
    """Get custom risk value based on impact (dampak) and frequency (frekuensi)"""
    # Define risk values based on the provided pattern
    risk_matrix = {
        # Dampak 1
        (1, 1): 1,
        (1, 2): 2,
        (1, 3): 3,
        (1, 4): 6,
        (1, 5): 7,
        # Dampak 2
        (2, 1): 4,
        (2, 2): 5,
        (2, 3): 8,
        (2, 4): 9,
        (2, 5): 12,
        # Dampak 3
        (3, 1): 10,
        (3, 2): 11,
        (3, 3): 13,
        (3, 4): 14,
        (3, 5): 18,
        # Dampak 4
        (4, 1): 15,
        (4, 2): 16,
        (4, 3): 17,
        (4, 4): 20,
        (4, 5): 21,
        # Dampak 5
        (5, 1): 19,
        (5, 2): 22,
        (5, 3): 23,
        (5, 4): 24,
        (5, 5): 25
    }
    
    # Return value from matrix if exists, otherwise fall back to multiplication
    return risk_matrix.get((dampak, frekuensi), dampak * frekuensi)

# 1. Template Management
@router.post("/template/generate", response_model=PetaRisikoTemplateResponse)
async def generate_template(
    tahun: int = Query(..., description="Year"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a new risk map template with all components.
    
    This is the first endpoint you should call when creating a new risk map.
    It will create a template and return its ID which you'll need for other operations.
    
    The endpoint will:
    1. Create a new template based on kriteria counts
    2. Generate heatmap cells based on kriteria values
    3. Set up color codes for risk levels
    
    Required Role: SUPER_ADMIN or ADMIN_KLP
    
    Parameters:
    - tahun: Year for the template
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Parent Work Unit ID
    
    Returns:
    - Complete template with dimensions and metadata, including the template_id
      that you'll need for creating categories, classifications, etc.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can generate templates"
        )
    
    db = await Database.get_db()
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Check if template exists for parent induk unit kerja
    parent_template = None
    if induk_unit.get("parent_id"):
        parent_template = await db.peta_risiko_template.find_one({
            "id_induk_unit_kerja": induk_unit["parent_id"],
            "tahun": tahun
        })
    
    # Use parent template if exists, otherwise create new
    if parent_template:
        template = parent_template.copy()
        template["id_induk_unit_kerja"] = id_induk_unit_kerja
        template["created_at"] = datetime.utcnow()
        result = await db.peta_risiko_template.insert_one(template)
        template_id = str(result.inserted_id)
    else:
        template_id = await get_or_create_template(db, id_instansi, tahun, id_induk_unit_kerja)
    
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    
    # Get kriteria for dimensions
    kriteria_kemungkinan = []
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi,
        "$or": [
            {"id_induk_unit_kerja": id_induk_unit_kerja},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan.append(k)
    
    kriteria_dampak = []
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi,
        "$or": [
            {"id_induk_unit_kerja": id_induk_unit_kerja},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak.append(k)
    
    # If no kriteria found, create default ones
    if not kriteria_kemungkinan:
        # Default kriteria kemungkinan values
        base_kriteria = [
            {"kode": "A", "nama": "Sangat Kecil", "nilai": 1, "deskripsi": "Kemungkinan terjadinya risiko sangat kecil, hampir tidak terjadi"},
            {"kode": "B", "nama": "Kecil", "nilai": 2, "deskripsi": "Risiko mungkin terjadi namun jarang"},
            {"kode": "C", "nama": "Sedang", "nilai": 3, "deskripsi": "Risiko bisa terjadi dalam situasi tertentu"},
            {"kode": "D", "nama": "Besar", "nilai": 4, "deskripsi": "Risiko cukup besar untuk terjadi"},
            {"kode": "E", "nama": "Sangat Besar", "nilai": 5, "deskripsi": "Risiko hampir pasti terjadi, sangat tinggi"},
        ]
        
        for item in base_kriteria:
            kriteria_data = {
                **item,
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "created_at": datetime.utcnow()
            }
            await db.kriteria_kemungkinan.insert_one(kriteria_data)
            kriteria_kemungkinan.append(kriteria_data)
    
    if not kriteria_dampak:
        # Default kriteria dampak values
        base_kriteria_dampak = [
            {"kode": "A", "nama": "TIDAK SIGNIFIKAN", "nilai": 1, "deskripsi": "Dampak risiko sangat kecil, hampir tidak berpengaruh"},
            {"kode": "B", "nama": "MINOR", "nilai": 2, "deskripsi": "Dampak risiko kecil dan terbatas"},
            {"kode": "C", "nama": "MEDIUM", "nilai": 3, "deskripsi": "Dampak risiko sedang dan dapat ditangani"},
            {"kode": "D", "nama": "SIGNIFIKAN", "nilai": 4, "deskripsi": "Dampak risiko besar dan memerlukan perhatian khusus"},
            {"kode": "E", "nama": "SANGAT SIGNIFIKAN", "nilai": 5, "deskripsi": "Dampak risiko sangat besar dan kritis"},
        ]
        
        for item in base_kriteria_dampak:
            kriteria_data = {
                **item,
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "created_at": datetime.utcnow()
            }
            await db.kriteria_dampak.insert_one(kriteria_data)
            kriteria_dampak.append(kriteria_data)
    
    # Generate heatmap cells
    for f_idx, frekuensi in enumerate(kriteria_kemungkinan, 1):
        for d_idx, dampak in enumerate(kriteria_dampak, 1):
            # Calculate cell value using custom pattern based on your requirements
            # Instead of direct multiplication, use the custom pattern
            numeric_value = get_custom_risk_value(d_idx, f_idx)
            
            # Create heatmap cell
            cell_data = {
                "dampak": d_idx,
                "frekuensi": f_idx,
                "value": str(numeric_value),  # Store as string to match other implementations
                "template_id": template_id,
                "kode_warna": get_color_code(numeric_value),
                "created_at": datetime.utcnow()
            }
            
            # Check if cell exists
            existing = await db.peta_risiko_matriks_heatmap.find_one({
                "template_id": template_id,
                "dampak": d_idx,
                "frekuensi": f_idx
            })
            
            if not existing:
                await db.peta_risiko_matriks_heatmap.insert_one(cell_data)
    
    # Automatically create kategori entries based on the template's frekuensi and dampak values
    # For FREKUENSI
    for i in range(1, template["frekuensi"] + 1):
        kategori_data = {
            "key": i,
            "value": "",  # Empty value as requested
            "jenis": "FREKUENSI",
            "template_id": template_id,
            "created_at": datetime.utcnow()
        }
        # Check if kategori already exists
        existing_kategori = await db.peta_risiko_kategori.find_one({
            "template_id": template_id,
            "jenis": "FREKUENSI",
            "key": i
        })
        
        if not existing_kategori:
            await db.peta_risiko_kategori.insert_one(kategori_data)
    
    # For DAMPAK
    for i in range(1, template["dampak"] + 1):
        kategori_data = {
            "key": i,
            "value": "",  # Empty value as requested
            "jenis": "DAMPAK",
            "template_id": template_id,
            "created_at": datetime.utcnow()
        }
        # Check if kategori already exists
        existing_kategori = await db.peta_risiko_kategori.find_one({
            "template_id": template_id,
            "jenis": "DAMPAK",
            "key": i
        })
        
        if not existing_kategori:
            await db.peta_risiko_kategori.insert_one(kategori_data)
    
    template["id"] = template_id
    template["klp_id"] = id_induk_unit_kerja  # Add KLP ID from the input parameter
    return PetaRisikoTemplateResponse(**template)

@router.get("/template", response_model=List[PetaRisikoTemplateResponse])
async def get_templates(
    tahun: int = Query(..., description="Year"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Filter by Parent Work Unit ID (KLP ID)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all risk map templates for a year.
    
    Use this endpoint to:
    1. Get a list of existing templates
    2. Get template_id needed for other operations (creating categories, classifications, etc.)
    3. View risk appetite information and template dimensions
    
    Parameters:
    - tahun: Year to filter templates
    - id_induk_unit_kerja: Optional filter by Parent Work Unit ID (KLP ID)
    
    Returns:
    - List of templates, each containing:
      - id: template_id needed for other operations
      - dimensions and metadata
      - risk appetite information
    """
    db = await Database.get_db()
    
    # Build template query
    template_query = {"tahun": tahun}
    
    # Add filter by id_induk_unit_kerja if provided
    if id_induk_unit_kerja:
        try:
            # Validate the ObjectId format
            ObjectId(id_induk_unit_kerja)
            template_query["id_induk_unit_kerja"] = id_induk_unit_kerja
        except bson.errors.InvalidId:
            raise HTTPException(
                status_code=400,
                detail="Invalid Parent Work Unit ID format"
            )
    
    # If not SUPER_ADMIN and no specific id_induk_unit_kerja is requested,
    # filter by user's induk_unit_kerja
    elif current_user["role"] != UserRole.SUPER_ADMIN:
        user_induk_unit_kerja = current_user.get("id_induk_unit_kerja")
        if not user_induk_unit_kerja:
            raise HTTPException(
                status_code=400,
                detail="User must be associated with a work unit"
            )
        template_query["id_induk_unit_kerja"] = user_induk_unit_kerja
    
    # Get templates
    templates = []
    async for template in db.peta_risiko_template.find(template_query):
        template["id"] = str(template.pop("_id"))
        
        # Get induk unit kerja data for this template
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
        if not induk_unit:
            continue  # Skip if induk unit not found
            
        template["klp_id"] = template["id_induk_unit_kerja"]
        
        # Calculate max risk appetite
        if not induk_unit.get("parent_id"):
            max_selera = template["frekuensi"] * template["dampak"]
        else:
            parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
            max_selera = parent_induk.get("selera_risiko", 0)
        
        # Check for selera_risiko in template
        if "selera_risiko" in template and isinstance(template["selera_risiko"], dict) and "current" in template["selera_risiko"]:
            selera_risiko_current = template["selera_risiko"]["current"]
        else:
            # Get selera_risiko from struktur_organisasi (more accurate)
            struktur = await db.struktur_organisasi.find_one({
                "_id": ObjectId(template["id_induk_unit_kerja"])
            })
            selera_risiko_current = struktur.get("selera_risiko", 0) if struktur else 0
            
            # Update template with the correct selera_risiko value to fix any inconsistencies
            await db.peta_risiko_template.update_one(
                {"_id": ObjectId(template["id"])},
                {"$set": {
                    "selera_risiko.current": selera_risiko_current
                }}
            )
        
        # Add risk appetite info
        template["selera_risiko"] = {
            "max": max_selera,
            "current": selera_risiko_current
        }
        
        templates.append(PetaRisikoTemplateResponse(**template))
    
    return templates

@router.get("/template/{id}", response_model=PetaRisikoTemplateResponse)
async def get_template(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk map template by ID.
    
    Retrieves detailed information about a single template.
    
    Parameters:
    - id: Template ID
    
    Returns:
    - Template details including dimensions and metadata
    """
    db = await Database.get_db()
    
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # If not SUPER_ADMIN, check if user has access to this template
    if current_user["role"] != UserRole.SUPER_ADMIN:
        id_induk_unit_kerja = current_user.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja:
            raise HTTPException(
                status_code=400,
                detail="User must be associated with a work unit"
            )
        if template["id_induk_unit_kerja"] != id_induk_unit_kerja:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this template"
            )
    
    template["id"] = str(template.pop("_id"))
    template["klp_id"] = template["id_induk_unit_kerja"]  # Use template's id_induk_unit_kerja as klp_id
    
    # Get induk unit kerja data for risk appetite
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Calculate max risk appetite
    if not induk_unit.get("parent_id"):
        max_selera = template["frekuensi"] * template["dampak"]
    else:
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        max_selera = parent_induk.get("selera_risiko", 0)
    
    # First check if template already has selera_risiko
    if "selera_risiko" in template and isinstance(template["selera_risiko"], dict) and "current" in template["selera_risiko"]:
        selera_risiko_current = template["selera_risiko"]["current"]
    else:
        # Get selera_risiko from struktur_organisasi (more accurate)
        struktur = await db.struktur_organisasi.find_one({
            "id_induk_unit_kerja": template["id_induk_unit_kerja"],
            "id_instansi": current_user.get("id_instansi")
        })
        selera_risiko_current = struktur.get("selera_risiko", 0) if struktur else 0
        
        # Update template with the correct selera_risiko value to fix any inconsistencies
        await db.peta_risiko_template.update_one(
            {"_id": ObjectId(id)},
            {"$set": {
                "selera_risiko.current": selera_risiko_current
            }}
        )
    
    # Add risk appetite info
    template["selera_risiko"] = {
        "max": max_selera,
        "current": selera_risiko_current
    }
    
    return PetaRisikoTemplateResponse(**template)

@router.put("/template/{id}", response_model=PetaRisikoTemplateResponse)
async def update_template(
    id: str,
    template: PetaRisikoTemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk map template.
    
    Modifies template properties like name and dimensions.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Template ID
    - template: Updated template data
    
    Returns:
    - Updated template details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update templates"
        )
    
    db = await Database.get_db()
    
    # Get existing template to validate and get current values
    existing_template = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    if not existing_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_template.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    
    # Set klp_id (required by PetaRisikoTemplateResponse)
    updated["klp_id"] = updated.get("id_induk_unit_kerja", "")
    
    # Get induk unit kerja data for risk appetite
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated.get("id_induk_unit_kerja", ""))})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Calculate max risk appetite if not already set
    if not updated.get("selera_risiko") or not isinstance(updated.get("selera_risiko"), dict):
        updated["selera_risiko"] = {}
    
    # Ensure both max and current exist in selera_risiko
    selera_current = updated.get("selera_risiko", {}).get("current", 0)
    
    # If parent ID is not present, max is frequency × impact dimensions
    # Otherwise, get from parent's selera_risiko
    if not induk_unit.get("parent_id"):
        max_selera = updated.get("frekuensi", 5) * updated.get("dampak", 5)
    else:
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        max_selera = parent_induk.get("selera_risiko", 25) if parent_induk else 25
    
    # Ensure selera_risiko is properly structured
    updated["selera_risiko"] = {
        "max": max_selera,
        "current": selera_current
    }
    
    return PetaRisikoTemplateResponse(**updated)

@router.put("/template/{id}/selera-risiko", response_model=PetaRisikoTemplateResponse)
async def update_template_selera_risiko(
    id: str,
    selera_risiko: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the risk appetite (selera_risiko) for a risk map template.
    
    This endpoint allows setting the current risk appetite value directly,
    which determines which risk levels are acceptable.
    
    Required Role: PEMILIK_RISIKO or ADMIN_KLP
    
    Parameters:
    - id: Template ID
    - selera_risiko: Risk appetite value (integer)
    
    Returns:
    - Updated template with new risk appetite value
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or PEMILIK_RISIKO or ADMIN_KLP can update risk appetite"
        )
    
    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update template's selera_risiko
    await db.peta_risiko_template.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "selera_risiko.current": selera_risiko,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Get the updated template
    updated = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    
    # Set klp_id (required by PetaRisikoTemplateResponse)
    updated["klp_id"] = updated.get("id_induk_unit_kerja", "")
    
    # Get induk unit kerja data for risk appetite
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(updated.get("id_induk_unit_kerja", ""))})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Calculate max risk appetite if not already set
    if not updated.get("selera_risiko") or not isinstance(updated.get("selera_risiko"), dict):
        updated["selera_risiko"] = {}
    
    # If parent ID is not present, max is frequency × impact dimensions
    # Otherwise, get from parent's selera_risiko
    if not induk_unit.get("parent_id"):
        max_selera = updated.get("frekuensi", 5) * updated.get("dampak", 5)
    else:
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        max_selera = parent_induk.get("selera_risiko", 25) if parent_induk else 25
    
    # Ensure selera_risiko is properly structured
    updated["selera_risiko"] = {
        "max": max_selera,
        "current": selera_risiko
    }
    
    # Also update the struktur_organisasi with this value to maintain sync
    if "id_induk_unit_kerja" in updated:
        # Get the id_instansi from the template or from current user
        id_instansi = current_user.get("id_instansi")
        if not id_instansi and induk_unit:
            id_instansi = induk_unit.get("id_instansi")
        
        # Update all structures associated with this parent work unit and institution
        if id_instansi:
            await db.struktur_organisasi.update_many(
                {
                    "id_induk_unit_kerja": updated["id_induk_unit_kerja"],
                    "id_instansi": id_instansi
                },
                {"$set": {
                    "selera_risiko": selera_risiko,
                    "updated_at": datetime.utcnow()
                }}
            )
    
    return PetaRisikoTemplateResponse(**updated)


# Template Examples - Available for copying
@router.get("/template/examples", response_model=List[PetaRisikoTemplateResponse])
async def get_template_examples(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all example templates available for copying.

    These are pre-configured templates with various sizes (3x3, 4x4, 5x5)
    that users can copy and apply to their own KLP.

    Returns:
    - List of example templates with their configurations
    """
    db = await Database.get_db()

    templates = []
    async for template in db.peta_risiko_template.find({"is_example": True}).sort("nama", 1):
        template["id"] = str(template.pop("_id"))
        template["klp_id"] = template.get("id_induk_unit_kerja", "")

        # Add risk appetite info
        frekuensi = template.get("frekuensi", 5)
        dampak = template.get("dampak", 5)
        max_selera = frekuensi * dampak
        selera_current = template.get("selera_risiko", {}).get("current", 12) if isinstance(template.get("selera_risiko"), dict) else 12

        template["selera_risiko"] = {
            "max": max_selera,
            "current": selera_current
        }

        templates.append(PetaRisikoTemplateResponse(**template))

    return templates


@router.post("/template/{template_id}/copy", response_model=PetaRisikoTemplateResponse)
async def copy_template(
    template_id: str,
    id_induk_unit_kerja: str = Query(..., description="Target KLP ID to copy template to"),
    tahun: int = Query(..., description="Year for the copied template"),
    current_user: dict = Depends(get_current_user)
):
    """
    Copy an example template to a specific KLP.

    This endpoint allows users to copy a pre-configured example template
    (like 3x3, 4x4, or 5x5) to their own KLP.

    Parameters:
    - template_id: ID of the example template to copy
    - id_induk_unit_kerja: Target KLP ID where template will be copied
    - tahun: Year for the new template

    Returns:
    - The newly created template with all its data copied
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can copy templates"
        )

    db = await Database.get_db()

    # Get example template
    source = await db.peta_risiko_template.find_one({
        "_id": ObjectId(template_id),
        "is_example": True
    })

    if not source:
        raise HTTPException(
            status_code=404,
            detail="Example template not found"
        )

    # Get KLP info
    klp = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    if not klp:
        raise HTTPException(
            status_code=404,
            detail="KLP not found"
        )

    # Check if user has access to this KLP
    if current_user["role"] != UserRole.SUPER_ADMIN:
        user_klp_id = current_user.get("id_induk_unit_kerja")
        if user_klp_id and user_klp_id != id_induk_unit_kerja:
            raise HTTPException(
                status_code=403,
                detail="You can only copy templates to your assigned KLP"
            )

    id_instansi = klp.get("id_instansi") or current_user.get("id_instansi")
    if not id_instansi:
        raise HTTPException(
            status_code=400,
            detail="Could not determine institution for the KLP"
        )

    # Check if template already exists for this KLP and year
    existing = await db.peta_risiko_template.find_one({
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "tahun": tahun
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Template already exists for this KLP in year {tahun}. Please delete it first or choose a different year."
        )

    # Create new template
    new_template_data = {
        "kode": f"{source['kode']}-{id_induk_unit_kerja[:8]}",
        "nama": f"{source['nama']} (Salin)",
        "frekuensi": source["frekuensi"],
        "dampak": source["dampak"],
        "tahun": tahun,
        "id_instansi": id_instansi,
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "klp_id": id_induk_unit_kerja,
        "deskripsi": source.get("deskripsi", ""),
        "is_example": False,
        "copied_from": template_id,
        "selera_risiko": source.get("selera_risiko", {"max": 25, "current": 12}),
        "created_at": datetime.utcnow()
    }

    result = await db.peta_risiko_template.insert_one(new_template_data)
    new_template_id = str(result.inserted_id)

    # Copy categories
    async for cat in db.peta_risiko_kategori.find({"template_id": template_id}):
        await db.peta_risiko_kategori.insert_one({
            "template_id": new_template_id,
            "key": cat["key"],
            "value": cat["value"],
            "jenis": cat["jenis"],
            "created_at": datetime.utcnow()
        })

    # Copy klasifikasi
    async for kla in db.peta_risiko_klasifikasi.find({"template_id": template_id}):
        await db.peta_risiko_klasifikasi.insert_one({
            "template_id": new_template_id,
            "key": kla["key"],
            "value": kla["value"],
            "jenis": kla["jenis"],
            "created_at": datetime.utcnow()
        })

    # Copy heatmap
    async for heat in db.peta_risiko_matriks_heatmap.find({"template_id": template_id}):
        await db.peta_risiko_matriks_heatmap.insert_one({
            "template_id": new_template_id,
            "frekuensi": heat["frekuensi"],
            "dampak": heat["dampak"],
            "value": heat["value"],
            "kode_warna": heat["kode_warna"],
            "value_skor": heat.get("value_skor"),
            "memenuhi": heat.get("memenuhi", False),
            "atas": heat.get("atas", False),
            "bawah": heat.get("bawah", False),
            "kiri": heat.get("kiri", False),
            "kanan": heat.get("kanan", False),
            "risks": [],
            "created_at": datetime.utcnow()
        })

    # Return the new template
    new_template = await db.peta_risiko_template.find_one({"_id": ObjectId(new_template_id)})
    new_template["id"] = new_template_id
    new_template["klp_id"] = id_induk_unit_kerja

    # Calculate selera_risiko
    max_selera = new_template["frekuensi"] * new_template["dampak"]
    selera_current = new_template.get("selera_risiko", {}).get("current", 12) if isinstance(new_template.get("selera_risiko"), dict) else 12
    new_template["selera_risiko"] = {
        "max": max_selera,
        "current": selera_current
    }

    return PetaRisikoTemplateResponse(**new_template)


# 2. Category Management
@router.post("/kategori", response_model=PetaRisikoKategoriResponse)
async def create_kategori(
    kategori: PetaRisikoKategoriCreate,
    current_user: dict = Depends(get_current_user),
    template_id: str = Query(..., description="Template ID")
):
    """
    Create a new risk map category.
    
    Only SUPER_ADMIN or ADMIN_KLP can create categories.
    
    Query Parameters:
    - template_id: Required. The ID of the template to associate this category with.
        Can be obtained from GET /template endpoint.
    
    Request Body:
    - key: Category key (integer)
    - value: Category name/value
    - jenis: Type (FREKUENSI/DAMPAK)
    
    Returns:
    - Created category details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can create risk map categories"
        )

    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    # Create kategori data
    kategori_dict = kategori.dict()
    kategori_dict["template_id"] = template_id  # Set template_id from query param
    kategori_dict["created_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_kategori.insert_one(kategori_dict)
    created = await db.peta_risiko_kategori.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    
    return PetaRisikoKategoriResponse(**created)

@router.get("/kategori", response_model=List[PetaRisikoKategoriResponse])
async def get_kategoris(
    template_id: str = Query(..., description="Template ID"),
    jenis: str = Query(..., description="Type (FREKUENSI/DAMPAK)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk map categories for a template and type.
    
    Categories represent the main groupings in the risk map.
    
    Parameters:
    - template_id: Template ID
    - jenis: Category type (FREKUENSI/DAMPAK)
    
    Returns:
    - List of categories for the specified type
    """
    db = await Database.get_db()
    
    kategoris = []
    async for kategori in db.peta_risiko_kategori.find({
        "template_id": template_id,
        "jenis": jenis
    }):
        kategori["id"] = str(kategori.pop("_id"))
        kategoris.append(PetaRisikoKategoriResponse(**kategori))
    
    return kategoris

@router.put("/kategori/{id}", response_model=PetaRisikoKategoriResponse)
async def update_kategori(
    id: str,
    kategori: PetaRisikoKategoriUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk map category.
    
    Modifies an existing category's properties.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Category ID
    - kategori: Updated category data
    
    Returns:
    - Updated category details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can update categories"
        )
    
    db = await Database.get_db()
    
    update_data = kategori.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_kategori.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated = await db.peta_risiko_kategori.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    return PetaRisikoKategoriResponse(**updated)

@router.delete("/kategori/{id}")
async def delete_kategori(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk map category.
    
    Removes a category and its associated data.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Category ID
    
    Returns:
    - Success message
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can delete categories"
        )
    
    db = await Database.get_db()
    
    result = await db.peta_risiko_kategori.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

@router.get("/kategori/{id}", response_model=PetaRisikoKategoriResponse)
async def get_kategori_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk map category by ID.
    
    Parameters:
    - id: Category ID
    
    Returns:
    - Detailed category information
    """
    db = await Database.get_db()
    
    kategori = await db.peta_risiko_kategori.find_one({"_id": ObjectId(id)})
    if not kategori:
        raise HTTPException(status_code=404, detail="Category not found")
    
    kategori["id"] = str(kategori.pop("_id"))
    return PetaRisikoKategoriResponse(**kategori)

# 3. Classification Management
@router.post("/klasifikasi", response_model=PetaRisikoKlasifikasiResponse)
async def create_klasifikasi(
    klasifikasi: PetaRisikoKlasifikasiCreate,
    current_user: dict = Depends(get_current_user),
    template_id: str = Query(..., description="Template ID")
):
    """
    Create a new risk map classification.
    
    Only SUPER_ADMIN or ADMIN_KLP can create classifications.
    
    Query Parameters:
    - template_id: Required. The ID of the template to associate this classification with.
        Can be obtained from GET /template endpoint.
    
    Request Body:
    - key: Classification key (integer)
    - value: Classification name/value
    - jenis: Type (FREKUENSI/DAMPAK)
    
    Returns:
    - Created classification details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can create risk map classifications"
        )
    
    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    # Create klasifikasi data
    klasifikasi_dict = klasifikasi.dict()
    klasifikasi_dict["template_id"] = template_id  # Set template_id from query param
    klasifikasi_dict["created_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_klasifikasi.insert_one(klasifikasi_dict)
    created = await db.peta_risiko_klasifikasi.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    
    # Auto-synchronize with kriteria_risiko after creating a classification
    try:
        # Get all classifications of this type for the template
        jenis = klasifikasi.jenis
        klasifikasi_data = await get_klasifikasi_data(db, template_id, jenis)
        
        # Get id_induk_unit_kerja from template
        id_induk_unit_kerja = template.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja:
            return PetaRisikoKlasifikasiResponse(**created)
        
        # Get id_instansi - try multiple sources
        id_instansi = None
        
        # First try from current user
        if current_user.get("id_instansi"):
            id_instansi = current_user.get("id_instansi")
        
        # If not found, try to get from induk_unit_kerja
        if not id_instansi:
            induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
            if induk_unit and induk_unit.get("id_instansi"):
                id_instansi = induk_unit.get("id_instansi")
        
        # If still not found, try to get from struktur_organisasi
        if not id_instansi:
            struktur = await db.struktur_organisasi.find_one({"id_induk_unit_kerja": id_induk_unit_kerja})
            if struktur and struktur.get("id_instansi"):
                id_instansi = struktur.get("id_instansi")
        
        # Sync classifications to criteria
        if id_instansi and id_induk_unit_kerja:
            await sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, jenis)
    except Exception as sync_error:
        logger.error(f"Error syncing classifications to criteria: {str(sync_error)}", exc_info=True)
        # Don't fail the request
    
    return PetaRisikoKlasifikasiResponse(**created)

@router.get("/klasifikasi", response_model=List[PetaRisikoKlasifikasiResponse])
async def get_klasifikasis(
    template_id: str = Query(..., description="Template ID"),
    jenis: str = Query(..., description="Type (FREKUENSI/DAMPAK)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk map classifications for a template and type.
    
    Classifications define specific levels within categories.
    
    Parameters:
    - template_id: Template ID
    - jenis: Classification type (FREKUENSI/DAMPAK)
    
    Returns:
    - List of classifications for the specified type
    """
    db = await Database.get_db()
    
    klasifikasis = []
    async for klasifikasi in db.peta_risiko_klasifikasi.find({
        "template_id": template_id,
        "jenis": jenis
    }):
        klasifikasi["id"] = str(klasifikasi.pop("_id"))
        klasifikasis.append(PetaRisikoKlasifikasiResponse(**klasifikasi))
    
    return klasifikasis

@router.put("/klasifikasi/{id}", response_model=PetaRisikoKlasifikasiResponse)
async def update_klasifikasi(
    id: str,
    klasifikasi: PetaRisikoKlasifikasiUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk map classification.
    
    Modifies an existing classification's properties.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Classification ID
    - klasifikasi: Updated classification data
    
    Returns:
    - Updated classification details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update classifications"
        )
    
    db = await Database.get_db()
    
    # Get classification before update for info
    existing = await db.peta_risiko_klasifikasi.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    template_id = existing.get("template_id")
    jenis = existing.get("jenis")
    
    update_data = klasifikasi.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_klasifikasi.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    updated = await db.peta_risiko_klasifikasi.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    
    # Auto-synchronize with kriteria_risiko after updating classification
    try:
        # Get template details
        template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
        if not template:
            return PetaRisikoKlasifikasiResponse(**updated)
        
        # Get all classifications of this type for the template
        klasifikasi_data = await get_klasifikasi_data(db, template_id, jenis)
        
        # Get id_induk_unit_kerja from template
        id_induk_unit_kerja = template.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja:
            return PetaRisikoKlasifikasiResponse(**updated)
        
        # Get id_instansi - try multiple sources
        id_instansi = None
        
        # First try from current user
        if current_user.get("id_instansi"):
            id_instansi = current_user.get("id_instansi")
        
        # If not found, try to get from induk_unit_kerja
        if not id_instansi:
            induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
            if induk_unit and induk_unit.get("id_instansi"):
                id_instansi = induk_unit.get("id_instansi")
        
        # If still not found, try to get from struktur_organisasi
        if not id_instansi:
            struktur = await db.struktur_organisasi.find_one({"id_induk_unit_kerja": id_induk_unit_kerja})
            if struktur and struktur.get("id_instansi"):
                id_instansi = struktur.get("id_instansi")
        
        # Sync classifications to criteria
        if id_instansi and id_induk_unit_kerja:
            await sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, jenis)
    except Exception as sync_error:
        logger.error(f"Error syncing classifications to criteria after update: {str(sync_error)}", exc_info=True)
        # Don't fail the request
    
    return PetaRisikoKlasifikasiResponse(**updated)

@router.delete("/klasifikasi/{id}")
async def delete_klasifikasi(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk map classification.
    
    Removes a classification and its associated data.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Classification ID
    
    Returns:
    - Success message
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can delete classifications"
        )
    
    db = await Database.get_db()
    
    # Get classification details before deletion for sync
    classification = await db.peta_risiko_klasifikasi.find_one({"_id": ObjectId(id)})
    if not classification:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    template_id = classification.get("template_id")
    jenis = classification.get("jenis")
    
    result = await db.peta_risiko_klasifikasi.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    # Auto-synchronize with kriteria_risiko after deleting a classification
    try:
        # Get template details
        template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
        if not template:
            return {"message": "Classification deleted successfully"}
        
        # Get all classifications of this type for the template
        klasifikasi_data = await get_klasifikasi_data(db, template_id, jenis)
        
        # Get id_induk_unit_kerja from template
        id_induk_unit_kerja = template.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja:
            return {"message": "Classification deleted successfully"}
        
        # Get id_instansi - try multiple sources
        id_instansi = None
        
        # First try from current user
        if current_user.get("id_instansi"):
            id_instansi = current_user.get("id_instansi")
        
        # If not found, try to get from induk_unit_kerja
        if not id_instansi:
            induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
            if induk_unit and induk_unit.get("id_instansi"):
                id_instansi = induk_unit.get("id_instansi")
        
        # If still not found, try to get from struktur_organisasi
        if not id_instansi:
            struktur = await db.struktur_organisasi.find_one({"id_induk_unit_kerja": id_induk_unit_kerja})
            if struktur and struktur.get("id_instansi"):
                id_instansi = struktur.get("id_instansi")
        
        # Sync classifications to criteria
        if id_instansi and id_induk_unit_kerja:
            await sync_klasifikasi_to_kriteria(db, klasifikasi_data, id_instansi, id_induk_unit_kerja, jenis)
    except Exception as sync_error:
        logger.error(f"Error syncing classifications to criteria after deletion: {str(sync_error)}", exc_info=True)
        # Don't fail the request
    
    return {"message": "Classification deleted successfully"}

@router.get("/klasifikasi/{id}", response_model=PetaRisikoKlasifikasiResponse)
async def get_klasifikasi_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk map classification by ID.
    
    Parameters:
    - id: Classification ID
    
    Returns:
    - Detailed classification information
    """
    db = await Database.get_db()
    
    try:
        klasifikasi = await db.peta_risiko_klasifikasi.find_one({"_id": ObjectId(id)})
        if not klasifikasi:
            raise HTTPException(status_code=404, detail="Classification not found")
        
        klasifikasi["id"] = str(klasifikasi.pop("_id"))
        return PetaRisikoKlasifikasiResponse(**klasifikasi)
    except (TypeError, bson.errors.InvalidId):
        raise HTTPException(status_code=400, detail="Invalid classification ID format")

# 4. Matrix Management
@router.post("/matriks", response_model=PetaRisikoMatriksResponse)
async def create_matriks(
    matriks: PetaRisikoMatriksCreate,
    current_user: dict = Depends(get_current_user),
    template_id: str = Query(..., description="Template ID")
):
    """
    Create a new risk map matrix cell.
    
    Only SUPER_ADMIN can create matrix cells.
    
    Query Parameters:
    - template_id: Required. The ID of the template to associate this matrix cell with.
        Can be obtained from GET /template endpoint.
    
    Request Body:
    - kategori: Category key (integer)
    - klasifikasi: Classification key (integer)
    - value: Matrix value
    - jenis: Type (FREKUENSI/DAMPAK)
    
    Returns:
    - Created matrix cell details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can create risk map matrix cells"
        )

    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    # Create matriks data
    matriks_dict = matriks.dict()
    matriks_dict["template_id"] = template_id  # Set template_id from query param
    matriks_dict["created_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_matriks.insert_one(matriks_dict)
    created = await db.peta_risiko_matriks.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    
    return PetaRisikoMatriksResponse(**created)

@router.get("/matriks", response_model=List[PetaRisikoMatriksResponse])
async def get_matriks(
    template_id: str = Query(..., description="Template ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk map matrix for a template.
    
    Retrieves the matrix cells that define risk levels.
    
    Parameters:
    - template_id: Template ID
    
    Returns:
    - List of matrix cells with values
    """
    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # If not SUPER_ADMIN, check if user has access to this template
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        id_induk_unit_kerja = current_user.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja:
            raise HTTPException(
                status_code=400,
                detail="User must be associated with a work unit"
            )
        if template["id_induk_unit_kerja"] != id_induk_unit_kerja:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this template"
            )
    
    # Get matriks data
    matriks = []
    async for cell in db.peta_risiko_matriks.find({"template_id": template_id}):
        cell["id"] = str(cell.pop("_id"))
        matriks.append(PetaRisikoMatriksResponse(**cell))
    
    return matriks

@router.put("/matriks/{id}", response_model=PetaRisikoMatriksResponse)
async def update_matriks(
    id: str,
    matriks: PetaRisikoMatriksUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk map matrix cell.
    
    Modifies an existing matrix cell's properties.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Matrix cell ID
    - matriks: Updated matrix cell data
    
    Returns:
    - Updated matrix cell details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update matrix cells"
        )
    
    db = await Database.get_db()
    
    update_data = matriks.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_matriks.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Matrix cell not found")
    
    updated = await db.peta_risiko_matriks.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    return PetaRisikoMatriksResponse(**updated)

@router.delete("/matriks/{id}")
async def delete_matriks(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk map matrix cell.
    
    Removes a matrix cell and its associated data.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Matrix cell ID
    
    Returns:
    - Success message
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete matrix cells"
        )
    
    db = await Database.get_db()
    
    result = await db.peta_risiko_matriks.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Matrix cell not found")
    
    return {"message": "Matrix cell deleted successfully"}

@router.get("/matriks/{id}", response_model=PetaRisikoMatriksResponse)
async def get_matriks_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk map matrix cell by ID.
    
    Retrieves detailed information about a single matrix cell.
    
    Parameters:
    - id: Matrix cell ID
    
    Returns:
    - Detailed matrix cell information
    """
    db = await Database.get_db()
    
    try:
        matriks = await db.peta_risiko_matriks.find_one({"_id": ObjectId(id)})
        if not matriks:
            raise HTTPException(status_code=404, detail="Matrix cell not found")
        
        matriks["id"] = str(matriks.pop("_id"))
        return PetaRisikoMatriksResponse(**matriks)
    except (TypeError, bson.errors.InvalidId):
        raise HTTPException(status_code=400, detail="Invalid matrix ID format")

# 5. Heatmap Management
@router.post("/heatmap", response_model=PetaRisikoMatriksHeatmapResponse)
async def create_heatmap(
    heatmap: PetaRisikoMatriksHeatmapCreate,
    current_user: dict = Depends(get_current_user),
    template_id: str = Query(..., description="Template ID")
):
    """
    Create a new risk map heatmap cell.
    
    Only SUPER_ADMIN can create heatmap cells.
    
    Query Parameters:
    - template_id: Required. The ID of the template to associate this heatmap cell with.
        Can be obtained from GET /template endpoint.
    
    Request Body:
    - dampak: Impact level
    - frekuensi: Frequency level
    - value: Heatmap value
    - kode_warna: Optional color code (will be auto-generated if not provided)
    
    Returns:
    - Created heatmap cell details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can create risk map heatmap cells"
        )

    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    # Create heatmap data
    heatmap_dict = heatmap.dict()
    heatmap_dict["template_id"] = template_id  # Set template_id from query param
    
    # Auto-generate kode_warna if not provided
    if not heatmap_dict.get("kode_warna"):
        heatmap_dict["kode_warna"] = get_color_code(heatmap_dict["value"])
    
    heatmap_dict["created_at"] = datetime.utcnow()
    
    result = await db.peta_risiko_matriks_heatmap.insert_one(heatmap_dict)
    created = await db.peta_risiko_matriks_heatmap.find_one({"_id": result.inserted_id})
    created["id"] = str(created.pop("_id"))
    
    return PetaRisikoMatriksHeatmapResponse(**created)

@router.get("/heatmap", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_heatmap(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk map heatmap for a template.
    
    Retrieves the heatmap visualization with:
    - Cell values and colors
    - Risk appetite boundaries
    - Risk counts per cell
    
    Parameters:
    - template_id: Template ID
    - tahun: Year for risk data
    
    Returns:
    - List of heatmap cells with values and metadata
    """
    db = await Database.get_db()
    
    # Get template for dimensions
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get selera_risiko from template or struktur_organisasi
    selera_risiko = None
    if template.get("selera_risiko") and template["selera_risiko"].get("current"):
        selera_risiko = template["selera_risiko"]["current"]
    else:
        # Fallback: look up from struktur_organisasi via template's klp_id
        struktur = await db.struktur_organisasi.find_one({
            "id_induk_unit_kerja": template.get("klp_id", "")
        })
        if struktur and "selera_risiko" in struktur:
            selera_risiko = struktur["selera_risiko"]

    if selera_risiko is None:
        selera_risiko = template.get("frekuensi", 5) * template.get("dampak", 5)  # Default to max
    
    # Arrays untuk melacak garis yang sudah ditandai (seperti di PHP)
    garis_atas = []
    garis_bawah = []
    garis_kiri = []
    garis_kanan = []
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
    
    # Process cells with boundary flags
    heatmap = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        count = await db.analisis_risiko.count_documents({
            "tahun": tahun,
            "skor_kemungkinan_inherit": cell_obj["frekuensi"],
            "skor_dampak_inherit": cell_obj["dampak"]
        })
        
        cell_obj["value_skor"] = count
        
        # Ensure value is properly converted for comparison
        cell_value = cell_obj["value"]
        if isinstance(cell_value, str) and cell_value.isdigit():
            cell_value = int(cell_value)
        elif isinstance(cell_value, str) and cell_value.replace('.', '', 1).isdigit():
            # Handle float strings
            cell_value = float(cell_value)
            if cell_value.is_integer():
                cell_value = int(cell_value)
        elif isinstance(cell_value, int) or isinstance(cell_value, float):
            # If value is already a number, keep it for comparison but ensure string in obj
            cell_obj["value"] = str(cell_value)
        else:
            # If value can't be converted to a number, set to 0 for safe comparison
            cell_value = 0
        
        # Check if cell value meets risk appetite
        cell_obj["memenuhi"] = cell_value <= selera_risiko
        
        # Reset boundary flags
        cell_obj["atas"] = False
        cell_obj["bawah"] = False
        cell_obj["kiri"] = False
        cell_obj["kanan"] = False
        
        # Add boundary flags - implementasi seperti di PHP
        if cell_obj["memenuhi"]:
            # Untuk sel yang memenuhi selera risiko
            
            # Tandai garis atas jika dampak belum ada di garis_atas
            if cell_obj["dampak"] not in garis_atas:
                garis_atas.append(cell_obj["dampak"])
                cell_obj["atas"] = True
            
            # Periksa sel di sebelah kanan (dampak+1)
            next_right_exists = False
            for c in heatmap_cells:
                if c["dampak"] == cell_obj["dampak"] + 1 and c["frekuensi"] == cell_obj["frekuensi"]:
                    next_right_exists = True
                    # Jika sel kanan tidak memenuhi selera risiko, tandai garis kanan
                    c_value = c["value"]
                    if isinstance(c_value, str) and c_value.isdigit():
                        c_value = int(c_value)
                    elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                        # Handle float strings
                        c_value = float(c_value)
                        if c_value.is_integer():
                            c_value = int(c_value)
                    
                    # Only perform comparison if c_value is numeric
                    if isinstance(c_value, (int, float)) and c_value > selera_risiko:
                        if cell_obj["frekuensi"] not in garis_kanan:
                            garis_kanan.append(cell_obj["frekuensi"])
                            cell_obj["kanan"] = True
                    break
            
            # Jika tidak ada sel di sebelah kanan, tandai garis kanan
            if not next_right_exists:
                if cell_obj["frekuensi"] not in garis_kanan:
                    garis_kanan.append(cell_obj["frekuensi"])
                    cell_obj["kanan"] = True
        else:
            # Untuk sel yang tidak memenuhi selera risiko
            
            # Periksa sel di bawah (frekuensi-1)
            prev_down_exists = False
            for c in heatmap_cells:
                if c["dampak"] == cell_obj["dampak"] and c["frekuensi"] == cell_obj["frekuensi"] - 1:
                    prev_down_exists = True
                    # Jika sel bawah memenuhi selera risiko, tandai garis bawah
                    c_value = c["value"]
                    if isinstance(c_value, str) and c_value.isdigit():
                        c_value = int(c_value)
                    elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                        # Handle float strings
                        c_value = float(c_value)
                        if c_value.is_integer():
                            c_value = int(c_value)
                    
                    if c_value <= selera_risiko:
                        if cell_obj["dampak"] not in garis_bawah:
                            garis_bawah.append(cell_obj["dampak"])
                            cell_obj["bawah"] = True
                    break
            
            # Jika tidak ada sel di bawah, tandai garis bawah
            if not prev_down_exists:
                if cell_obj["dampak"] not in garis_bawah:
                    garis_bawah.append(cell_obj["dampak"])
                    cell_obj["bawah"] = True
            
            # Tandai garis kiri jika frekuensi belum ada di garis_kiri
            if cell_obj["frekuensi"] not in garis_kiri:
                garis_kiri.append(cell_obj["frekuensi"])
                cell_obj["kiri"] = True
        
        heatmap.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return heatmap

@router.get("/heatmap/analisis", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_heatmap_with_analisis(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk map heatmap with analysis data.
    
    Provides a detailed heatmap view including:
    - Risk counts per cell
    - Risk statements and levels
    - Compliance with risk appetite
    - Border indicators for risk boundaries
    
    Parameters:
    - template_id: Template ID
    - tahun: Year for risk data
    - id_instansi: Optional institution ID filter
    
    Returns:
    - List of heatmap cells with detailed analysis data
    """
    db = await Database.get_db()
    
    # Get template
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get selera_risiko
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", "")
    })
    if not struktur or "selera_risiko" not in struktur:
        raise HTTPException(
            status_code=400,
            detail="Risk appetite not set in organization structure"
        )
    selera_risiko = struktur["selera_risiko"]
    
    # Get kriteria values
    kriteria_kemungkinan = {}
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan[k["nilai"]] = k
    
    kriteria_dampak = {}
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak[k["nilai"]] = k
    
    # Build query for analisis
    query = {
        "tahun": tahun
    }
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Arrays untuk melacak garis yang sudah ditandai (seperti di PHP)
    garis_atas = []
    garis_bawah = []
    garis_kiri = []
    garis_kanan = []
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
        
    # Get all analyses and organize by coordinates using use_risk
    analyses_by_coord = {}
    async for analysis in db.analisis_risiko.find(query):
        # Determine which coordinates to use based on use_risk
        freq = 0
        damp = 0
        use_risk = analysis.get("use_risk", "I").upper()
        
        if use_risk == "A" and analysis.get("skor_kemungkinan_actual", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_actual", 0))
            damp = float(analysis.get("skor_dampak_actual", 0))
        elif use_risk == "T" and analysis.get("skor_kemungkinan_treated", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_treated", 0)) 
            damp = float(analysis.get("skor_dampak_treated", 0))
        elif use_risk == "R" and analysis.get("skor_kemungkinan_residual", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_residual", 0))
            damp = float(analysis.get("skor_dampak_residual", 0))
        else:
            freq = float(analysis.get("skor_kemungkinan_inherit", 0))
            damp = float(analysis.get("skor_dampak_inherit", 0))
        
        # Only process valid coordinates (both > 0)
        if freq > 0 and damp > 0:
            # Use a tuple of coordinates as the key
            coord_key = (freq, damp)
            
            # Initialize list for this coordinate if not exists
            if coord_key not in analyses_by_coord:
                analyses_by_coord[coord_key] = []
            
            # Add analysis to the list for this coordinate
            analyses_by_coord[coord_key].append(analysis)
    
    # Process cells with analysis data and boundary flags
    heatmap = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
        count = len(analyses_by_coord.get(coord_key, []))
        
        cell_obj["value_skor"] = count
        
        # Ensure value is properly converted for comparison
        cell_value = cell_obj["value"]
        if isinstance(cell_value, str) and cell_value.isdigit():
            cell_value = int(cell_value)
        elif isinstance(cell_value, str) and cell_value.replace('.', '', 1).isdigit():
            # Handle float strings
            cell_value = float(cell_value)
            if cell_value.is_integer():
                cell_value = int(cell_value)
        elif isinstance(cell_value, int) or isinstance(cell_value, float):
            # If value is already a number, keep it for comparison but ensure string in obj
            cell_obj["value"] = str(cell_value)
        else:
            # If value can't be converted to a number, set to 0 for safe comparison
            cell_value = 0
        
        # Check if cell value meets risk appetite
        cell_obj["memenuhi"] = cell_value <= selera_risiko
        
        # Add kriteria information
        if cell_obj["frekuensi"] in kriteria_kemungkinan:
            cell_obj["nama_frekuensi"] = kriteria_kemungkinan[cell_obj["frekuensi"]]["nama"]
        if cell_obj["dampak"] in kriteria_dampak:
            cell_obj["nama_dampak"] = kriteria_dampak[cell_obj["dampak"]]["nama"]
        
        # Reset boundary flags
        cell_obj["atas"] = False
        cell_obj["bawah"] = False
        cell_obj["kiri"] = False
        cell_obj["kanan"] = False
        
        # Add boundary flags - implementasi seperti di PHP
        if cell_obj["memenuhi"]:
            # Untuk sel yang memenuhi selera risiko
            
            # Tandai garis atas jika dampak belum ada di garis_atas
            if cell_obj["dampak"] not in garis_atas:
                garis_atas.append(cell_obj["dampak"])
                cell_obj["atas"] = True
            
            # Periksa sel di sebelah kanan (dampak+1)
            next_right_exists = False
            for c in heatmap_cells:
                if c["dampak"] == cell_obj["dampak"] + 1 and c["frekuensi"] == cell_obj["frekuensi"]:
                    next_right_exists = True
                    # Jika sel kanan tidak memenuhi selera risiko, tandai garis kanan
                    c_value = c["value"]
                    if isinstance(c_value, str) and c_value.isdigit():
                        c_value = int(c_value)
                    elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                        # Handle float strings
                        c_value = float(c_value)
                        if c_value.is_integer():
                            c_value = int(c_value)
                    
                    # Only perform comparison if c_value is numeric
                    if isinstance(c_value, (int, float)) and c_value > selera_risiko:
                        if cell_obj["frekuensi"] not in garis_kanan:
                            garis_kanan.append(cell_obj["frekuensi"])
                            cell_obj["kanan"] = True
                    break
            
            # Jika tidak ada sel di sebelah kanan, tandai garis kanan
            if not next_right_exists:
                if cell_obj["frekuensi"] not in garis_kanan:
                    garis_kanan.append(cell_obj["frekuensi"])
                    cell_obj["kanan"] = True
        else:
            # Untuk sel yang tidak memenuhi selera risiko
            
            # Periksa sel di bawah (frekuensi-1)
            prev_down_exists = False
            for c in heatmap_cells:
                if c["dampak"] == cell_obj["dampak"] and c["frekuensi"] == cell_obj["frekuensi"] - 1:
                    prev_down_exists = True
                    # Jika sel bawah memenuhi selera risiko, tandai garis bawah
                    c_value = c["value"]
                    if isinstance(c_value, str) and c_value.isdigit():
                        c_value = int(c_value)
                    elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                        # Handle float strings
                        c_value = float(c_value)
                        if c_value.is_integer():
                            c_value = int(c_value)
                    
                    if c_value <= selera_risiko:
                        if cell_obj["dampak"] not in garis_bawah:
                            garis_bawah.append(cell_obj["dampak"])
                            cell_obj["bawah"] = True
                    break
            
            # Jika tidak ada sel di bawah, tandai garis bawah
            if not prev_down_exists:
                if cell_obj["dampak"] not in garis_bawah:
                    garis_bawah.append(cell_obj["dampak"])
                    cell_obj["bawah"] = True
            
            # Tandai garis kiri jika frekuensi belum ada di garis_kiri
            if cell_obj["frekuensi"] not in garis_kiri:
                garis_kiri.append(cell_obj["frekuensi"])
                cell_obj["kiri"] = True
                
        # Get list of risks in this cell
        risks = []
        for analisis in analyses_by_coord.get(coord_key, []):
            ident_id = analisis.get("identifikasi_risiko_id")
            if ident_id:
                try:
                    identifikasi = await db.identifikasi_risiko.find_one({
                        "_id": ObjectId(ident_id)
                    })
                    if identifikasi:
                        # Get appropriate risk level based on use_risk
                        use_risk = analisis.get("use_risk", "I").upper()
                        level_risiko = None
                        memenuhi = False
                        
                        if use_risk == "A" and analisis.get("level_risiko_actual", 0) > 0:
                            level_risiko = analisis.get("level_risiko_actual", 0)
                            memenuhi = analisis.get("memenuhi_actual", False)
                        elif use_risk == "T" and analisis.get("level_risiko_treated", 0) > 0:
                            level_risiko = analisis.get("level_risiko_treated", 0)
                            memenuhi = analisis.get("memenuhi_treated", False)
                        elif use_risk == "R" and analisis.get("level_risiko_residual", 0) > 0:
                            level_risiko = analisis.get("level_risiko_residual", 0)
                            memenuhi = analisis.get("memenuhi_residual", False)
                        else:
                            level_risiko = analisis.get("level_risiko_inherit", 0)
                            memenuhi = analisis.get("memenuhi_inherit", False)
                            
                        risks.append({
                            "id": str(analisis["_id"]),
                            "pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
                            "level_risiko": level_risiko,
                            "memenuhi": memenuhi,
                            "use_risk": use_risk
                        })
                except Exception as e:
                    # If error occurs during processing, continue
                    print(f"Error processing risk: {str(e)}")
                    continue
            
        cell_obj["risks"] = risks
        
        heatmap.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return heatmap

@router.put("/heatmap/{id}", response_model=PetaRisikoMatriksHeatmapResponse)
async def update_heatmap(
    id: str,
    heatmap: PetaRisikoMatriksHeatmapUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a risk map heatmap cell.
    
    Only SUPER_ADMIN can update heatmap cells.
    
    Parameters:
    - id: Heatmap cell ID
    - heatmap: Updated heatmap data
    
    Returns:
    - Updated heatmap cell details
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can update risk map heatmap cells"
        )
    
    db = await Database.get_db()
    
    # Get existing heatmap cell
    existing = await db.peta_risiko_matriks_heatmap.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Heatmap cell not found")
    
    # Prepare update data
    update_data = heatmap.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # If value is updated, auto-update kode_warna
    if "value" in update_data and "kode_warna" not in update_data:
        update_data["kode_warna"] = get_color_code(update_data["value"])
    
    result = await db.peta_risiko_matriks_heatmap.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Heatmap cell not found")
    
    updated = await db.peta_risiko_matriks_heatmap.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    
    return PetaRisikoMatriksHeatmapResponse(**updated)

@router.delete("/heatmap/{id}")
async def delete_heatmap(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a risk map heatmap cell.
    
    Removes a heatmap cell and its associated data.
    Required Role: SUPER_ADMIN
    
    Parameters:
    - id: Heatmap cell ID
    
    Returns:
    - Success message
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can delete heatmap cells"
        )
    
    db = await Database.get_db()
    
    result = await db.peta_risiko_matriks_heatmap.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Heatmap cell not found")
    
    return {"message": "Heatmap cell deleted successfully"}

@router.get("/heatmap/{id}", response_model=PetaRisikoMatriksHeatmapResponse)
async def get_heatmap_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific risk map heatmap cell by ID.
    
    Retrieves detailed information about a single heatmap cell.
    
    Parameters:
    - id: Heatmap cell ID
    
    Returns:
    - Detailed heatmap cell information
    """
    db = await Database.get_db()
    
    heatmap = await db.peta_risiko_matriks_heatmap.find_one({"_id": ObjectId(id)})
    if not heatmap:
        raise HTTPException(status_code=404, detail="Heatmap cell not found")
    
    heatmap["id"] = str(heatmap.pop("_id"))
    return PetaRisikoMatriksHeatmapResponse(**heatmap)

@router.get("/view", response_model=PetaRisikoCompleteView)
async def get_peta_risiko_view(
    tahun: int = Query(..., description="Year"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete risk map view including template, categories, and heatmap data.
    
    This endpoint combines multiple risk map components into a single response,
    similar to the PHP implementation's PetaRisikoController->index().
    
    Parameters:
    - tahun: Year for the risk map
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Parent Work Unit ID
    
    Returns:
    - Complete view with template, categories, and heatmap data
    """
    try:
        db = await Database.get_db()
        
        # 1. Get induk unit kerja data
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        if not induk_unit:
            raise HTTPException(status_code=404, detail="Parent work unit not found")
        
        # 2. Get template
        template = await db.peta_risiko_template.find_one({
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "tahun": tahun
        })
        
        # If no template for current induk_unit_kerja, check parent
        if not template and induk_unit.get("parent_id"):
            template = await db.peta_risiko_template.find_one({
                "id_induk_unit_kerja": induk_unit["parent_id"],
                "tahun": tahun
            })
        
        if not template:
            # Return empty response if no template found
            return PetaRisikoCompleteView(
                template=None,
                kategori_frekuensi=[],
                kategori_dampak=[],
                klasifikasi_frekuensi=[],
                klasifikasi_dampak=[],
                meta_frekuensi=[],
                meta_dampak=[],
                meta_heatmap=[],
                meta_inherit=[],
                meta_residual=[],
                meta_treated=[]
            )
        
        template_id = str(template["_id"])
        template["id"] = template_id
        template["klp_id"] = id_induk_unit_kerja  # Add KLP ID from the input parameter
        
        # 2.1 Get the correct selera_risiko from struktur_organisasi (most authoritative source)
        # FIXED: Look for struktur by id_induk_unit_kerja instead of _id
        struktur = await db.struktur_organisasi.find_one({
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "id_instansi": id_instansi
        })
        
        # Determine the correct selera_risiko value, prioritizing different sources
        selera_risiko = 0  # Default value
        
        # First priority: Get from struktur_organisasi if available
        if struktur and "selera_risiko" in struktur:
            selera_risiko = struktur["selera_risiko"]
        # Second priority: Get from template if it has a properly structured selera_risiko
        elif "selera_risiko" in template and isinstance(template["selera_risiko"], dict) and "current" in template["selera_risiko"]:
            selera_risiko = template["selera_risiko"]["current"]
        # Third priority: Get from induk_unit if available
        elif "selera_risiko" in induk_unit:
            selera_risiko = induk_unit["selera_risiko"]
        
        # 3. Get categories
        kategori_frekuensi = []
        async for kategori in db.peta_risiko_kategori.find({
            "template_id": template_id,
            "jenis": "FREKUENSI"
        }):
            kategori["id"] = str(kategori.pop("_id"))
            # Ensure key is an integer
            if "key" in kategori and not isinstance(kategori["key"], int):
                kategori["key"] = int(kategori["key"])
            kategori_frekuensi.append(PetaRisikoKategoriResponse(**kategori))
        
        kategori_dampak = []
        async for kategori in db.peta_risiko_kategori.find({
            "template_id": template_id,
            "jenis": "DAMPAK"
        }):
            kategori["id"] = str(kategori.pop("_id"))
            # Ensure key is an integer
            if "key" in kategori and not isinstance(kategori["key"], int):
                kategori["key"] = int(kategori["key"])
            kategori_dampak.append(PetaRisikoKategoriResponse(**kategori))
        
        # 4. Get all child KLPs for filtering
        # Get all KLPs that are children of current induk_unit_kerja
        child_klps = [id_induk_unit_kerja]
        async for child in db.induk_unit_kerja.find({"parent_id": id_induk_unit_kerja}):
            child_klps.append(str(child["_id"]))
        
        # 5. Get heatmap data
        heatmap_base = []
        async for cell in db.peta_risiko_matriks_heatmap.find({
            "template_id": template_id
        }).sort([("dampak", 1), ("frekuensi", -1)]):
            cell["id"] = str(cell.pop("_id"))
            # Ensure frekuensi and dampak are integers
            if "frekuensi" in cell and not isinstance(cell["frekuensi"], int):
                try:
                    cell["frekuensi"] = int(cell["frekuensi"])
                except (ValueError, TypeError):
                    cell["frekuensi"] = 0
            if "dampak" in cell and not isinstance(cell["dampak"], int):
                try:
                    cell["dampak"] = int(cell["dampak"])
                except (ValueError, TypeError):
                    cell["dampak"] = 0
            # Ensure value is a string
            if "value" in cell and not isinstance(cell["value"], str):
                cell["value"] = str(cell["value"])
            heatmap_base.append(cell)
        
        # 6. Get meta_heatmap (with boundary flags)
        meta_heatmap = []
        
        # Arrays untuk melacak garis yang sudah ditandai (seperti di PHP)
        garis_atas = []
        garis_bawah = []
        garis_kiri = []
        garis_kanan = []
        
        # First, get all analyses for this year and child KLPs
        analyses_by_coord = {}  # Dictionary to store analyses by coordinates using use_risk
        
        async for analysis in db.analisis_risiko.find({
            "tahun": tahun,
            "id_induk_unit_kerja": {"$in": child_klps}
        }):
            # Determine which coordinates to use based on use_risk
            freq = 0
            damp = 0
            use_risk = analysis.get("use_risk", "I").upper()
            
            if use_risk == "A" and analysis.get("skor_kemungkinan_actual", 0) > 0:
                freq = float(analysis.get("skor_kemungkinan_actual", 0))
                damp = float(analysis.get("skor_dampak_actual", 0))
            elif use_risk == "T" and analysis.get("skor_kemungkinan_treated", 0) > 0:
                freq = float(analysis.get("skor_kemungkinan_treated", 0)) 
                damp = float(analysis.get("skor_dampak_treated", 0))
            elif use_risk == "R" and analysis.get("skor_kemungkinan_residual", 0) > 0:
                freq = float(analysis.get("skor_kemungkinan_residual", 0))
                damp = float(analysis.get("skor_dampak_residual", 0))
            else:
                freq = float(analysis.get("skor_kemungkinan_inherit", 0))
                damp = float(analysis.get("skor_dampak_inherit", 0))
            
            # Only process valid coordinates (both > 0)
            if freq > 0 and damp > 0:
                # Use a tuple of coordinates as the key
                coord_key = (freq, damp)
                
                # Initialize list for this coordinate if not exists
                if coord_key not in analyses_by_coord:
                    analyses_by_coord[coord_key] = []
                
                # Add analysis to the list for this coordinate
                analyses_by_coord[coord_key].append(analysis)
        
        for cell in heatmap_base:
            # Add boundary flags for risk appetite
            cell_obj = cell.copy()
            
            # Get count of risks in this specific cell using the analyses_by_coord dictionary
            coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
            count = len(analyses_by_coord.get(coord_key, []))
            
            # Set value_skor to the actual risk count
            cell_obj["value_skor"] = count
            
            # Ensure value is properly converted for comparison
            cell_value = cell_obj["value"]
            if isinstance(cell_value, str) and cell_value.isdigit():
                cell_value = int(cell_value)
            elif isinstance(cell_value, str) and cell_value.replace('.', '', 1).isdigit():
                # Handle float strings
                cell_value = float(cell_value)
                if cell_value.is_integer():
                    cell_value = int(cell_value)
            elif isinstance(cell_value, int) or isinstance(cell_value, float):
                # If value is already a number, keep it for comparison but ensure string in obj
                cell_obj["value"] = str(cell_value)
            else:
                # If value can't be converted to a number, set to 0 for safe comparison
                cell_value = 0
            
            # Check if cell value meets risk appetite
            cell_obj["memenuhi"] = cell_value <= selera_risiko
            
            # Reset boundary flags
            cell_obj["atas"] = False
            cell_obj["bawah"] = False
            cell_obj["kiri"] = False
            cell_obj["kanan"] = False
            
            # Add boundary flags - implementasi seperti di PHP
            if cell_obj["memenuhi"]:
                # Untuk sel yang memenuhi selera risiko
                
                # Tandai garis atas jika dampak belum ada di garis_atas
                if cell_obj["dampak"] not in garis_atas:
                    garis_atas.append(cell_obj["dampak"])
                    cell_obj["atas"] = True
                
                # Periksa sel di sebelah kanan (dampak+1)
                next_right_exists = False
                for c in heatmap_base:
                    if c["dampak"] == cell_obj["dampak"] + 1 and c["frekuensi"] == cell_obj["frekuensi"]:
                        next_right_exists = True
                        # Jika sel kanan tidak memenuhi selera risiko, tandai garis kanan
                        c_value = c["value"]
                        if isinstance(c_value, str) and c_value.isdigit():
                            c_value = int(c_value)
                        elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                            # Handle float strings
                            c_value = float(c_value)
                            if c_value.is_integer():
                                c_value = int(c_value)
                        
                        # Only perform comparison if c_value is numeric
                        if isinstance(c_value, (int, float)) and c_value > selera_risiko:
                            if cell_obj["frekuensi"] not in garis_kanan:
                                garis_kanan.append(cell_obj["frekuensi"])
                                cell_obj["kanan"] = True
                        break
                
                # Jika tidak ada sel di sebelah kanan, tandai garis kanan
                if not next_right_exists:
                    if cell_obj["frekuensi"] not in garis_kanan:
                        garis_kanan.append(cell_obj["frekuensi"])
                        cell_obj["kanan"] = True
            else:
                # Untuk sel yang tidak memenuhi selera risiko
                
                # Periksa sel di bawah (frekuensi-1)
                prev_down_exists = False
                for c in heatmap_base:
                    if c["dampak"] == cell_obj["dampak"] and c["frekuensi"] == cell_obj["frekuensi"] - 1:
                        prev_down_exists = True
                        # Jika sel bawah memenuhi selera risiko, tandai garis bawah
                        c_value = c["value"]
                        if isinstance(c_value, str) and c_value.isdigit():
                            c_value = int(c_value)
                        elif isinstance(c_value, str) and c_value.replace('.', '', 1).isdigit():
                            # Handle float strings
                            c_value = float(c_value)
                            if c_value.is_integer():
                                c_value = int(c_value)
                        
                        if c_value <= selera_risiko:
                            if cell_obj["dampak"] not in garis_bawah:
                                garis_bawah.append(cell_obj["dampak"])
                                cell_obj["bawah"] = True
                        break
                
                # Jika tidak ada sel di bawah, tandai garis bawah
                if not prev_down_exists:
                    if cell_obj["dampak"] not in garis_bawah:
                        garis_bawah.append(cell_obj["dampak"])
                        cell_obj["bawah"] = True
                
                # Tandai garis kiri jika frekuensi belum ada di garis_kiri
                if cell_obj["frekuensi"] not in garis_kiri:
                    garis_kiri.append(cell_obj["frekuensi"])
                    cell_obj["kiri"] = True
            
            # Add risk data for this cell
            risks = []
            for analisis in analyses_by_coord.get(coord_key, []):
                ident_id = analisis.get("identifikasi_risiko_id")
                if ident_id:
                    try:
                        identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(ident_id)})
                        if identifikasi:
                            # Get appropriate risk level based on use_risk
                            use_risk = analisis.get("use_risk", "I").upper()
                            level_risiko = None
                            memenuhi = False
                            
                            if use_risk == "A" and analisis.get("level_risiko_actual", 0) > 0:
                                level_risiko = analisis.get("level_risiko_actual", 0)
                                memenuhi = analisis.get("memenuhi_actual", False)
                            elif use_risk == "T" and analisis.get("level_risiko_treated", 0) > 0:
                                level_risiko = analisis.get("level_risiko_treated", 0)
                                memenuhi = analisis.get("memenuhi_treated", False)
                            elif use_risk == "R" and analisis.get("level_risiko_residual", 0) > 0:
                                level_risiko = analisis.get("level_risiko_residual", 0)
                                memenuhi = analisis.get("memenuhi_residual", False)
                            else:
                                level_risiko = analisis.get("level_risiko_inherit", 0)
                                memenuhi = analisis.get("memenuhi_inherit", False)
                                
                            risks.append({
                                "id": str(analisis["_id"]),
                                "pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
                                "level_risiko": level_risiko,
                                "memenuhi": memenuhi,
                                "use_risk": use_risk
                            })
                    except Exception as e:
                        print(f"Error processing risk: {str(e)}")
                        continue
            
            cell_obj["risks"] = risks
            meta_heatmap.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
        
        # There was a heatmap section here that was using undefined heatmap_cells variable - removing it
        
        # 7. Get meta_inherit (inherit risk counts) - copy boundary flags from meta_heatmap
        meta_inherit = []
        for cell in heatmap_base:
            cell_obj = cell.copy()
            
            # Count only analyses where use_risk is "I" or default
            count = 0
            coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
            for analysis in analyses_by_coord.get(coord_key, []):
                use_risk = analysis.get("use_risk", "I").upper()
                if use_risk == "I":
                    count += 1
            
            cell_obj["value_skor"] = count
            
            # Copy boundary flags from meta_heatmap
            for meta_cell in meta_heatmap:
                if meta_cell.dampak == cell_obj["dampak"] and meta_cell.frekuensi == cell_obj["frekuensi"]:
                    cell_obj["atas"] = meta_cell.atas
                    cell_obj["bawah"] = meta_cell.bawah
                    cell_obj["kiri"] = meta_cell.kiri
                    cell_obj["kanan"] = meta_cell.kanan
                    cell_obj["memenuhi"] = meta_cell.memenuhi
                    break
            
            meta_inherit.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
        
        # 8. Get meta_residual (residual risk counts)
        meta_residual = []
        for cell in heatmap_base:
            cell_obj = cell.copy()
            
            # Count only analyses where use_risk is "R"
            count = 0
            coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
            for analysis in analyses_by_coord.get(coord_key, []):
                use_risk = analysis.get("use_risk", "I").upper()
                if use_risk == "R":
                    count += 1
            
            cell_obj["value_skor"] = count
            
            # Copy boundary flags from meta_heatmap
            for meta_cell in meta_heatmap:
                if meta_cell.dampak == cell_obj["dampak"] and meta_cell.frekuensi == cell_obj["frekuensi"]:
                    cell_obj["atas"] = meta_cell.atas
                    cell_obj["bawah"] = meta_cell.bawah
                    cell_obj["kiri"] = meta_cell.kiri
                    cell_obj["kanan"] = meta_cell.kanan
                    cell_obj["memenuhi"] = meta_cell.memenuhi
                    break
            
            meta_residual.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
        
        # 9. Get meta_treated (treated risk counts)
        meta_treated = []
        for cell in heatmap_base:
            cell_obj = cell.copy()
            
            # Count only analyses where use_risk is "T"
            count = 0
            coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
            for analysis in analyses_by_coord.get(coord_key, []):
                use_risk = analysis.get("use_risk", "I").upper()
                if use_risk == "T":
                    count += 1
            
            cell_obj["value_skor"] = count
            
            # Copy boundary flags from meta_heatmap
            for meta_cell in meta_heatmap:
                if meta_cell.dampak == cell_obj["dampak"] and meta_cell.frekuensi == cell_obj["frekuensi"]:
                    cell_obj["atas"] = meta_cell.atas
                    cell_obj["bawah"] = meta_cell.bawah
                    cell_obj["kiri"] = meta_cell.kiri
                    cell_obj["kanan"] = meta_cell.kanan
                    cell_obj["memenuhi"] = meta_cell.memenuhi
                    break
            
            meta_treated.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
        
        # 10. Get meta_actual (actual risk counts)
        meta_actual = []
        for cell in heatmap_base:
            cell_obj = cell.copy()
            
            # Count only analyses where use_risk is "A"
            count = 0
            coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
            for analysis in analyses_by_coord.get(coord_key, []):
                use_risk = analysis.get("use_risk", "I").upper()
                if use_risk == "A":
                    count += 1
            
            cell_obj["value_skor"] = count
            
            # Copy boundary flags from meta_heatmap
            for meta_cell in meta_heatmap:
                if meta_cell.dampak == cell_obj["dampak"] and meta_cell.frekuensi == cell_obj["frekuensi"]:
                    cell_obj["atas"] = meta_cell.atas
                    cell_obj["bawah"] = meta_cell.bawah
                    cell_obj["kiri"] = meta_cell.kiri
                    cell_obj["kanan"] = meta_cell.kanan
                    cell_obj["memenuhi"] = meta_cell.memenuhi
                    break
            
            meta_actual.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
        
        # Add selera_risiko to template
        template_copy = template.copy()
        # Remove existing selera_risiko if it exists
        template_copy.pop('selera_risiko', None)
        
        template_response = PetaRisikoTemplateResponse(
            **template_copy,
            selera_risiko=SeleraRisiko(
                max=template["frekuensi"] * template["dampak"],
                current=selera_risiko
            )
        )
        
        # 3a. Get klasifikasi
        klasifikasi_frekuensi = []
        async for klasifikasi in db.peta_risiko_klasifikasi.find({
            "template_id": template_id,
            "jenis": "FREKUENSI"
        }):
            klasifikasi["id"] = str(klasifikasi.pop("_id"))
            # Ensure key is an integer
            if "key" in klasifikasi and not isinstance(klasifikasi["key"], int):
                klasifikasi["key"] = int(klasifikasi["key"])
            klasifikasi_frekuensi.append(PetaRisikoKlasifikasiResponse(**klasifikasi))
        
        klasifikasi_dampak = []
        async for klasifikasi in db.peta_risiko_klasifikasi.find({
            "template_id": template_id,
            "jenis": "DAMPAK"
        }):
            klasifikasi["id"] = str(klasifikasi.pop("_id"))
            # Ensure key is an integer
            if "key" in klasifikasi and not isinstance(klasifikasi["key"], int):
                klasifikasi["key"] = int(klasifikasi["key"])
            klasifikasi_dampak.append(PetaRisikoKlasifikasiResponse(**klasifikasi))
        
        # 3b. Get matriks
        matriks_frekuensi = []
        async for matriks in db.peta_risiko_matriks.find({
            "template_id": template_id,
            "jenis": "FREKUENSI"
        }):
            matriks["id"] = str(matriks.pop("_id"))
            matriks_frekuensi.append(PetaRisikoMatriksResponse(**matriks))
        
        matriks_dampak = []
        async for matriks in db.peta_risiko_matriks.find({
            "template_id": template_id,
            "jenis": "DAMPAK"
        }):
            matriks["id"] = str(matriks.pop("_id"))
            matriks_dampak.append(PetaRisikoMatriksResponse(**matriks))

        # Return complete view
        return PetaRisikoCompleteView(
            template=template_response,
            kategori_frekuensi=kategori_frekuensi,
            kategori_dampak=kategori_dampak,
            klasifikasi_frekuensi=klasifikasi_frekuensi,
            klasifikasi_dampak=klasifikasi_dampak,
            meta_frekuensi=matriks_frekuensi,
            meta_dampak=matriks_dampak,
            meta_heatmap=meta_heatmap,
            meta_inherit=meta_inherit,
            meta_residual=meta_residual,
            meta_treated=meta_treated,
            meta_actual=meta_actual
        )
    except Exception as e:
        # Add global error handling
        print(f"Error in get_peta_risiko_view: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving risk map data: {str(e)}"
        )

@router.post("/template/{id}/copy", response_model=PetaRisikoTemplateResponse)
async def copy_template(
    id: str,
    tahun: int = Query(..., description="Target year for the new template"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Target Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Copy an existing risk map template to a new unit/year.
    
    This endpoint creates a new template by copying all components from an existing template:
    1. Template settings (dimensions, name, etc.)
    2. Categories for frequency and impact
    3. Classifications for frequency and impact
    4. Matrix cells for frequency and impact
    5. Heatmap cells with color codes
    
    Required Role: SUPER_ADMIN or ADMIN_KLP
    
    Parameters:
    - id: Source template ID to copy from
    - tahun: Target year for the new template
    - id_instansi: Institution ID 
    - id_induk_unit_kerja: Target Parent Work Unit ID to copy to
    
    Returns:
    - The newly created template
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can copy templates"
        )
    
    db = await Database.get_db()
    
    # Check if a template already exists for the target
    existing_template = await db.peta_risiko_template.find_one({
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "tahun": tahun
    })
    
    if existing_template:
        raise HTTPException(
            status_code=400,
            detail=f"Template already exists for year {tahun} and selected work unit"
        )
    
    # Get source template
    source_template = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    if not source_template:
        raise HTTPException(status_code=404, detail="Source template not found")
    
    # Get induk unit kerja for naming
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Target work unit not found")
    
    # Create new template record - make a deep copy to avoid modifying the source
    new_template = source_template.copy()
    new_template.pop("_id")  # Remove ID to create a new document
    
    # Preserve the original dimensions
    frekuensi = source_template["frekuensi"]
    dampak = source_template["dampak"]
    new_template["frekuensi"] = frekuensi
    new_template["dampak"] = dampak
    
    # Update template properties
    new_template["id_induk_unit_kerja"] = id_induk_unit_kerja
    new_template["tahun"] = tahun
    new_template["kode"] = f"TEMPLATE-{tahun}"
    new_template["nama"] = f"Template Peta Risiko {tahun}"
    new_template["created_at"] = datetime.utcnow()
    new_template["created_by"] = current_user.get("id", "")
    new_template["created_by_name"] = current_user.get("name", "")
    
    # If source has a parent unit, inherit selera_risiko from parent
    if induk_unit.get("parent_id"):
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        if parent_induk and "selera_risiko" in parent_induk:
            new_template["selera_risiko"] = {"current": parent_induk["selera_risiko"]}
    
    # Insert the new template
    result = await db.peta_risiko_template.insert_one(new_template)
    new_template_id = str(result.inserted_id)
    
    # 1. Copy kategori
    kategori_list = []
    async for kategori in db.peta_risiko_kategori.find({"template_id": id}):
        kategori_copy = kategori.copy()
        kategori_copy.pop("_id")
        kategori_copy["template_id"] = new_template_id
        kategori_copy["created_at"] = datetime.utcnow()
        kategori_list.append(kategori_copy)
    
    if kategori_list:
        await db.peta_risiko_kategori.insert_many(kategori_list)
    
    # 2. Copy klasifikasi
    klasifikasi_list = []
    async for klasifikasi in db.peta_risiko_klasifikasi.find({"template_id": id}):
        klasifikasi_copy = klasifikasi.copy()
        klasifikasi_copy.pop("_id")
        klasifikasi_copy["template_id"] = new_template_id
        klasifikasi_copy["created_at"] = datetime.utcnow()
        klasifikasi_list.append(klasifikasi_copy)
    
    if klasifikasi_list:
        await db.peta_risiko_klasifikasi.insert_many(klasifikasi_list)
    
    # 3. Copy matriks
    matriks_list = []
    async for matriks in db.peta_risiko_matriks.find({"template_id": id}):
        matriks_copy = matriks.copy()
        matriks_copy.pop("_id")
        matriks_copy["template_id"] = new_template_id
        matriks_copy["created_at"] = datetime.utcnow()
        matriks_list.append(matriks_copy)
    
    if matriks_list:
        await db.peta_risiko_matriks.insert_many(matriks_list)
    
    # 4. Copy heatmap - only copy cells that match the original dimensions
    heatmap_list = []
    async for heatmap in db.peta_risiko_matriks_heatmap.find({"template_id": id}):
        # Only copy cells that are within the original matrix dimensions
        if heatmap.get("dampak", 0) <= dampak and heatmap.get("frekuensi", 0) <= frekuensi:
            heatmap_copy = heatmap.copy()
            heatmap_copy.pop("_id")
            heatmap_copy["template_id"] = new_template_id
            heatmap_copy["created_at"] = datetime.utcnow()
            heatmap_list.append(heatmap_copy)
    
    if heatmap_list:
        await db.peta_risiko_matriks_heatmap.insert_many(heatmap_list)
    
    # Return the new template
    created_template = await db.peta_risiko_template.find_one({"_id": result.inserted_id})
    created_template["id"] = new_template_id
    created_template["klp_id"] = id_induk_unit_kerja
    
    # Calculate max risk appetite 
    if not created_template.get("selera_risiko") or not isinstance(created_template.get("selera_risiko"), dict):
        created_template["selera_risiko"] = {}
    
    # If parent ID is not present, max is frequency × impact dimensions
    # Otherwise, get from parent's selera_risiko
    if not induk_unit.get("parent_id"):
        max_selera = created_template["frekuensi"] * created_template["dampak"]
    else:
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        max_selera = parent_induk.get("selera_risiko", 25) if parent_induk else 25
    
    # Ensure selera_risiko is properly structured
    selera_current = created_template.get("selera_risiko", {}).get("current", 0)
    created_template["selera_risiko"] = {
        "max": max_selera,
        "current": selera_current
    }
    
    return PetaRisikoTemplateResponse(**created_template)

@router.post("/template/bulk-copy", status_code=200)
async def copy_templates_bulk(
    source_tahun: int = Query(..., description="Source year to copy from"),
    target_tahun: int = Query(..., description="Target year to copy to"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID to filter templates"),
    current_user: dict = Depends(get_current_user)
):
    """
    Copy all risk map templates from one year to another for a given institution.
    
    This endpoint creates copies of all templates from a source year to a target year:
    1. For each template in the source year, creates a new template for the target year
    2. Copies all associated components (categories, classifications, matrix cells, heatmap cells)
    3. Preserves risk appetite settings and other configurations
    
    Required Role: SUPER_ADMIN
    
    Parameters:
    - source_tahun: Source year to copy templates from
    - target_tahun: Target year to copy templates to
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Parent Work Unit ID to filter templates
    
    Returns:
    - Summary of copied templates
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can perform bulk template copying"
        )
    
    if source_tahun == target_tahun:
        raise HTTPException(
            status_code=400,
            detail="Source and target years must be different"
        )
    
    db = await Database.get_db()
    
    # Get all induk_unit_kerja for the institution
    induk_unit_kerja_ids = []
    async for induk in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
        induk_unit_kerja_ids.append(str(induk["_id"]))
    
    if not induk_unit_kerja_ids:
        raise HTTPException(
            status_code=404,
            detail="No parent work units found for the specified institution"
        )
    
    # Verify that the specified id_induk_unit_kerja exists
    if id_induk_unit_kerja not in induk_unit_kerja_ids:
        raise HTTPException(
            status_code=404,
            detail="Specified parent work unit not found in this institution"
        )
    
    # Filter source templates by both the source year and the specified parent work unit
    source_templates = []
    async for template in db.peta_risiko_template.find({
        "tahun": source_tahun,
        "id_induk_unit_kerja": id_induk_unit_kerja
    }):
        source_templates.append(template)
    
    if not source_templates:
        raise HTTPException(
            status_code=404,
            detail=f"No templates found for year {source_tahun} and specified parent work unit"
        )
    
    # Get existing templates for the target year and specified parent work unit
    existing_templates = []
    existing_induk_unit_ids = []
    async for template in db.peta_risiko_template.find({
        "tahun": target_tahun,
        "id_induk_unit_kerja": id_induk_unit_kerja
    }):
        existing_templates.append(template)
        existing_induk_unit_ids.append(template["id_induk_unit_kerja"])
    
    # Copy each template
    copied_count = 0
    skipped_count = 0
    skipped_templates = []
    copied_templates = []
    
    for source_template in source_templates:
        source_id = str(source_template["_id"])
        id_induk_unit_kerja = source_template["id_induk_unit_kerja"]
        
        # Check if a template already exists for this induk_unit_kerja and target year
        if id_induk_unit_kerja in existing_induk_unit_ids:
            # Skip if template already exists for this unit and target year
            skipped_count += 1
            skipped_templates.append({
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "nama": source_template.get("nama", "")
            })
            continue
        
        # 1. Create new template - make a deep copy to avoid modifying the source
        new_template = source_template.copy()
        new_template.pop("_id")  # Remove ID to create a new document
        
        # Update template properties
        new_template["tahun"] = target_tahun
        new_template["kode"] = f"TEMPLATE-{target_tahun}"
        new_template["nama"] = f"Template Peta Risiko {target_tahun}"
        new_template["created_at"] = datetime.utcnow()
        new_template["created_by"] = current_user.get("id", "")
        new_template["created_by_name"] = current_user.get("name", "")
        
        # Preserve the original dimensions
        frekuensi = source_template["frekuensi"]
        dampak = source_template["dampak"]
        new_template["frekuensi"] = frekuensi
        new_template["dampak"] = dampak
        
        # Insert the new template
        result = await db.peta_risiko_template.insert_one(new_template)
        new_template_id = str(result.inserted_id)
        
        # Add to copied templates list
        copied_templates.append({
            "id": new_template_id,
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "nama": new_template["nama"]
        })
        
        # 2. Copy kategori
        kategori_list = []
        async for kategori in db.peta_risiko_kategori.find({"template_id": source_id}):
            kategori_copy = kategori.copy()
            kategori_copy.pop("_id")
            kategori_copy["template_id"] = new_template_id
            kategori_copy["created_at"] = datetime.utcnow()
            kategori_list.append(kategori_copy)
        
        if kategori_list:
            await db.peta_risiko_kategori.insert_many(kategori_list)
        
        # 3. Copy klasifikasi
        klasifikasi_list = []
        async for klasifikasi in db.peta_risiko_klasifikasi.find({"template_id": source_id}):
            klasifikasi_copy = klasifikasi.copy()
            klasifikasi_copy.pop("_id")
            klasifikasi_copy["template_id"] = new_template_id
            klasifikasi_copy["created_at"] = datetime.utcnow()
            klasifikasi_list.append(klasifikasi_copy)
        
        if klasifikasi_list:
            await db.peta_risiko_klasifikasi.insert_many(klasifikasi_list)
        
        # 4. Copy matriks
        matriks_list = []
        async for matriks in db.peta_risiko_matriks.find({"template_id": source_id}):
            matriks_copy = matriks.copy()
            matriks_copy.pop("_id")
            matriks_copy["template_id"] = new_template_id
            matriks_copy["created_at"] = datetime.utcnow()
            matriks_list.append(matriks_copy)
        
        if matriks_list:
            await db.peta_risiko_matriks.insert_many(matriks_list)
        
        # 5. Copy heatmap - only copy cells that match the original dimensions
        heatmap_list = []
        async for heatmap in db.peta_risiko_matriks_heatmap.find({"template_id": source_id}):
            # Only copy cells that are within the original matrix dimensions
            if heatmap.get("dampak", 0) <= dampak and heatmap.get("frekuensi", 0) <= frekuensi:
                heatmap_copy = heatmap.copy()
                heatmap_copy.pop("_id")
                heatmap_copy["template_id"] = new_template_id
                heatmap_copy["created_at"] = datetime.utcnow()
                heatmap_list.append(heatmap_copy)
        
        if heatmap_list:
            await db.peta_risiko_matriks_heatmap.insert_many(heatmap_list)
            
        copied_count += 1
    
    # Get all templates for target year (including existing and newly copied)
    all_templates = []
    async for template in db.peta_risiko_template.find({
        "tahun": target_tahun,
        "id_induk_unit_kerja": id_induk_unit_kerja
    }):
        all_templates.append({
            "id": str(template["_id"]),
            "id_induk_unit_kerja": template["id_induk_unit_kerja"],
            "nama": template.get("nama", ""),
            "kode": template.get("kode", ""),
            "frekuensi": template.get("frekuensi", 0),
            "dampak": template.get("dampak", 0)
        })
    
    return {
        "message": f"Successfully copied {copied_count} templates from year {source_tahun} to year {target_tahun}",
        "source_year": source_tahun,
        "target_year": target_tahun,
        "templates_copied": copied_count,
        "templates_skipped": skipped_count,
        "skipped_templates": skipped_templates,
        "copied_templates": copied_templates,
        "all_templates": all_templates
    }

@router.post("/template/setup-matrix", response_model=PetaRisikoTemplateResponse)
async def setup_matrix(
    tahun: int = Query(..., description="Year for the template"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID"),
    dampak: int = Query(..., description="Number of impact levels"),
    frekuensi: int = Query(..., description="Number of frequency levels"),
    current_user: dict = Depends(get_current_user)
):
    """
    Set up a complete risk map matrix with default values.
    
    This endpoint creates or updates a template with:
    1. Basic template structure with dimensions
    2. Default kategori for frequency and impact
    3. Default heatmap cells based on the dimensions
    
    Required Role: SUPER_ADMIN or ADMIN_KLP
    
    Parameters:
    - tahun: Year for the template
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Parent Work Unit ID 
    - dampak: Number of impact levels (e.g., 5)
    - frekuensi: Number of frequency levels (e.g., 5)
    
    Returns:
    - The created or updated template
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can set up matrix templates"
        )
    
    db = await Database.get_db()
    
    # Check if template exists
    template = await db.peta_risiko_template.find_one({
        "id_induk_unit_kerja": id_induk_unit_kerja,
        "tahun": tahun
    })
    
    if not template:
        # Create new template
        template_data = {
            "kode": f"TEMPLATE-{tahun}",
            "nama": f"Template Peta Risiko {tahun}",
            "frekuensi": frekuensi,
            "dampak": dampak,
            "tahun": tahun,
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("id", ""),
            "created_by_name": current_user.get("name", "")
        }
        
        # Get induk unit kerja data
        induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        if not induk_unit:
            raise HTTPException(status_code=404, detail="Parent work unit not found")
        
        # If it has a parent unit, get selera_risiko from parent
        if induk_unit.get("parent_id"):
            parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
            if parent_induk and "selera_risiko" in parent_induk:
                template_data["selera_risiko"] = {"current": parent_induk["selera_risiko"]}
        else:
            # Default selera_risiko
            template_data["selera_risiko"] = {"current": 6}  # Default medium risk
        
        result = await db.peta_risiko_template.insert_one(template_data)
        template_id = str(result.inserted_id)
    else:
        # Update existing template
        template_id = str(template["_id"])
        await db.peta_risiko_template.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": {
                "frekuensi": frekuensi,
                "dampak": dampak,
                "updated_at": datetime.utcnow(),
                "updated_by": current_user.get("id", ""),
                "updated_by_name": current_user.get("name", "")
            }}
        )
    
    # Create default kategori for dampak
    for i in range(1, dampak+1):
        await db.peta_risiko_kategori.update_one(
            {
                "key": i,
                "jenis": "DAMPAK",
                "template_id": template_id
            },
            {"$set": {
                "value": f"Dampak {i}",
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    # Create default kategori for frekuensi
    for i in range(1, frekuensi+1):
        await db.peta_risiko_kategori.update_one(
            {
                "key": i,
                "jenis": "FREKUENSI",
                "template_id": template_id
            },
            {"$set": {
                "value": f"Frekuensi {i}",
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    # Create default heatmap cells
    for i in range(1, dampak+1):
        for j in range(1, frekuensi+1):
            # Calculate default cell value using the custom pattern
            value = get_custom_risk_value(i, j)
            color = get_color_code(value)
            
            await db.peta_risiko_matriks_heatmap.update_one(
                {
                    "dampak": i,
                    "frekuensi": j,
                    "template_id": template_id
                },
                {"$set": {
                    "value": str(value),
                    "kode_warna": color,
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
    
    # Return the updated template
    updated_template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    updated_template["id"] = template_id
    updated_template["klp_id"] = id_induk_unit_kerja
    
    # Get induk unit kerja data for risk appetite
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Calculate max risk appetite
    if not updated_template.get("selera_risiko") or not isinstance(updated_template.get("selera_risiko"), dict):
        updated_template["selera_risiko"] = {}
    
    # Get selera_risiko current
    selera_current = updated_template.get("selera_risiko", {}).get("current", 6)  # Default to medium risk
    
    # If parent ID is not present, max is frequency × impact dimensions
    # Otherwise, get from parent's selera_risiko
    if not induk_unit.get("parent_id"):
        max_selera = dampak * frekuensi
    else:
        parent_induk = await db.induk_unit_kerja.find_one({"_id": ObjectId(induk_unit["parent_id"])})
        max_selera = parent_induk.get("selera_risiko", 25) if parent_induk else 25
    
    # Ensure selera_risiko is properly structured
    updated_template["selera_risiko"] = {
        "max": max_selera,
        "current": selera_current
    }
    
    return PetaRisikoTemplateResponse(**updated_template)

@router.delete("/template/{id}/reset", status_code=200)
async def reset_template(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Reset (delete) a risk map template and all its components.
    
    This endpoint deletes:
    1. The template itself
    2. All associated categories
    3. All associated classifications
    4. All associated matrix cells
    5. All associated heatmap cells
    
    Required Role: SUPER_ADMIN or ADMIN_KLP
    
    Parameters:
    - id: Template ID to reset/delete
    
    Returns:
    - Success message with deletion counts
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN or ADMIN_KLP can reset templates"
        )
    
    db = await Database.get_db()
    
    # Validate template exists
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(id)})
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    # Check user has access to this template
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP, UserRole.PENGELOLA_RISIKO, UserRole.PEMILIK_RISIKO, UserRole.UNIT_MANAJEMEN_RISIKO, UserRole.PENGAWAS_INTERN, UserRole.PEGAWAI]:
        id_induk_unit_kerja = current_user.get("id_induk_unit_kerja")
        if not id_induk_unit_kerja or id_induk_unit_kerja != template.get("id_induk_unit_kerja"):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to reset this template"
            )
    
    # Start deletion process
    try:
        # 1. Delete template kategori
        kategori_result = await db.peta_risiko_kategori.delete_many({"template_id": id})
        kategori_count = kategori_result.deleted_count
        
        # 2. Delete template klasifikasi
        klasifikasi_result = await db.peta_risiko_klasifikasi.delete_many({"template_id": id})
        klasifikasi_count = klasifikasi_result.deleted_count
        
        # 3. Delete template matriks
        matriks_result = await db.peta_risiko_matriks.delete_many({"template_id": id})
        matriks_count = matriks_result.deleted_count
        
        # 4. Delete template heatmap
        heatmap_result = await db.peta_risiko_matriks_heatmap.delete_many({"template_id": id})
        heatmap_count = heatmap_result.deleted_count
        
        # 5. Delete the template itself
        template_result = await db.peta_risiko_template.delete_one({"_id": ObjectId(id)})
        template_deleted = template_result.deleted_count > 0
        
        return {
            "message": "Template and all its components deleted successfully",
            "template_deleted": template_deleted,
            "kategori_deleted": kategori_count,
            "klasifikasi_deleted": klasifikasi_count,
            "matriks_deleted": matriks_count,
            "heatmap_deleted": heatmap_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset template: {str(e)}"
        )

@router.get("/meta_inherit", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_meta_inherit(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get inherit risk map heatmap."""
    # Get data from heatmap base
    db = await Database.get_db()
    
    # Get template
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get selera_risiko
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", "")
    })
    if not struktur or "selera_risiko" not in struktur:
        raise HTTPException(
            status_code=400,
            detail="Risk appetite not set in organization structure"
        )
    selera_risiko = struktur["selera_risiko"]
    
    # Get kriteria values
    kriteria_kemungkinan = {}
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan[k["nilai"]] = k
    
    kriteria_dampak = {}
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak[k["nilai"]] = k
    
    # Build query for analisis
    query = {
        "tahun": tahun
    }
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Get all analyses and organize by coordinates
    analyses_by_coord = {}
    async for analysis in db.analisis_risiko.find(query):
        # For inherent risk, we consider analyses where:
        # 1. use_risk is "I" (inherent)
        # 2. OR analyses where use_risk indicates another level but that level doesn't have valid values
        use_risk = analysis.get("use_risk", "I").upper()
        
        # Check if inherent risk should be the effective risk
        should_use_inherent = (
            use_risk == "I" or 
            (use_risk == "R" and (analysis.get("skor_kemungkinan_residual", 0) <= 0 or analysis.get("skor_dampak_residual", 0) <= 0)) or
            (use_risk == "T" and (analysis.get("skor_kemungkinan_treated", 0) <= 0 or analysis.get("skor_dampak_treated", 0) <= 0)) or
            (use_risk == "A" and (analysis.get("skor_kemungkinan_actual", 0) <= 0 or analysis.get("skor_dampak_actual", 0) <= 0))
        )
        
        if should_use_inherent:
            freq = float(analysis.get("skor_kemungkinan_inherit", 0))
            damp = float(analysis.get("skor_dampak_inherit", 0))
            
            # Only process valid coordinates
            if freq > 0 and damp > 0:
                coord_key = (freq, damp)
                
                if coord_key not in analyses_by_coord:
                    analyses_by_coord[coord_key] = []
                
                analyses_by_coord[coord_key].append(analysis)
    
    # Get meta_heatmap first to copy the boundary information
    meta_heatmap = await get_peta_risiko_view(
        template_id=template_id,
        tahun=tahun,
        id_instansi=id_instansi,
        current_user=current_user
    )
    
    meta_heatmap_dict = {
        (float(cell.frekuensi), float(cell.dampak)): cell
        for cell in meta_heatmap
    }
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
    
    # Process cells with inherit risk count
    meta_inherit = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
        count = len(analyses_by_coord.get(coord_key, []))
        
        cell_obj["value_skor"] = count
        
        # Copy boundary flags from meta_heatmap
        if coord_key in meta_heatmap_dict:
            cell_obj["atas"] = meta_heatmap_dict[coord_key].atas
            cell_obj["bawah"] = meta_heatmap_dict[coord_key].bawah
            cell_obj["kiri"] = meta_heatmap_dict[coord_key].kiri
            cell_obj["kanan"] = meta_heatmap_dict[coord_key].kanan
            cell_obj["memenuhi"] = meta_heatmap_dict[coord_key].memenuhi
        else:
            cell_obj["atas"] = False
            cell_obj["bawah"] = False
            cell_obj["kiri"] = False
            cell_obj["kanan"] = False
            cell_obj["memenuhi"] = False
        
        # Add kriteria information
        if cell_obj["frekuensi"] in kriteria_kemungkinan:
            cell_obj["nama_frekuensi"] = kriteria_kemungkinan[cell_obj["frekuensi"]]["nama"]
        if cell_obj["dampak"] in kriteria_dampak:
            cell_obj["nama_dampak"] = kriteria_dampak[cell_obj["dampak"]]["nama"]
        
        meta_inherit.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return meta_inherit


@router.get("/meta_residual", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_meta_residual(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get residual risk map heatmap."""
    # Get data from heatmap base
    db = await Database.get_db()
    
    # Get template
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get selera_risiko
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", "")
    })
    if not struktur or "selera_risiko" not in struktur:
        raise HTTPException(
            status_code=400,
            detail="Risk appetite not set in organization structure"
        )
    selera_risiko = struktur["selera_risiko"]
    
    # Get kriteria values
    kriteria_kemungkinan = {}
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan[k["nilai"]] = k
    
    kriteria_dampak = {}
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak[k["nilai"]] = k
    
    # Build query for analisis
    query = {
        "tahun": tahun
    }
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Get all analyses and organize by coordinates for residual risks
    analyses_by_coord = {}
    async for analysis in db.analisis_risiko.find(query):
        # For residual risks, we only want analyses where:
        # 1. use_risk is "R" (residual)
        # 2. valid residual values exist
        use_risk = analysis.get("use_risk", "I").upper()
        
        if use_risk == "R" and analysis.get("skor_kemungkinan_residual", 0) > 0 and analysis.get("skor_dampak_residual", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_residual", 0))
            damp = float(analysis.get("skor_dampak_residual", 0))
            
            # Only process valid coordinates
            if freq > 0 and damp > 0:
                coord_key = (freq, damp)
                
                if coord_key not in analyses_by_coord:
                    analyses_by_coord[coord_key] = []
                
                analyses_by_coord[coord_key].append(analysis)
    
    # Get meta_heatmap first to copy the boundary information
    meta_heatmap = await get_peta_risiko_view(
        template_id=template_id,
        tahun=tahun,
        id_instansi=id_instansi,
        current_user=current_user
    )
    
    meta_heatmap_dict = {
        (float(cell.frekuensi), float(cell.dampak)): cell
        for cell in meta_heatmap
    }
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
    
    # Process cells with residual risk count
    meta_residual = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
        count = len(analyses_by_coord.get(coord_key, []))
        
        cell_obj["value_skor"] = count
        
        # Copy boundary flags from meta_heatmap
        if coord_key in meta_heatmap_dict:
            cell_obj["atas"] = meta_heatmap_dict[coord_key].atas
            cell_obj["bawah"] = meta_heatmap_dict[coord_key].bawah
            cell_obj["kiri"] = meta_heatmap_dict[coord_key].kiri
            cell_obj["kanan"] = meta_heatmap_dict[coord_key].kanan
            cell_obj["memenuhi"] = meta_heatmap_dict[coord_key].memenuhi
        else:
            cell_obj["atas"] = False
            cell_obj["bawah"] = False
            cell_obj["kiri"] = False
            cell_obj["kanan"] = False
            cell_obj["memenuhi"] = False
        
        # Add kriteria information
        if cell_obj["frekuensi"] in kriteria_kemungkinan:
            cell_obj["nama_frekuensi"] = kriteria_kemungkinan[cell_obj["frekuensi"]]["nama"]
        if cell_obj["dampak"] in kriteria_dampak:
            cell_obj["nama_dampak"] = kriteria_dampak[cell_obj["dampak"]]["nama"]
        
        meta_residual.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return meta_residual


@router.get("/meta_treated", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_meta_treated(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get treated risk map heatmap."""
    # Get data from heatmap base
    db = await Database.get_db()
    
    # Get template
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get selera_risiko
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", "")
    })
    if not struktur or "selera_risiko" not in struktur:
        raise HTTPException(
            status_code=400,
            detail="Risk appetite not set in organization structure"
        )
    selera_risiko = struktur["selera_risiko"]
    
    # Get kriteria values
    kriteria_kemungkinan = {}
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan[k["nilai"]] = k
    
    kriteria_dampak = {}
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak[k["nilai"]] = k
    
    # Build query for analisis
    query = {
        "tahun": tahun
    }
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Get all analyses and organize by coordinates for treated risks
    analyses_by_coord = {}
    async for analysis in db.analisis_risiko.find(query):
        # For treated risks, we only want analyses where:
        # 1. use_risk is "T" (treated)
        # 2. valid treated values exist
        use_risk = analysis.get("use_risk", "I").upper()
        
        if use_risk == "T" and analysis.get("skor_kemungkinan_treated", 0) > 0 and analysis.get("skor_dampak_treated", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_treated", 0))
            damp = float(analysis.get("skor_dampak_treated", 0))
            
            # Only process valid coordinates
            if freq > 0 and damp > 0:
                coord_key = (freq, damp)
                
                if coord_key not in analyses_by_coord:
                    analyses_by_coord[coord_key] = []
                
                analyses_by_coord[coord_key].append(analysis)
    
    # Get meta_heatmap first to copy the boundary information
    meta_heatmap = await get_peta_risiko_view(
        template_id=template_id,
        tahun=tahun,
        id_instansi=id_instansi,
        current_user=current_user
    )
    
    meta_heatmap_dict = {
        (float(cell.frekuensi), float(cell.dampak)): cell
        for cell in meta_heatmap
    }
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
    
    # Process cells with treated risk count
    meta_treated = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
        count = len(analyses_by_coord.get(coord_key, []))
        
        cell_obj["value_skor"] = count
        
        # Copy boundary flags from meta_heatmap
        if coord_key in meta_heatmap_dict:
            cell_obj["atas"] = meta_heatmap_dict[coord_key].atas
            cell_obj["bawah"] = meta_heatmap_dict[coord_key].bawah
            cell_obj["kiri"] = meta_heatmap_dict[coord_key].kiri
            cell_obj["kanan"] = meta_heatmap_dict[coord_key].kanan
            cell_obj["memenuhi"] = meta_heatmap_dict[coord_key].memenuhi
        else:
            cell_obj["atas"] = False
            cell_obj["bawah"] = False
            cell_obj["kiri"] = False
            cell_obj["kanan"] = False
            cell_obj["memenuhi"] = False
        
        # Add kriteria information
        if cell_obj["frekuensi"] in kriteria_kemungkinan:
            cell_obj["nama_frekuensi"] = kriteria_kemungkinan[cell_obj["frekuensi"]]["nama"]
        if cell_obj["dampak"] in kriteria_dampak:
            cell_obj["nama_dampak"] = kriteria_dampak[cell_obj["dampak"]]["nama"]
        
        meta_treated.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return meta_treated


@router.get("/meta_actual", response_model=List[PetaRisikoMatriksHeatmapResponse])
async def get_meta_actual(
    template_id: str = Query(..., description="Template ID"),
    tahun: int = Query(..., description="Year"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get actual risk map heatmap."""
    # Get data from heatmap base
    db = await Database.get_db()
    
    # Get template
    template = await db.peta_risiko_template.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get induk unit kerja data
    induk_unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(template["id_induk_unit_kerja"])})
    if not induk_unit:
        raise HTTPException(status_code=404, detail="Parent work unit not found")
    
    # Get selera_risiko
    struktur = await db.struktur_organisasi.find_one({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", "")
    })
    if not struktur or "selera_risiko" not in struktur:
        raise HTTPException(
            status_code=400,
            detail="Risk appetite not set in organization structure"
        )
    selera_risiko = struktur["selera_risiko"]
    
    # Get kriteria values
    kriteria_kemungkinan = {}
    async for k in db.kriteria_kemungkinan.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_kemungkinan[k["nilai"]] = k
    
    kriteria_dampak = {}
    async for k in db.kriteria_dampak.find({
        "id_instansi": id_instansi or induk_unit.get("id_instansi", ""),
        "$or": [
            {"id_induk_unit_kerja": template["id_induk_unit_kerja"]},
            {"id_induk_unit_kerja": induk_unit.get("parent_id")}
        ]
    }).sort("nilai", 1):
        kriteria_dampak[k["nilai"]] = k
    
    # Build query for analisis
    query = {
        "tahun": tahun
    }
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Get all analyses and organize by coordinates for actual risks
    analyses_by_coord = {}
    async for analysis in db.analisis_risiko.find(query):
        # For actual risks, we only want analyses where:
        # 1. use_risk is "A" (actual)
        # 2. valid actual values exist
        use_risk = analysis.get("use_risk", "I").upper()
        
        if use_risk == "A" and analysis.get("skor_kemungkinan_actual", 0) > 0 and analysis.get("skor_dampak_actual", 0) > 0:
            freq = float(analysis.get("skor_kemungkinan_actual", 0))
            damp = float(analysis.get("skor_dampak_actual", 0))
            
            # Only process valid coordinates
            if freq > 0 and damp > 0:
                coord_key = (freq, damp)
                
                if coord_key not in analyses_by_coord:
                    analyses_by_coord[coord_key] = []
                
                analyses_by_coord[coord_key].append(analysis)
    
    # Get meta_heatmap first to copy the boundary information
    meta_heatmap = await get_peta_risiko_view(
        template_id=template_id,
        tahun=tahun,
        id_instansi=id_instansi,
        current_user=current_user
    )
    
    meta_heatmap_dict = {
        (float(cell.frekuensi), float(cell.dampak)): cell
        for cell in meta_heatmap
    }
    
    # Get all heatmap cells
    heatmap_cells = []
    async for cell in db.peta_risiko_matriks_heatmap.find({
        "template_id": template_id
    }).sort([("dampak", 1), ("frekuensi", -1)]):
        cell["id"] = str(cell.pop("_id"))
        heatmap_cells.append(cell)
    
    # Process cells with actual risk count
    meta_actual = []
    for cell in heatmap_cells:
        cell_obj = cell.copy()
        
        # Count risks in this cell
        coord_key = (float(cell_obj["frekuensi"]), float(cell_obj["dampak"]))
        count = len(analyses_by_coord.get(coord_key, []))
        
        cell_obj["value_skor"] = count
        
        # Copy boundary flags from meta_heatmap
        if coord_key in meta_heatmap_dict:
            cell_obj["atas"] = meta_heatmap_dict[coord_key].atas
            cell_obj["bawah"] = meta_heatmap_dict[coord_key].bawah
            cell_obj["kiri"] = meta_heatmap_dict[coord_key].kiri
            cell_obj["kanan"] = meta_heatmap_dict[coord_key].kanan
            cell_obj["memenuhi"] = meta_heatmap_dict[coord_key].memenuhi
        else:
            cell_obj["atas"] = False
            cell_obj["bawah"] = False
            cell_obj["kiri"] = False
            cell_obj["kanan"] = False
            cell_obj["memenuhi"] = False
        
        # Add kriteria information
        if cell_obj["frekuensi"] in kriteria_kemungkinan:
            cell_obj["nama_frekuensi"] = kriteria_kemungkinan[cell_obj["frekuensi"]]["nama"]
        if cell_obj["dampak"] in kriteria_dampak:
            cell_obj["nama_dampak"] = kriteria_dampak[cell_obj["dampak"]]["nama"]
        
        meta_actual.append(PetaRisikoMatriksHeatmapResponse(**cell_obj))
    
    return meta_actual

@router.get("/cell-risks", response_model=List[dict])
async def get_risks_by_cell(
    tahun: int = Query(..., description="Year"),
    frekuensi: float = Query(..., description="Frequency level"),
    dampak: float = Query(..., description="Impact level"),
    id_instansi: Optional[str] = Query(None, description="Institution ID"),
    id_induk_unit_kerja: Optional[str] = Query(None, description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get risk identifications and analyses for a specific cell in the risk matrix.
    
    This endpoint returns all risk identifications and their analyses that have
    the specified frequency and impact levels.
    
    Parameters:
    - tahun: Year for the risk data
    - frekuensi: Frequency level (1-5)
    - dampak: Impact level (1-5)
    - id_instansi: Optional institution ID filter
    - id_induk_unit_kerja: Optional parent work unit ID filter
    
    Returns:
    - List of risk identifications with their analyses
    """
    db = await Database.get_db()
    
    # Build query for analyses
    query = {
        "tahun": tahun,
        "$or": [
            # Inherit risk
            {
                "skor_kemungkinan_inherit": frekuensi,
                "skor_dampak_inherit": dampak,
                "use_risk": "I"
            },
            # Residual risk
            {
                "skor_kemungkinan_residual": frekuensi,
                "skor_dampak_residual": dampak,
                "use_risk": "R"
            },
            # Treated risk
            {
                "skor_kemungkinan_treated": frekuensi,
                "skor_dampak_treated": dampak,
                "use_risk": "T"
            },
            # Actual risk
            {
                "skor_kemungkinan_actual": frekuensi,
                "skor_dampak_actual": dampak,
                "use_risk": "A"
            }
        ]
    }
    
    # Add institution filter if provided
    if id_instansi:
        query["id_instansi"] = id_instansi
    
    # Add parent work unit filter if provided
    if id_induk_unit_kerja:
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Get analyses matching the criteria
    results = []
    async for analysis in db.analisis_risiko.find(query):
        analysis_id = str(analysis["_id"])
        identifikasi_id = analysis.get("identifikasi_risiko_id")
        
        if identifikasi_id:
            # Get risk identification data
            identifikasi = await db.identifikasi_risiko.find_one({"_id": ObjectId(identifikasi_id)})
            
            if identifikasi:
                # Get attachment count
                attachment_count = await db.attachments.count_documents({
                    "$or": [
                        {"ref_id": analysis_id, "type": AttachmentType.PENGENDALIAN},
                        {"id_analisis_risiko": analysis_id, "type": AttachmentType.PENGENDALIAN}
                    ]
                })
                
                # Get RTP count
                rtp_count = 0
                evaluasi_cursor = db.evaluasi_risiko.find({"identifikasi_risiko_id": identifikasi_id})
                async for evaluasi in evaluasi_cursor:
                    evaluasi_id = str(evaluasi["_id"])
                    rtp_count += await db.rtp.count_documents({"evaluasi_risiko_id": evaluasi_id})
                
                # Determine which risk level to use based on use_risk
                use_risk = analysis.get("use_risk", "I").upper()
                level_risiko = None
                memenuhi = False
                
                if use_risk == "A" and analysis.get("level_risiko_actual", 0) > 0:
                    level_risiko = analysis.get("level_risiko_actual", 0)
                    memenuhi = analysis.get("memenuhi_actual", False)
                    risk_type = "Actual"
                elif use_risk == "T" and analysis.get("level_risiko_treated", 0) > 0:
                    level_risiko = analysis.get("level_risiko_treated", 0)
                    memenuhi = analysis.get("memenuhi_treated", False)
                    risk_type = "Treated"
                elif use_risk == "R" and analysis.get("level_risiko_residual", 0) > 0:
                    level_risiko = analysis.get("level_risiko_residual", 0)
                    memenuhi = analysis.get("memenuhi_residual", False)
                    risk_type = "Residual"
                else:
                    level_risiko = analysis.get("level_risiko_inherit", 0)
                    memenuhi = analysis.get("memenuhi_inherit", False)
                    risk_type = "Inherent"
                
                # Create result object
                result = {
                    "id_analisis": analysis_id,
                    "id_identifikasi": str(identifikasi["_id"]),
                    "pernyataan_risiko": identifikasi.get("pernyataan_risiko", ""),
                    "kode_risiko": identifikasi.get("kode_risiko", ""),
                    "kategori_risiko": identifikasi.get("kategori_risiko", ""),
                    "level_risiko": level_risiko,
                    "memenuhi": memenuhi,
                    "risk_type": risk_type,
                    "use_risk": use_risk,
                    "attachment_count": attachment_count,
                    "rtp_count": rtp_count,
                    "tahun": analysis.get("tahun", tahun)
                }
                
                results.append(result)
    
    return results