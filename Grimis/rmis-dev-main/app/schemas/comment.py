from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TipeKomentar(str, Enum):
    IDENTIFIKASI = "IDENTIFIKASI"  # Komentar untuk identifikasi risiko
    ANALISIS = "ANALISIS"          # Komentar untuk analisis risiko
    EVALUASI = "EVALUASI"          # Komentar untuk evaluasi risiko
    RTP = "RTP"                    # Komentar untuk rencana tindak pengendalian

class KomentarStatus(str, Enum):
    OPEN = "OPEN"      # Komentar terbuka, masih dapat dibalas
    CLOSED = "CLOSED"  # Komentar tertutup, tidak dapat dibalas lagi

class KomentarBase(BaseModel):
    tipe_komentar: TipeKomentar = Field(
        default=TipeKomentar.IDENTIFIKASI,
        description="Tipe komentar yang menunjukkan tahapan manajemen risiko yang dikomentari"
    )
    ref_id: str = Field(
        ...,
        description="ID referensi (ID identifikasi/analisis/evaluasi/rtp) sesuai dengan tipe komentar"
    )
    konten: str = Field(
        ...,
        description="Isi komentar",
        min_length=1
    )
    id_instansi: Optional[str] = Field(
        None,
        description="ID instansi, akan diisi otomatis oleh sistem"
    )
    parent_id: Optional[str] = Field(
        None,
        description="ID komentar induk (untuk balasan)"
    )
    depth: int = Field(
        default=0,
        description="Level kedalaman komentar (0 untuk komentar utama, 1-2 untuk balasan)",
        ge=0,
        le=2
    )
    tahun: Optional[int] = Field(
        None,
        description="Tahun identifikasi risiko"
    )
    status: KomentarStatus = Field(
        default=KomentarStatus.OPEN,
        description="Status komentar (OPEN/CLOSED)"
    )
    metadata: Optional[dict] = Field(
        None,
        description="Metadata tambahan untuk komentar (misalnya tipe analisis: inherent, residual, dll)"
    )

class KomentarCreate(KomentarBase):
    # Additional fields for frontend compatibility
    text: Optional[str] = Field(None, description="Alias untuk konten untuk kompatibilitas dengan frontend")
    type: Optional[str] = Field(None, description="Alias untuk tipe_komentar untuk kompatibilitas dengan frontend")

class KomentarUpdate(BaseModel):
    konten: str

class KomentarStatusUpdate(BaseModel):
    status: KomentarStatus = Field(..., description="Status komentar baru (OPEN/CLOSED)")

class KomentarReply(BaseModel):
    konten: str
    parent_id: str = Field(..., description="ID komentar induk yang dibalas")

class KomentarResponse(KomentarBase):
    id: str = Field(..., description="ID komentar")
    user_id: str = Field(..., description="ID pengguna pembuat komentar")
    nama_user: str = Field(..., description="Nama pengguna pembuat komentar")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Tanggal pembuatan")
    updated_at: Optional[datetime] = Field(None, description="Tanggal update")
    closed_at: Optional[datetime] = Field(None, description="Tanggal penutupan komentar")
    closed_by: Optional[str] = Field(None, description="ID pengguna yang menutup komentar")
    closed_by_name: Optional[str] = Field(None, description="Nama pengguna yang menutup komentar")
    replies: Optional[List["KomentarResponse"]] = Field(default=[], description="Daftar balasan komentar")
    # Add text and type fields for compatibility with frontend
    text: str = Field(None, description="Alias untuk konten untuk kompatibilitas dengan frontend")
    type: str = Field(None, description="Alias untuk tipe_komentar untuk kompatibilitas dengan frontend")
    
    class Config:
        orm_mode = True
        
    def __init__(self, **data):
        # Ensure text and type fields are set based on konten and tipe_komentar
        if "konten" in data and "text" not in data:
            data["text"] = data["konten"]
        if "tipe_komentar" in data and "type" not in data:
            data["type"] = data["tipe_komentar"]
        super().__init__(**data)

# Needed for self-referencing models
KomentarResponse.update_forward_refs() 