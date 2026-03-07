from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.schemas.risk import (
    PetaRisikoKlasifikasiResponse,
    PetaRisikoMatriksHeatmapResponse,
    PetaRisikoMatriksResponse,
    PetaRisikoKategoriResponse
)

class TemplateInfo(BaseModel):
    """Basic template information for dashboard displays"""
    id: str
    kode: str
    nama: str
    frekuensi: int
    dampak: int
    tahun: int
    selera_risiko: int

class RiskMatrixDataResponse(BaseModel):
    """Combined response model for dashboard risk matrix data"""
    kategori_frekuensi: List[PetaRisikoKategoriResponse] = []
    kategori_dampak: List[PetaRisikoKategoriResponse] = []
    klasifikasi_frekuensi: List[PetaRisikoKlasifikasiResponse] = []
    klasifikasi_dampak: List[PetaRisikoKlasifikasiResponse] = []
    meta_frekuensi: List[PetaRisikoMatriksResponse] = []
    meta_dampak: List[PetaRisikoMatriksResponse] = []
    matriks_heatmap: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_inherit: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_residual: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_treated: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_actual: List[PetaRisikoMatriksHeatmapResponse] = []
    template_info: TemplateInfo 