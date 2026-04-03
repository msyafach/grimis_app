from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, EmailStr, Field, validator

# === ENUMS - Must be defined before any classes that reference them ===


# Approval Status enum
class ApprovalStatus(str, Enum):
    MENUNGGU_VERIFIKASI = "MENUNGGU_VERIFIKASI"  # Menunggu Proses Verifikasi (Admin belum melakukan verifikasi)
    GAGAL_VERIFIKASI = (
        "GAGAL_VERIFIKASI"  # Gagal Verifikasi (Admin menolak pengajuan usulan risiko)
    )
    TERVERIFIKASI = (
        "TERVERIFIKASI"  # Terverifikasi (Admin menerima usulan kamus yang diajukan)
    )
    DISETUJUI_DENGAN_PENYESUAIAN = (
        "DISETUJUI_DENGAN_PENYESUAIAN"  # Disetujui dengan penyesuaian
    )
    APPROVED = "APPROVED"


class MonitoringStatus(str, Enum):
    PENDING = "PENDING"  # 0 in PHP
    VERIFIED = "VERIFIED"  # 1 in PHP
    REJECTED = "REJECTED"  # 2 in PHP


class RTPResponRisiko(str, Enum):
    REDUCE_IMPACT = "REDUCE_IMPACT"  # 1 in PHP
    REDUCE_FREQUENCY = "REDUCE_FREQUENCY"  # 2 in PHP


class AttachmentType(str, Enum):
    PENGENDALIAN_FISIK = "PENGENDALIAN_FISIK"
    PENGENDALIAN_DOKUMEN = "PENGENDALIAN_DOKUMEN"
    PENGENDALIAN_APLIKASI = "PENGENDALIAN_APLIKASI"
    PENGENDALIAN = "PENGENDALIAN"  # Add generic PENGENDALIAN for backward compatibility
    RTP = "RTP"


class KomentarType(str, Enum):
    IDENTIFIKASI = "IDENTIFIKASI"
    ANALISIS = "ANALISIS"
    EVALUASI = "EVALUASI"
    RTP = "RTP"
    MONITORING = "MONITORING"


# Jenis Konteks enum (masih digunakan di organization.py)
class JenisKonteks(str, Enum):
    SASARAN = "SASARAN"
    PROBIS = "PROBIS"


# Jenis Peta Risiko enum
class JenisPetaRisiko(str, Enum):
    FREKUENSI = "FREKUENSI"
    DAMPAK = "DAMPAK"


# Jenis Konteks schemas
class JenisKonteksBase(BaseModel):
    kode: str
    nama: str
    jenis: JenisKonteks


class JenisKonteksCreate(JenisKonteksBase):
    id_instansi: str
    id_induk_unit_kerja: str


class JenisKonteksUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    jenis: Optional[JenisKonteks] = None


