from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.schemas.dashboard import RiskMatrixDataResponse, TemplateInfo
from app.schemas.risk import (
    PetaRisikoKlasifikasiResponse,
    PetaRisikoMatriksHeatmapResponse,
    PetaRisikoMatriksResponse,
    PetaRisikoKategoriResponse
)
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.get(
    "/risk-matrix-data", 
    response_model=RiskMatrixDataResponse,
    summary="Get risk matrix data for dashboard visualization",
    description="Returns frequency classifications, impact classifications, and heatmap matrix data for dashboard visualization"
)
async def get_risk_matrix_data(
    tahun: int = Query(..., description="Year"),
    template_id: str = Query(..., description="Template ID"),
    id_instansi: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve risk matrix data for dashboard visualization
    
    Args:
        tahun: The year for which risk matrix data is requested
        template_id: The ID of the risk template to use
        id_instansi: Optional institution ID for filtering
        current_user: The authenticated user
        
    Returns:
        RiskMatrixDataResponse: Object containing frequency classifications, impact classifications,
                              and heatmap matrix data
    """
    try:
        db = await Database.get_db()
        
        # Verify template exists
        template = await db.peta_risiko_template.find_one(
            {"_id": ObjectId(template_id), "tahun": tahun}
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with ID {template_id} for year {tahun} not found"
            )
        
        # Get frequency classifications
        klasifikasi_frekuensi = []
        async for kf in db.peta_risiko_klasifikasi.find(
            {"template_id": template_id, "jenis": "FREKUENSI"}
        ).sort("key", 1):
            klasifikasi_frekuensi.append(kf)
        
        # Get impact classifications
        klasifikasi_dampak = []
        async for kd in db.peta_risiko_klasifikasi.find(
            {"template_id": template_id, "jenis": "DAMPAK"}
        ).sort("key", 1):
            klasifikasi_dampak.append(kd)
        
        # Get frequency categories
        kategori_frekuensi = []
        async for kf in db.peta_risiko_kategori.find(
            {"template_id": template_id, "jenis": "FREKUENSI"}
        ).sort("key", 1):
            kategori_frekuensi.append(kf)

        # Get impact categories
        kategori_dampak = []
        async for kd in db.peta_risiko_kategori.find(
            {"template_id": template_id, "jenis": "DAMPAK"}
        ).sort("key", 1):
            kategori_dampak.append(kd)
        
        # Get heatmap matrix data
        matriks_heatmap = []
        async for mh in db.peta_risiko_matriks_heatmap.find(
            {"template_id": template_id}
        ):
            matriks_heatmap.append(mh)
        
        # Get frequency matrix data
        meta_frekuensi = []
        async for mf in db.peta_risiko_matriks.find(
            {"template_id": template_id, "jenis": "FREKUENSI"}
        ):
            meta_frekuensi.append(mf)
        
        # Get impact matrix data
        meta_dampak = []
        async for md in db.peta_risiko_matriks.find(
            {"template_id": template_id, "jenis": "DAMPAK"}
        ):
            meta_dampak.append(md)
        
        # Get inherit/residual/treated/actual risk data.
        # If dedicated heatmap collections are empty, fall back to a single aggregation
        # per risk type instead of 25 individual count_documents calls.
        meta_inherit = [mi async for mi in db.peta_risiko_heatmap_inherit.find({"template_id": template_id})]
        if not meta_inherit:
            inherit_counts: Dict[tuple, int] = {}
            async for doc in db.analisis_risiko.aggregate([
                {"$match": {"tahun": tahun}},
                {"$group": {"_id": {"f": "$skor_kemungkinan_inherit", "d": "$skor_dampak_inherit"}, "count": {"$sum": 1}}}
            ]):
                inherit_counts[(doc["_id"]["f"], doc["_id"]["d"])] = doc["count"]
            for cell in matriks_heatmap:
                cell_copy = cell.copy()
                cell_copy["value_skor"] = inherit_counts.get((cell_copy.get("frekuensi", 0), cell_copy.get("dampak", 0)), 0)
                meta_inherit.append(cell_copy)

        meta_residual = [mr async for mr in db.peta_risiko_heatmap_residual.find({"template_id": template_id})]
        if not meta_residual:
            residual_counts: Dict[tuple, int] = {}
            async for doc in db.analisis_risiko.aggregate([
                {"$match": {"tahun": tahun}},
                {"$group": {"_id": {"f": "$skor_kemungkinan_residual", "d": "$skor_dampak_residual"}, "count": {"$sum": 1}}}
            ]):
                residual_counts[(doc["_id"]["f"], doc["_id"]["d"])] = doc["count"]
            for cell in matriks_heatmap:
                cell_copy = cell.copy()
                cell_copy["value_skor"] = residual_counts.get((cell_copy.get("frekuensi", 0), cell_copy.get("dampak", 0)), 0)
                meta_residual.append(cell_copy)

        meta_treated = [mt async for mt in db.peta_risiko_heatmap_treated.find({"template_id": template_id})]
        if not meta_treated:
            treated_counts: Dict[tuple, int] = {}
            async for doc in db.analisis_risiko.aggregate([
                {"$match": {"tahun": tahun}},
                {"$group": {"_id": {"f": "$skor_kemungkinan_treated", "d": "$skor_dampak_treated"}, "count": {"$sum": 1}}}
            ]):
                treated_counts[(doc["_id"]["f"], doc["_id"]["d"])] = doc["count"]
            for cell in matriks_heatmap:
                cell_copy = cell.copy()
                cell_copy["value_skor"] = treated_counts.get((cell_copy.get("frekuensi", 0), cell_copy.get("dampak", 0)), 0)
                meta_treated.append(cell_copy)

        meta_actual = [ma async for ma in db.peta_risiko_heatmap_actual.find({"template_id": template_id})]
        if not meta_actual:
            actual_counts: Dict[tuple, int] = {}
            async for doc in db.analisis_risiko.aggregate([
                {"$match": {"tahun": tahun}},
                {"$group": {"_id": {"f": "$skor_kemungkinan_actual", "d": "$skor_dampak_actual"}, "count": {"$sum": 1}}}
            ]):
                actual_counts[(doc["_id"]["f"], doc["_id"]["d"])] = doc["count"]
            for cell in matriks_heatmap:
                cell_copy = cell.copy()
                cell_copy["value_skor"] = actual_counts.get((cell_copy.get("frekuensi", 0), cell_copy.get("dampak", 0)), 0)
                meta_actual.append(cell_copy)
        
        # Create template info 
        # Handle selera_risiko which can be a dict or an int
        selera_risiko_value = 0
        if "selera_risiko" in template:
            if isinstance(template["selera_risiko"], dict) and "current" in template["selera_risiko"]:
                selera_risiko_value = template["selera_risiko"]["current"]
            elif isinstance(template["selera_risiko"], int):
                selera_risiko_value = template["selera_risiko"]
        
        template_info = TemplateInfo(
            id=str(template["_id"]),
            kode=template.get("kode", ""),
            nama=template.get("nama", ""),
            frekuensi=template.get("frekuensi", 0),
            dampak=template.get("dampak", 0),
            tahun=template.get("tahun", tahun),
            selera_risiko=selera_risiko_value
        )
        
        # Prepare response
        response = RiskMatrixDataResponse(
            klasifikasi_frekuensi=[
                PetaRisikoKlasifikasiResponse(
                    id=str(kf["_id"]),
                    template_id=kf.get("template_id", ""),
                    key=kf.get("key", 0),
                    value=kf.get("value", ""),
                    jenis=kf.get("jenis", "FREKUENSI"),
                    created_at=kf.get("created_at", datetime.now()),
                    updated_at=kf.get("updated_at")
                ) for kf in klasifikasi_frekuensi
            ],
            klasifikasi_dampak=[
                PetaRisikoKlasifikasiResponse(
                    id=str(kd["_id"]),
                    template_id=kd.get("template_id", ""),
                    key=kd.get("key", 0),
                    value=kd.get("value", ""),
                    jenis=kd.get("jenis", "DAMPAK"),
                    created_at=kd.get("created_at", datetime.now()),
                    updated_at=kd.get("updated_at")
                ) for kd in klasifikasi_dampak
            ],
            kategori_frekuensi=[
                PetaRisikoKategoriResponse(
                    id=str(kf["_id"]),
                    template_id=kf.get("template_id", ""),
                    key=kf.get("key", 0),
                    value=kf.get("value", ""),
                    jenis=kf.get("jenis", "FREKUENSI"),
                    created_at=kf.get("created_at", datetime.now()),
                    updated_at=kf.get("updated_at")
                ) for kf in kategori_frekuensi
            ],
            kategori_dampak=[
                PetaRisikoKategoriResponse(
                    id=str(kd["_id"]),
                    template_id=kd.get("template_id", ""),
                    key=kd.get("key", 0),
                    value=kd.get("value", ""),
                    jenis=kd.get("jenis", "DAMPAK"),
                    created_at=kd.get("created_at", datetime.now()),
                    updated_at=kd.get("updated_at")
                ) for kd in kategori_dampak
            ],
            meta_frekuensi=[
                PetaRisikoMatriksResponse(
                    id=str(mf["_id"]),
                    template_id=mf.get("template_id", ""),
                    kategori=mf.get("kategori", 0),
                    klasifikasi=mf.get("klasifikasi", 0),
                    value=mf.get("value", ""),
                    jenis=mf.get("jenis", "FREKUENSI"),
                    created_at=mf.get("created_at", datetime.now()),
                    updated_at=mf.get("updated_at")
                ) for mf in meta_frekuensi
            ],
            meta_dampak=[
                PetaRisikoMatriksResponse(
                    id=str(md["_id"]),
                    template_id=md.get("template_id", ""),
                    kategori=md.get("kategori", 0),
                    klasifikasi=md.get("klasifikasi", 0),
                    value=md.get("value", ""),
                    jenis=md.get("jenis", "DAMPAK"),
                    created_at=md.get("created_at", datetime.now()),
                    updated_at=md.get("updated_at")
                ) for md in meta_dampak
            ],
            matriks_heatmap=[
                PetaRisikoMatriksHeatmapResponse(
                    id=str(mh["_id"]),
                    template_id=mh.get("template_id", ""),
                    dampak=mh.get("dampak", 0),
                    frekuensi=mh.get("frekuensi", 0),
                    value=str(mh.get("value", "")),
                    kode_warna=mh.get("kode_warna", "#FFFFFF"),
                    value_skor=mh.get("value_skor", 0),
                    memenuhi=mh.get("memenuhi", False),
                    risks=mh.get("risks", []),
                    created_at=mh.get("created_at", datetime.now()),
                    updated_at=mh.get("updated_at")
                ) for mh in matriks_heatmap
            ],
            meta_inherit=[
                PetaRisikoMatriksHeatmapResponse(
                    id=str(mi["_id"]) if "_id" in mi else str(ObjectId()),
                    template_id=mi.get("template_id", ""),
                    dampak=mi.get("dampak", 0),
                    frekuensi=mi.get("frekuensi", 0),
                    value=str(mi.get("value", "")),
                    kode_warna=mi.get("kode_warna", "#FFFFFF"),
                    value_skor=mi.get("value_skor", 0),
                    memenuhi=mi.get("memenuhi", False),
                    risks=mi.get("risks", []),
                    created_at=mi.get("created_at", datetime.now()),
                    updated_at=mi.get("updated_at")
                ) for mi in meta_inherit
            ],
            meta_residual=[
                PetaRisikoMatriksHeatmapResponse(
                    id=str(mr["_id"]) if "_id" in mr else str(ObjectId()),
                    template_id=mr.get("template_id", ""),
                    dampak=mr.get("dampak", 0),
                    frekuensi=mr.get("frekuensi", 0),
                    value=str(mr.get("value", "")),
                    kode_warna=mr.get("kode_warna", "#FFFFFF"),
                    value_skor=mr.get("value_skor", 0),
                    memenuhi=mr.get("memenuhi", False),
                    risks=mr.get("risks", []),
                    created_at=mr.get("created_at", datetime.now()),
                    updated_at=mr.get("updated_at")
                ) for mr in meta_residual
            ],
            meta_treated=[
                PetaRisikoMatriksHeatmapResponse(
                    id=str(mt["_id"]) if "_id" in mt else str(ObjectId()),
                    template_id=mt.get("template_id", ""),
                    dampak=mt.get("dampak", 0),
                    frekuensi=mt.get("frekuensi", 0),
                    value=str(mt.get("value", "")),
                    kode_warna=mt.get("kode_warna", "#FFFFFF"),
                    value_skor=mt.get("value_skor", 0),
                    memenuhi=mt.get("memenuhi", False),
                    risks=mt.get("risks", []),
                    created_at=mt.get("created_at", datetime.now()),
                    updated_at=mt.get("updated_at")
                ) for mt in meta_treated
            ],
            meta_actual=[
                PetaRisikoMatriksHeatmapResponse(
                    id=str(ma["_id"]) if "_id" in ma else str(ObjectId()),
                    template_id=ma.get("template_id", ""),
                    dampak=ma.get("dampak", 0),
                    frekuensi=ma.get("frekuensi", 0),
                    value=str(ma.get("value", "")),
                    kode_warna=ma.get("kode_warna", "#FFFFFF"),
                    value_skor=ma.get("value_skor", 0),
                    memenuhi=ma.get("memenuhi", False),
                    risks=ma.get("risks", []),
                    created_at=ma.get("created_at", datetime.now()),
                    updated_at=ma.get("updated_at")
                ) for ma in meta_actual
            ],
            template_info=template_info
        )
        
        return response
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving risk matrix data: {str(e)}"
        )

@router.get(
    "/risk-stats",
    response_model=Dict[str, Any],
    summary="Get risk statistics for dashboard",
    description="Returns statistics about risks, control effectiveness, and RTP implementation"
)
async def get_risk_stats(
    tahun: int = Query(..., description="Year"),
    id_instansi: str = Query(..., description="Institution ID"),
    id_induk_unit_kerja: str = Query(..., description="Parent Work Unit ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve risk statistics for dashboard visualization
    
    Args:
        tahun: The year for which risk statistics are requested
        id_instansi: Institution ID for filtering
        id_induk_unit_kerja: Parent Work Unit ID for filtering
        current_user: The authenticated user
        
    Returns:
        Dict with risk statistics including:
        - total_risiko: Total number of risks
        - risiko_dibawah_selera: Number of risks below risk appetite
        - persentase_dibawah_selera: Percentage of risks below risk appetite
        - total_pengendalian: Total number of controls
        - pengendalian_efektif: Number of effective controls
        - persentase_pengendalian_efektif: Percentage of effective controls
        - total_rtp: Total number of RTPs
        - rtp_terlaksana: Number of implemented RTPs
        - persentase_rtp_terlaksana: Percentage of implemented RTPs
    """
    try:
        # Initialize response with default values
        response = {
            "total_risiko": 0,
            "risiko_dibawah_selera": 0,
            "persentase_dibawah_selera": 0,
            "total_pengendalian": 0,
            "pengendalian_efektif": 0,
            "persentase_pengendalian_efektif": 0,
            "total_rtp": 0,
            "rtp_terlaksana": 0,
            "persentase_rtp_terlaksana": 0
        }
        
        db = await Database.get_db()
        
        # Get template for risk appetite
        template = None
        selera_risiko = 0
        
        async for t in db.peta_risiko_template.find({
            "tahun": tahun,
            "id_induk_unit_kerja": id_induk_unit_kerja
        }):
            template = t
            break
        
        # Get selera_risiko value if template exists
        if template and "selera_risiko" in template:
            if isinstance(template["selera_risiko"], dict) and "current" in template["selera_risiko"]:
                selera_risiko = template["selera_risiko"]["current"]
            elif isinstance(template["selera_risiko"], int):
                selera_risiko = template["selera_risiko"]
        
        # If no template found for the specific unit, try to get from struktur_organisasi
        if not selera_risiko:
            struktur = await db.struktur_organisasi.find_one({
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "id_instansi": id_instansi
            })
            if struktur and "selera_risiko" in struktur:
                selera_risiko = struktur["selera_risiko"]

        print(f"Using selera_risiko: {selera_risiko}")
        
        # Begin with risk identification collection first
        identifikasi_list = []
        async for identifikasi in db.identifikasi_risiko.find({
            "tahun": tahun,
            "id_instansi": id_instansi,
            "id_induk_unit_kerja": id_induk_unit_kerja,
            "disabled": {"$ne": True}  # Only count active risks
        }):
            identifikasi_list.append({
                "id": str(identifikasi["_id"]),
                "pernyataan_risiko": identifikasi.get("pernyataan_risiko", "")
            })
        
        total_risiko = len(identifikasi_list)
        response["total_risiko"] = total_risiko
        
        print(f"Found {total_risiko} risk identifications")
        
        # If no risks found, just return the response with zeros
        if total_risiko == 0:
            return response
        
        # Store risks that are below appetite and all analysis IDs
        risks_below_appetite = set()
        all_analysis_ids = []

        # Fetch all analyses in one query instead of N+1 individual find_one calls
        identifikasi_ids = [i["id"] for i in identifikasi_list]
        analyses_map: Dict[str, Any] = {}
        async for analisis in db.analisis_risiko.find({
            "identifikasi_risiko_id": {"$in": identifikasi_ids},
            "tahun": tahun
        }):
            analyses_map[analisis["identifikasi_risiko_id"]] = analisis

        for identifikasi in identifikasi_list:
            analisis = analyses_map.get(identifikasi["id"])
            if analisis:
                analisis_id = str(analisis["_id"])
                all_analysis_ids.append(analisis_id)

                use_risk = analisis.get("use_risk", "I").upper()
                level_risiko = 0

                if use_risk == "A" and analisis.get("level_risiko_actual", 0) > 0:
                    level_risiko = analisis.get("level_risiko_actual", 0)
                elif use_risk == "T" and analisis.get("level_risiko_treated", 0) > 0:
                    level_risiko = analisis.get("level_risiko_treated", 0)
                elif use_risk == "R" and analisis.get("level_risiko_residual", 0) > 0:
                    level_risiko = analisis.get("level_risiko_residual", 0)
                else:
                    level_risiko = analisis.get("level_risiko_inherit", 0)

                if level_risiko > 0 and level_risiko <= selera_risiko:
                    risks_below_appetite.add(analisis_id)
        
        # Calculate risks below appetite
        risiko_dibawah_selera = len(risks_below_appetite)
        response["risiko_dibawah_selera"] = risiko_dibawah_selera
        
        print(f"Found {risiko_dibawah_selera} risks below appetite, analysis IDs: {list(risks_below_appetite)}")
        
        # Calculate percentage
        persentase_dibawah_selera = 0
        if total_risiko > 0:
            persentase_dibawah_selera = round((risiko_dibawah_selera / total_risiko) * 100)
        response["persentase_dibawah_selera"] = persentase_dibawah_selera
        
        # Get count of controls from the attachments collection
        try:
            # These are attachments with type starting with "PENGENDALIAN_"
            pengendalian_list = await db.attachments.find({
                "type": {"$regex": "^PENGENDALIAN_"},
                "ref_id": {"$in": all_analysis_ids},
                "tahun": tahun
            }).to_list(None)
            
            total_pengendalian = len(pengendalian_list)
            response["total_pengendalian"] = total_pengendalian
            
            # Count effective controls (those associated with risks below appetite)
            pengendalian_efektif = 0
            for pengendalian in pengendalian_list:
                if pengendalian["ref_id"] in risks_below_appetite:
                    pengendalian_efektif += 1
            
            response["pengendalian_efektif"] = pengendalian_efektif
            
            # Calculate percentage
            persentase_pengendalian_efektif = 0
            if total_pengendalian > 0:
                persentase_pengendalian_efektif = round((pengendalian_efektif / total_pengendalian) * 100)
            
            response["persentase_pengendalian_efektif"] = persentase_pengendalian_efektif
        except Exception as e:
            print(f"Error calculating control effectiveness: {str(e)}")
        
        # Get RTP data
        try:
            # Get total RTP
            pipeline_rtp = [
                {
                    "$lookup": {
                        "from": "evaluasi_risiko",
                        "let": {"id_evaluasi": "$evaluasi_risiko_id"},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {"$eq": ["$_id", {"$toObjectId": "$$id_evaluasi"}]}
                                }
                            },
                            {
                                "$lookup": {
                                    "from": "identifikasi_risiko",
                                    "let": {"id_identifikasi": "$identifikasi_risiko_id"},
                                    "pipeline": [
                                        {
                                            "$match": {
                                                "$expr": {
                                                    "$and": [
                                                        {"$eq": ["$_id", {"$toObjectId": "$$id_identifikasi"}]},
                                                        {"$eq": ["$tahun", tahun]},
                                                        {"$eq": ["$id_instansi", id_instansi]},
                                                        {"$eq": ["$id_induk_unit_kerja", id_induk_unit_kerja]},
                                                        {"$ne": ["$disabled", True]}  # Only count active risks
                                                    ]
                                                }
                                            }
                                        }
                                    ],
                                    "as": "identifikasi"
                                }
                            },
                            {
                                "$match": {
                                    "identifikasi": {"$ne": []}
                                }
                            }
                        ],
                        "as": "evaluasi"
                    }
                },
                {
                    "$match": {
                        "evaluasi": {"$ne": []}
                    }
                },
                {
                    "$count": "total"
                }
            ]
            
            total_rtp_result = await db.rtp.aggregate(pipeline_rtp).to_list(1)
            total_rtp = total_rtp_result[0]["total"] if total_rtp_result else 0
            response["total_rtp"] = total_rtp
            
            # Get implemented RTP (with tanggal_realisasi not null)
            pipeline_terlaksana = [
                {
                    "$match": {
                        "tanggal_realisasi": {"$ne": None}
                    }
                },
                {
                    "$lookup": {
                        "from": "evaluasi_risiko",
                        "let": {"id_evaluasi": "$evaluasi_risiko_id"},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {"$eq": ["$_id", {"$toObjectId": "$$id_evaluasi"}]}
                                }
                            },
                            {
                                "$lookup": {
                                    "from": "identifikasi_risiko",
                                    "let": {"id_identifikasi": "$identifikasi_risiko_id"},
                                    "pipeline": [
                                        {
                                            "$match": {
                                                "$expr": {
                                                    "$and": [
                                                        {"$eq": ["$_id", {"$toObjectId": "$$id_identifikasi"}]},
                                                        {"$eq": ["$tahun", tahun]},
                                                        {"$eq": ["$id_instansi", id_instansi]},
                                                        {"$eq": ["$id_induk_unit_kerja", id_induk_unit_kerja]},
                                                        {"$ne": ["$disabled", True]}  # Only count active risks
                                                    ]
                                                }
                                            }
                                        }
                                    ],
                                    "as": "identifikasi"
                                }
                            },
                            {
                                "$match": {
                                    "identifikasi": {"$ne": []}
                                }
                            }
                        ],
                        "as": "evaluasi"
                    }
                },
                {
                    "$match": {
                        "evaluasi": {"$ne": []}
                    }
                },
                {
                    "$count": "total"
                }
            ]
            
            terlaksana_result = await db.rtp.aggregate(pipeline_terlaksana).to_list(1)
            rtp_terlaksana = terlaksana_result[0]["total"] if terlaksana_result else 0
            response["rtp_terlaksana"] = rtp_terlaksana
            
            # Calculate percentage
            persentase_rtp_terlaksana = 0
            if total_rtp > 0:
                persentase_rtp_terlaksana = round((rtp_terlaksana / total_rtp) * 100)
            
            response["persentase_rtp_terlaksana"] = persentase_rtp_terlaksana
        except Exception as e:
            print(f"Error calculating RTP stats: {str(e)}")
        
        return response
        
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Error retrieving risk statistics: {str(e)}")
        print(traceback_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving risk statistics: {str(e)}"
        )

