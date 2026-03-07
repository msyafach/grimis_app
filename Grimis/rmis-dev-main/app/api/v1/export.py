from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from app.database import Database
from app.utils.auth import get_current_user
from app.utils.pdf import generate_pdf_from_template
from bson import ObjectId

router = APIRouter()

@router.get("/pdf/register-risiko", response_class=Response)
async def export_register_risiko_pdf(
    id_instansi: str = Query(..., description="ID Instansi yang akan diekspor"),
    tahun_id: str = Query(..., description="ID Tahun Periode"),
    id_induk_unit_kerja: str = Query(..., description="ID Induk Unit Kerja"),
    current_user: dict = Depends(get_current_user)
):
    """
    Ekspor tabel Register Risiko menjadi dokumen PDF.
    Menggunakan konfigurasi Kop Surat dari entitas Instansi.
    """
    db = await Database.get_db()
    
    # Ambil Data Instansi untuk Kop Surat
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    induk_unit_kerja = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
    tahun = await db.tahun.find_one({"_id": ObjectId(tahun_id)})
    
    if not induk_unit_kerja or not tahun:
        raise HTTPException(status_code=404, detail="Unit Kerja or Tahun not found")

    # Pipeline agregasi yang mirip dengan /identifikasi-risiko
    pipeline = [
        {
            "$match": {
                "id_instansi": id_instansi,
                "id_induk_unit_kerja": id_induk_unit_kerja,
                "tahun_id": tahun_id,
            }
        },
        {
            "$lookup": {
                "from": "sasaran",
                "let": {"sasaran_id": {"$toObjectId": "$id_sasaran"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$sasaran_id"]}}}],
                "as": "sasaran"
            }
        },
        {"$unwind": {"path": "$sasaran", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "indikator_sasaran",
                "let": {"indikator_id": {"$toObjectId": "$id_indikator_sasaran"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$indikator_id"]}}}],
                "as": "indikator"
            }
        },
        {"$unwind": {"path": "$indikator", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "kamus_risiko",
                "let": {"kamus_id": {"$toObjectId": "$id_kamus_risiko"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$kamus_id"]}}}],
                "as": "kamus"
            }
        },
        {"$unwind": {"path": "$kamus", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "analisis_risiko",
                "let": {"ident_id": {"$toString": "$_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$id_identifikasi_risiko", "$$ident_id"]}}}],
                "as": "analisis"
            }
        },
        {"$unwind": {"path": "$analisis", "preserveNullAndEmptyArrays": True}}
    ]

    cursor = db.identifikasi_risiko.aggregate(pipeline)
    risks = []
    async for doc in cursor:
        analisis = doc.get("analisis", {})
        skor_inherent = analisis.get("skor_inherent", {})
        
        # Helper string fallback
        risk_data = {
            "sasaran": doc.get("sasaran", {}),
            "indikator": doc.get("indikator", {}),
            "kamus": doc.get("kamus", {}),
            "penyebab_risiko": doc.get("penyebab_risiko", []),
            "dampak_risiko": doc.get("dampak_risiko", []),
            "skor_inherent": {
                "kemungkinan": skor_inherent.get("kemungkinan", {}).get("nilai", "-"),
                "dampak": skor_inherent.get("dampak", {}).get("nilai", "-"),
                "besaran": skor_inherent.get("raw_score", "-"),
                "label": skor_inherent.get("label", "-"),
                "warna": skor_inherent.get("color", "#999999")
            }
        }
        risks.append(risk_data)
        
    # Susun konteks untuk Jinja2
    context = {
        "title": f"DOKUMEN REGISTER RISIKO \n {induk_unit_kerja.get('nama_induk_unit', '')} - TAHUN {tahun.get('tahun', '')}",
        "instansi": instansi,
        "data": risks
    }
    
    pdf_bytes = generate_pdf_from_template("register_risiko.html", context)
    
    headers = {
        'Content-Disposition': f'attachment; filename="Register_Risiko_{tahun.get("tahun")}.pdf"'
    }
    
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

@router.get("/pdf/laporan-kejadian/{laporan_id}", response_class=Response)
async def export_laporan_kejadian_pdf(
    laporan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Ekspor dokumen Laporan Kejadian menjadi PDF.
    Menggunakan konfigurasi Kop Surat dari entitas Instansi pelapor.
    """
    db = await Database.get_db()
    
    # Ambil Data Laporan Kejadian
    laporan = await db.laporan_kejadian.find_one({"_id": ObjectId(laporan_id)})
    if not laporan:
        raise HTTPException(status_code=404, detail="Incident Report not found")
        
    # Ambil Data Instansi untuk Kop Surat
    id_instansi = laporan.get("id_instansi")
    if not id_instansi:
        raise HTTPException(status_code=400, detail="Report does not have institution reference")
        
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    if not instansi:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Susun konteks untuk Jinja2
    context = {
        "title": "LAPORAN KEJADIAN RISIKO",
        "instansi": instansi,
        "laporan": laporan
    }
    
    pdf_bytes = generate_pdf_from_template("laporan_kejadian.html", context)
    
    safe_filename = laporan.get("nama_kejadian", "Laporan_Kejadian").replace(" ", "_")
    
    headers = {
        'Content-Disposition': f'attachment; filename="{safe_filename}.pdf"'
    }
    
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