class JenisKonteksResponse(JenisKonteksBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_klp: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Kategori Risiko schemas
class KategoriRisikoBase(BaseModel):
    kode: str
    nama: str


class KategoriRisikoCreate(KategoriRisikoBase):
    id_instansi: str
    id_induk_unit_kerja: str


class KategoriRisikoUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    id_instansi: Optional[str] = None
    id_induk_unit_kerja: Optional[str] = None
    nama_klp: Optional[str] = None
    updated_at: Optional[datetime] = None


class KategoriRisikoResponse(KategoriRisikoBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_klp: str  # Nama dari induk unit kerja
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Jenis Penyebab schemas
class JenisPenyebabBase(BaseModel):
    kode: str
    nama: str


class JenisPenyebabCreate(JenisPenyebabBase):
    id_instansi: str
    id_induk_unit_kerja: str


class JenisPenyebabUpdate(BaseModel):
    nama: Optional[str] = None


class JenisPenyebabResponse(JenisPenyebabBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_klp: str  # Nama dari induk unit kerja
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Konteks schemas
class KonteksBase(BaseModel):
    kode: str
    nama: str
    id_jenis_konteks: str


class KonteksCreate(BaseModel):
    kode: str
    nama: str
    id_jenis_konteks: str  # ID dari jenis_konteks di struktur_organisasi
    id_instansi: str
    id_induk_unit_kerja: str
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI


class KonteksUpdate(BaseModel):
    nama: Optional[str] = None
    id_jenis_konteks: Optional[str] = None
    is_disabled: Optional[bool] = None


class KonteksResponse(BaseModel):
    id: str
    kode: str
    nama: str
    id_jenis_konteks: str
    id_instansi: str
    jenis_konteks: str  # SASARAN/PROBIS
    nama_jenis_konteks: str
    nama_klp: str
    total_indikator: int = 0
    is_disabled: bool = False
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Indikator schemas
class IndikatorBase(BaseModel):
    kode: str
    nama: str


class IndikatorCreate(IndikatorBase):
    id_konteks: str
    id_instansi: str
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI


class IndikatorUpdate(BaseModel):
    nama: Optional[str] = None


class IndikatorResponse(IndikatorBase):
    id: str
    id_konteks: str
    nama_konteks: str
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Kamus Risiko schemas
class KamusRisikoBase(BaseModel):
    kode: str
    nama: str
    id_kategori_risiko: str


class KamusRisikoCreate(KamusRisikoBase):
    id_instansi: str
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI


class KamusRisikoUpdate(BaseModel):
    nama: Optional[str] = None
    id_kategori_risiko: Optional[str] = None
    status_approval: Optional[str] = None  # For approval action


class KamusRisikoResponse(KamusRisikoBase):
    id: str
    id_instansi: str
    nama_klp: str
    nama_kategori: str
    status_approval: Optional[ApprovalStatus] = ApprovalStatus.MENUNGGU_VERIFIKASI
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Bagan Risiko schemas
class BaganRisikoBase(BaseModel):
    kode: str
    nama: str
    deskripsi: Optional[str] = None
    tahun: int


class BaganRisikoCreate(BaganRisikoBase):
    id_instansi: str
    id_induk_unit_kerja: str


class BaganRisikoUpdate(BaseModel):
    nama: Optional[str] = None
    deskripsi: Optional[str] = None
    tahun: Optional[int] = None


class BaganRisikoResponse(BaganRisikoBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_klp: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Metode SPIP schemas
class MetodeSpipBase(BaseModel):
    kode: str
    nama: str
    deskripsi: Optional[str] = None
    tahun: int


class MetodeSpipCreate(MetodeSpipBase):
    id_instansi: str
    id_induk_unit_kerja: str


class MetodeSpipUpdate(BaseModel):
    nama: Optional[str] = None
    deskripsi: Optional[str] = None


class MetodeSpipResponse(MetodeSpipBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_klp: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Comment schemas
class CommentBase(BaseModel):
    text: str
    id_identifikasi_risiko: str


class CommentCreate(CommentBase):
    pass


class CommentUpdate(BaseModel):
    text: Optional[str] = None


class CommentResponse(CommentBase):
    id: str
    user_id: str
    nama_user: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Komentar schemas (new version)
class KomentarBase(BaseModel):
    text: str
    type: KomentarType
    ref_id: str


class KomentarCreate(KomentarBase):
    pass


class KomentarUpdate(BaseModel):
    text: Optional[str] = None


class KomentarResponse(KomentarBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    updated_by: Optional[str] = None


# Approval schemas
class ApprovalBase(BaseModel):
    status: ApprovalStatus
    catatan: Optional[str] = None
    type: str
    data: Dict[str, Any]


class ApprovalCreate(ApprovalBase):
    id_identifikasi_risiko: str


class ApprovalUpdate(BaseModel):
    status: ApprovalStatus
    catatan: str


class ApprovalResponse(ApprovalBase):
    id: str
    id_identifikasi_risiko: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# Update IdentifikasiRisiko schemas
class IdentifikasiRisikoBase(BaseModel):
    tahun: int
    id_jenis_konteks_sasaran: str
    id_konteks_sasaran: str
    id_konteks_probis: str
    id_indikator: str
    id_bagan_risiko: Optional[str] = None
    id_kategori_risiko: str
    id_metode_spip: Optional[str] = None
    pernyataan_risiko: Optional[str] = None
    deskripsi: Optional[str] = None
    disabled: bool = False
    disabled_reason: Optional[str] = None
    uraian_dampak: Optional[str] = None


class IdentifikasiRisikoCreate(IdentifikasiRisikoBase):
    id_instansi: str
    id_induk_unit_kerja: str
    # Optional fields for AI-generated risk statements
    generation_id: Optional[str] = Field(
        None, description="ID of the risk statement generation session"
    )
    statement_id: Optional[str] = Field(
        None, description="ID of the selected risk statement"
    )


class IdentifikasiRisikoUpdate(BaseModel):
    id_jenis_konteks_sasaran: Optional[str] = None
    id_konteks_sasaran: Optional[str] = None
    id_konteks_probis: Optional[str] = None
    id_indikator: Optional[str] = None
    id_bagan_risiko: Optional[str] = None
    id_kategori_risiko: Optional[str] = None
    id_metode_spip: Optional[str] = None
    pernyataan_risiko: Optional[str] = None
    deskripsi: Optional[str] = None
    disabled: Optional[bool] = None
    disabled_reason: Optional[str] = None
    uraian_dampak: Optional[str] = None


class IdentifikasiRisikoResponse(IdentifikasiRisikoBase):
    id: str
    status_approval: ApprovalStatus
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(
        ..., description="ID of the user who created the risk identification"
    )
    created_by_name: str = Field(
        ..., description="Full name of the user who created the risk identification"
    )
    updated_at: Optional[datetime] = None
    comments: List[CommentResponse] = []
    approval: Optional[ApprovalResponse] = None
    is_enabled: bool = Field(default=True, description="Inverse of disabled field")

    class Config:
        from_attributes = True

    @validator("is_enabled", pre=True)
    def compute_is_enabled(cls, v, values):
        return not values.get("disabled", False)


# Analisis Risiko schemas
class AnalisisRisikoBase(BaseModel):
    tahun: int
    identifikasi_risiko_id: str
    kemungkinan_id_inherit: Optional[str] = None
    dampak_id_inherit: Optional[str] = None
    kemungkinan_id_residual: Optional[str] = None
    dampak_id_residual: Optional[str] = None
    skor_kemungkinan_inherit: float = 0
    skor_dampak_inherit: float = 0
    skor_kemungkinan_residual: Optional[float] = 0
    skor_dampak_residual: Optional[float] = 0
    use_risk: str = "I"  # I/R/T/A (Inherit/Residual/Treated/Actual)
    level_risiko_inherit: Optional[int] = 0
    level_risiko_residual: Optional[int] = 0
    is_akhir_tahun: bool = False
    kemungkinan_id_treated: Optional[str] = None
    dampak_id_treated: Optional[str] = None
    skor_kemungkinan_treated: Optional[float] = 0
    skor_dampak_treated: Optional[float] = 0
    level_risiko_treated: Optional[int] = 0
    # Actual risk fields for year-end processing
    kemungkinan_id_actual: Optional[str] = None
    dampak_id_actual: Optional[str] = None
    skor_kemungkinan_actual: Optional[Union[float, int]] = 0
    skor_dampak_actual: Optional[Union[float, int]] = 0
    level_risiko_actual: Optional[int] = 0


class AnalisisRisikoCreate(AnalisisRisikoBase):
    id_instansi: str
    id_induk_unit_kerja: str


class AnalisisRisikoUpdate(BaseModel):
    kemungkinan_id_inherit: Optional[str] = None
    dampak_id_inherit: Optional[str] = None
    kemungkinan_id_residual: Optional[str] = None
    dampak_id_residual: Optional[str] = None
    skor_kemungkinan_inherit: Optional[float] = None
    skor_dampak_inherit: Optional[float] = None
    skor_kemungkinan_residual: Optional[float] = None
    skor_dampak_residual: Optional[float] = None
    use_risk: Optional[str] = None
    is_akhir_tahun: Optional[bool] = None
    kemungkinan_id_treated: Optional[str] = None
    dampak_id_treated: Optional[str] = None
    skor_kemungkinan_treated: Optional[float] = None
    skor_dampak_treated: Optional[float] = None
    level_risiko_treated: Optional[int] = None
    # Actual risk fields
    kemungkinan_id_actual: Optional[str] = None
    dampak_id_actual: Optional[str] = None
    skor_kemungkinan_actual: Optional[Union[float, int]] = None
    skor_dampak_actual: Optional[Union[float, int]] = None
    level_risiko_actual: Optional[int] = None


class AnalisisRisikoResponse(AnalisisRisikoBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(
        ..., description="ID of the user who created the risk analysis"
    )
    created_by_name: str = Field(
        ..., description="Full name of the user who created the risk analysis"
    )
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    last_updated: Optional[str] = Field(
        None,
        description="Tracks which risk type was last updated (INHERIT/RESIDUAL/TREATED/ACTUAL)",
    )
    comments: List[KomentarResponse] = []
    memenuhi_inherit: Optional[bool] = None
    memenuhi_residual: Optional[bool] = None
    memenuhi_actual: Optional[bool] = None


# Kriteria Kemungkinan schemas
class KriteriaKemungkinanBase(BaseModel):
    kode: str
    nama: str
    nilai: float
    deskripsi: str
    id_instansi: str
    id_induk_unit_kerja: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class KriteriaKemungkinanCreate(KriteriaKemungkinanBase):
    pass


class KriteriaKemungkinanUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    nilai: Optional[float] = None
    deskripsi: Optional[str] = None


class KriteriaKemungkinanResponse(KriteriaKemungkinanBase):
    id: str


# Kriteria Dampak schemas
class KriteriaDampakBase(BaseModel):
    kode: str
    nama: str
    nilai: float
    deskripsi: str
    id_instansi: str
    id_induk_unit_kerja: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class KriteriaDampakCreate(KriteriaDampakBase):
    pass


class KriteriaDampakUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    nilai: Optional[float] = None
    deskripsi: Optional[str] = None


class KriteriaDampakResponse(KriteriaDampakBase):
    id: str


class AllKriteriaResponse(BaseModel):
    kemungkinan: List[KriteriaKemungkinanResponse]
    dampak: List[KriteriaDampakResponse]
    total_kemungkinan: int
    total_dampak: int


# Evaluasi Risiko schemas
class EvaluasiRisikoBase(BaseModel):
    identifikasi_risiko_id: str
    analisis_risiko_id: str
    jenis_penyebab_id: Optional[str] = None
    deskripsi: str = Field(..., description="Description of the cause or impact")
    jenis: str = Field(..., description="Type of element (penyebab/dampak)")
    pengendalian: Optional[str] = Field(None, description="Recommended control")
    jenis_pengendalian: Optional[str] = Field(
        None, description="Type of control (Mengurangi kemungkinan/Mengurangi dampak)"
    )


class EvaluasiRisikoCreate(EvaluasiRisikoBase):
    # Optional fields for AI-generated root causes
    generation_id: Optional[str] = Field(
        None, description="ID of the root cause generation session"
    )
    root_cause_id: Optional[str] = Field(
        None, description="ID of the selected root cause"
    )


class EvaluasiRisikoUpdate(BaseModel):
    deskripsi: Optional[str] = None
    jenis_penyebab_id: Optional[str] = None
    pengendalian: Optional[str] = None
    jenis_pengendalian: Optional[str] = None
    jenis: Optional[str] = Field(None, description="Type of element (penyebab/dampak)")
    # Optional fields for AI-generated root causes
    generation_id: Optional[str] = Field(
        None, description="ID of the root cause generation session"
    )
    root_cause_id: Optional[str] = Field(
        None, description="ID of the selected root cause"
    )


class EvaluasiRisikoResponse(BaseModel):
    id: str
    identifikasi_risiko_id: str
    analisis_risiko_id: str
    jenis_penyebab_id: Optional[str] = Field(None, description="Jenis penyebab ID")
    jenis: str = Field(..., description="Type of element (penyebab/dampak)")
    deskripsi: str = Field(..., description="Description of the cause or impact")
    pengendalian: Optional[str] = Field(None, description="Control description")
    jenis_pengendalian: Optional[str] = Field(
        None, description="Type of control (Mengurangi kemungkinan/Mengurangi dampak)"
    )
    komentar: Optional[List[KomentarResponse]] = Field(
        [], description="Comments on this evaluation"
    )
    rtp_count: str = Field(
        "0/0",
        description="Format: 'realized/total' - Number of RTPs that have been realized out of total RTPs",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    created_by: str = Field(..., description="User ID of creator")
    created_by_name: str = Field(..., description="Name of creator")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    updated_by: Optional[str] = Field(None, description="User ID of last updater")


# First move Attachment schemas before RTP schemas
# Attachment schemas
class AttachmentBase(BaseModel):
    type: AttachmentType
    ref_id: str
    file_name: str
    file_id: Optional[str] = None  # GridFS file ID
    content_type: Optional[str] = None  # MIME type of the file
    file_size: Optional[int] = None  # Size of the file in bytes
    encoding: Optional[str] = "base64"  # File encoding (base64 for security)
    tahun: int
    unsur_spip_id: Optional[str] = None
    deskripsi: Optional[str] = None  # Description of the attachment


class AttachmentCreate(AttachmentBase):
    pass


class AttachmentUpdate(BaseModel):
    file_name: Optional[str] = None
    file_id: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    encoding: Optional[str] = None
    unsur_spip_id: Optional[str] = None


class AttachmentResponse(AttachmentBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# RTP schemas
class RTPBase(BaseModel):
    evaluasi_risiko_id: str
    deskripsi: str
    respon_risiko: RTPResponRisiko
    rencana_aksi: str
    target_waktu: datetime
    pic: str
    indikator: str
    output: str
    anggaran: float
    tanggal_realisasi: Optional[datetime] = None
    uraian_hambatan: Optional[str] = None


class RTPCreate(RTPBase):
    pass


class RTPUpdate(BaseModel):
    deskripsi: Optional[str] = None
    respon_risiko: Optional[RTPResponRisiko] = None
    rencana_aksi: Optional[str] = None
    target_waktu: Optional[datetime] = None
    pic: Optional[str] = None
    indikator: Optional[str] = None
    output: Optional[str] = None
    anggaran: Optional[float] = None
    tanggal_realisasi: Optional[datetime] = None
    uraian_hambatan: Optional[str] = None


class RTPResponse(RTPBase):
    id: str
    status: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: str = Field(..., description="ID of the user who created the RTP")
    created_by_name: str = Field(
        ..., description="Full name of the user who created the RTP"
    )
    updated_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    komentar: Optional[List[KomentarResponse]] = []
    attachments: Optional[List[AttachmentResponse]] = Field(
        default_factory=list, description="List of file attachments for this RTP"
    )


class RTPVerify(BaseModel):
    status: str
    komentar: Optional[str] = None


# Monitoring Risiko schemas
class MonitoringRisikoBase(BaseModel):
    triwulan_periode_kejadian: int
    nama_kejadian: str
    nama_penyebab: str
    waktu_kejadian: datetime
    tempat_kejadian: str
    skor_dampak: float
    pemicu_kejadian: str
    bagan_risiko_id: Optional[str] = None
    tahun: int
    status: MonitoringStatus = MonitoringStatus.PENDING
    nama: str
    email: str
    no_hp: str
    triwulan_periode_kejadian_nama: Optional[str] = None
    skor_dampak_text: Optional[str] = None
    # The following fields are not required for monitoring risiko
    skor_kemungkinan: Optional[float] = None
    skor_kemungkinan_text: Optional[str] = None
    kemungkinan_id: Optional[str] = None
    dampak_id: Optional[str] = None


class MonitoringRisikoCreate(MonitoringRisikoBase):
    id_instansi: str
    id_induk_unit_kerja: Optional[str] = None


class MonitoringRisikoUpdate(BaseModel):
    nama_kejadian: Optional[str] = None
    nama_penyebab: Optional[str] = None
    waktu_kejadian: Optional[datetime] = None
    tempat_kejadian: Optional[str] = None
    skor_dampak: Optional[float] = None
    pemicu_kejadian: Optional[str] = None
    status: Optional[MonitoringStatus] = None
    nama: Optional[str] = None
    email: Optional[str] = None
    no_hp: Optional[str] = None


class MonitoringRisikoResponse(MonitoringRisikoBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# Peta Risiko schemas
class PetaRisikoKategoriBase(BaseModel):
    key: int = Field(..., description="Key for the category")
    value: str = Field(..., description="Value/name of the category")
    jenis: str = Field(..., description="Type (FREKUENSI/DAMPAK)")
    penjelasan: Optional[str] = Field(None, description="Explanation for the category")


class PetaRisikoKategoriCreate(PetaRisikoKategoriBase):
    pass


class PetaRisikoKategoriUpdate(BaseModel):
    key: Optional[int] = None
    value: Optional[str] = None
    penjelasan: Optional[str] = None


class PetaRisikoKategoriResponse(PetaRisikoKategoriBase):
    id: str
    template_id: str = Field(
        ..., description="ID of the template this category belongs to"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class PetaRisikoKlasifikasiBase(BaseModel):
    key: int = Field(..., description="Key for the classification")
    value: str = Field(..., description="Value/name of the classification")
    jenis: str = Field(..., description="Type (FREKUENSI/DAMPAK)")
    jenis_kriteria: Optional[str] = Field(
        None, description="Jenis kriteria for matrix row identification"
    )
    formula: Optional[str] = Field(None, description="Formula for the classification")


class PetaRisikoKlasifikasiCreate(PetaRisikoKlasifikasiBase):
    pass


class PetaRisikoKlasifikasiUpdate(BaseModel):
    key: Optional[int] = None
    value: Optional[str] = None
    jenis_kriteria: Optional[str] = None
    formula: Optional[str] = None


class PetaRisikoKlasifikasiResponse(PetaRisikoKlasifikasiBase):
    id: str
    template_id: str = Field(
        ..., description="ID of the template this classification belongs to"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class PetaRisikoMatriksBase(BaseModel):
    kategori: int = Field(..., description="Category key")
    klasifikasi: int = Field(..., description="Classification key")
    value: str = Field(..., description="Matrix value")
    jenis: str = Field(..., description="Type (FREKUENSI/DAMPAK)")


class PetaRisikoMatriksCreate(PetaRisikoMatriksBase):
    pass


class PetaRisikoMatriksUpdate(BaseModel):
    value: Optional[str] = None


class PetaRisikoMatriksResponse(PetaRisikoMatriksBase):
    id: str
    template_id: str = Field(
        ..., description="ID of the template this matrix belongs to"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class RiskInHeatmapCell(BaseModel):
    """Schema for risk data in heatmap cell"""

    id: str
    pernyataan_risiko: str
    level_risiko_inherit: Optional[int] = None
    level_risiko_residual: Optional[int] = None
    memenuhi_inherit: bool = False
    memenuhi_residual: bool = False


class PetaRisikoMatriksHeatmapBase(BaseModel):
    dampak: int = Field(..., description="Impact level")
    frekuensi: int = Field(..., description="Frequency level")
    value: str = Field(..., description="Heatmap value")
    kode_warna: Optional[str] = Field(
        None, description="Color code for the heatmap cell"
    )


class PetaRisikoMatriksHeatmapCreate(PetaRisikoMatriksHeatmapBase):
    pass


class PetaRisikoMatriksHeatmapUpdate(BaseModel):
    value: Optional[str] = None
    kode_warna: Optional[str] = None


class PetaRisikoMatriksHeatmapResponse(PetaRisikoMatriksHeatmapBase):
    id: str
    template_id: str = Field(
        ..., description="ID of the template this heatmap belongs to"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    value_skor: Optional[int] = None
    memenuhi: Optional[bool] = None
    atas: Optional[bool] = None
    bawah: Optional[bool] = None
    kiri: Optional[bool] = None
    kanan: Optional[bool] = None
    risks: Optional[List[RiskInHeatmapCell]] = []


class PetaRisikoTemplateBase(BaseModel):
    kode: str = Field(..., description="Template code")
    nama: str = Field(..., description="Template name")
    frekuensi: int = Field(..., description="Number of frequency levels")
    dampak: int = Field(..., description="Number of impact levels")
    tahun: int = Field(..., description="Year")
    klp_id: str = Field(..., description="KLP ID")


class PetaRisikoTemplateCreate(PetaRisikoTemplateBase):
    pass


class PetaRisikoTemplateUpdate(BaseModel):
    nama: Optional[str] = None
    frekuensi: Optional[int] = None
    dampak: Optional[int] = None


class SeleraRisiko(BaseModel):
    """Schema for risk appetite info"""

    max: int = Field(..., description="Maximum allowed risk appetite")
    current: int = Field(..., description="Current risk appetite")


class PetaRisikoTemplateResponse(PetaRisikoTemplateBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    selera_risiko: Optional[SeleraRisiko] = None


# Jenis Peta Risiko enum
class JenisPetaRisiko(str, Enum):
    FREKUENSI = "FREKUENSI"
    DAMPAK = "DAMPAK"


# Risk Statement Generation schemas
class RiskStatementGenerationRequest(BaseModel):
    """Schema for risk statement generation request"""

    id_konteks_sasaran: str = Field(..., description="Target context ID")
    id_indikator: str = Field(..., description="Indicator ID")
    id_konteks_probis: str = Field(..., description="Business process context ID")
    count: Optional[int] = Field(
        5, description="Number of risk statements to generate (default: 5)"
    )


class RiskStatement(BaseModel):
    """Schema for a generated risk statement"""

    id: str = Field(..., description="Temporary ID for the generated statement")
    pernyataan_risiko: str = Field(..., description="Risk statement text")
    deskripsi: Optional[str] = Field(None, description="Risk description")
    tag: Optional[str] = Field(
        "NORMAL", description="Tag for the risk statement (NORMAL/FRAUD)"
    )


class RiskStatementGenerationResponse(BaseModel):
    """Schema for risk statement generation response"""

    generation_id: str = Field(..., description="ID of the generation session")
    statements: List[RiskStatement] = Field(
        ..., description="List of generated risk statements"
    )


class RiskStatementSelectionRequest(BaseModel):
    """Schema for risk statement selection request"""

    selected_ids: List[str] = Field(..., description="List of selected statement IDs")
    generation_id: str = Field(..., description="ID of the generation session")


class RootCauseGenerationRequest(BaseModel):
    """Schema for root cause generation request"""

    identifikasi_risiko_id: str = Field(
        ..., description="ID of the risk identification"
    )


class RootCause(BaseModel):
    """Schema for a generated root cause"""

    id: str = Field(..., description="Temporary ID for the generated root cause")
    jenis: str = Field(..., description="Type of element (penyebab/dampak)")
    deskripsi: str = Field(..., description="Description of the cause or impact")
    pengendalian: str = Field("", description="Recommended control")
    jenis_pengendalian: str = Field(
        ..., description="Type of control (Mengurangi kemungkinan/Mengurangi dampak)"
    )


class RootCauseGenerationResponse(BaseModel):
    """Schema for root cause generation response"""

    generation_id: str = Field(..., description="ID of the generation session")
    root_causes: List[RootCause] = Field(
        ..., description="List of generated root causes"
    )


class RootCauseSelectionRequest(BaseModel):
    """Schema for root cause selection request"""

    selected_id: str = Field(..., description="ID of the selected root cause")
    generation_id: str = Field(..., description="ID of the generation session")
    identifikasi_risiko_id: str = Field(
        ..., description="ID of the risk identification"
    )


class PetaRisikoCompleteView(BaseModel):
    """Schema for the complete risk map view in one response"""

    template: Optional[PetaRisikoTemplateResponse] = None
    kategori_frekuensi: List[PetaRisikoKategoriResponse] = []
    kategori_dampak: List[PetaRisikoKategoriResponse] = []
    klasifikasi_frekuensi: List[PetaRisikoKlasifikasiResponse] = []
    klasifikasi_dampak: List[PetaRisikoKlasifikasiResponse] = []
    meta_frekuensi: List[PetaRisikoMatriksResponse] = []
    meta_dampak: List[PetaRisikoMatriksResponse] = []
    meta_heatmap: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_inherit: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_residual: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_treated: List[PetaRisikoMatriksHeatmapResponse] = []
    meta_actual: List[PetaRisikoMatriksHeatmapResponse] = []


class RiskScoreResponse(BaseModel):
    """Schema for risk score response"""

    skor_kemungkinan: Union[float, int] = Field(..., description="Likelihood score")
    skor_dampak: Union[float, int] = Field(..., description="Impact score")
    kemungkinan_id: Optional[str] = Field(None, description="Likelihood criteria ID")
    dampak_id: Optional[str] = Field(None, description="Impact criteria ID")
    level_risiko: Optional[int] = Field(
        None, description="Risk level calculated from score"
    )
    memenuhi: Optional[bool] = Field(
        None, description="Whether risk meets risk appetite"
    )
    use_risk: Optional[str] = Field(
        None, description="Current risk type in use (I/R/T/A)"
    )
    kriteria_kemungkinan: Optional[Dict[str, Any]] = Field(
        None, description="Likelihood criteria details"
    )
    kriteria_dampak: Optional[Dict[str, Any]] = Field(
        None, description="Impact criteria details"
    )
    updated_by: Optional[str] = Field(
        None, description="User ID who last updated the risk scores"
    )
    last_updated: Optional[str] = Field(
        None,
        description="Risk type that was last updated (INHERIT/RESIDUAL/TREATED/ACTUAL)",
    )


class RiskScoreUpdate(BaseModel):
    """Schema for updating risk scores"""

    skor_kemungkinan: Union[float, int] = Field(
        ..., description="Likelihood score to update"
    )
    skor_dampak: Union[float, int] = Field(..., description="Impact score to update")
    kemungkinan_id: Optional[str] = Field(None, description="Likelihood criteria ID")
    dampak_id: Optional[str] = Field(None, description="Impact criteria ID")


# ApprovalData schemas
class ApprovalData(BaseModel):
    """Schema for approval data"""

    is_approved: bool = Field(
        ..., description="Whether the risk identification is approved"
    )
    notes: str = Field(..., description="Notes for the approval/rejection")


# DisableData schemas
class DisableData(BaseModel):
    """Schema for disable data"""

    reason: str = Field(..., description="Reason for disabling the risk identification")


# === Laporan Kejadian (Incident Report) schemas ===


class LaporanKejadianBase(BaseModel):
    """Base model for incident reports"""

    nama: str = Field(..., description="Nama pelapor")
    email: EmailStr = Field(..., description="Email pelapor")
    no_hp: str = Field(..., description="Nomor handphone pelapor")
    nama_kejadian: str = Field(..., description="Nama kejadian yang dilaporkan")
    waktu_kejadian: datetime = Field(..., description="Waktu kejadian")
    tempat_kejadian: str = Field(..., description="Tempat kejadian")
    pemicu_kejadian: str = Field(..., description="Pemicu/penyebab kejadian")


class LaporanKejadianCreate(LaporanKejadianBase):
    """Schema for creating a new incident report"""

    pass


class LaporanKejadianResponse(LaporanKejadianBase):
    """Schema for incident report response"""

    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    status: MonitoringStatus = MonitoringStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    triwulan_periode_kejadian: Optional[int] = None
    triwulan_periode_kejadian_nama: Optional[str] = None
    pernyataan_risiko_id: Optional[str] = None
    dampak_id: Optional[str] = None
    kemungkinan_id: Optional[str] = None

    class Config:
        orm_mode = True


class ApprovalAction(BaseModel):
    """Schema for approving or rejecting an incident report"""

    action: str = Field(..., description="Action to take (APPROVE/REJECT)")
    pernyataan_risiko_id: Optional[str] = Field(
        None,
        description="ID of risk statement from kamus_risiko (required if approving)",
    )
    dampak_id: Optional[str] = Field(
        None, description="ID of impact criteria (required if approving)"
    )
    kemungkinan_id: Optional[str] = Field(
        None, description="ID of likelihood criteria (required if approving)"
    )
    notes: Optional[str] = Field(None, description="Notes for rejection reason")


class LinkToken(BaseModel):
    """Schema for anonymous reporting link tokens"""

    link: str
    institution: str
    parent_work_unit: str
    expires_at: datetime