@router.get("/years", response_model=List[int])
async def get_available_years(
    id_instansi: str = Query(..., description="Institution ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of years with risk data for the institution.
    
    This endpoint searches across multiple collections (analisis_risiko, identifikasi_risiko, 
    evaluasi_risiko, rtp, peta_risiko_template) to find all years that contain risk data 
    for the specified institution.
    
    Returns:
        A sorted list of available years (newest first)
    """
    db = await Database.get_db()
    
    # Set to store unique years
    all_years = set()
    
    # Aggregate from identifikasi_risiko
    pipeline_identifikasi = [
        {"$match": {"id_instansi": id_instansi}},
        {"$group": {"_id": "$tahun"}},
        {"$sort": {"_id": -1}}
    ]
    
    async for doc in db.identifikasi_risiko.aggregate(pipeline_identifikasi):
        all_years.add(doc["_id"])
    
    # Aggregate from analisis_risiko
    pipeline_analisis = [
        {"$match": {"id_instansi": id_instansi}},
        {"$group": {"_id": "$tahun"}},
        {"$sort": {"_id": -1}}
    ]
    
    async for doc in db.analisis_risiko.aggregate(pipeline_analisis):
        all_years.add(doc["_id"])
    
    # Aggregate from peta_risiko_template
    pipeline_template = [
        {"$match": {"klp_id": {"$in": await get_all_klp_ids(db, id_instansi)}}},
        {"$group": {"_id": "$tahun"}},
        {"$sort": {"_id": -1}}
    ]
    
    async for doc in db.peta_risiko_template.aggregate(pipeline_template):
        all_years.add(doc["_id"])
    
    # Convert to sorted list (newest first)
    result = sorted(list(all_years), reverse=True)
    
    return result

async def get_all_klp_ids(db, id_instansi):
    """Helper function to get all KLP IDs for an institution"""
    klp_ids = []
    async for klp in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
        klp_ids.append(str(klp["_id"]))
    return klp_ids 