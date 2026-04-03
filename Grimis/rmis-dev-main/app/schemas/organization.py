from datetime import datetime
from typing import List, Optional

from app.schemas.risk import JenisKonteks
from app.schemas.user import UserRole
from bson import ObjectId
from pydantic import BaseModel, Field

class InstansiBase(BaseModel):
    nama_instansi: str
    kode_instansi: str
    jenis: str
    alamat: Optional[str] = None
    telepon: Optional[str] = None
    email: Optional[str] = None
    kop_surat_baris_1: Optional[str] = None
    kop_surat_baris_2: Optional[str] = None
    kop_surat_baris_3: Optional[str] = None
    kop_surat_alamat: Optional[str] = None
    logo_instansi: Optional[str] = None


class InstansiCreate(InstansiBase):
    pass


class InstansiUpdate(InstansiBase):
    nama_instansi: Optional[str] = None
    kode_instansi: Optional[str] = None
    kop_surat_baris_1: Optional[str] = None
    kop_surat_baris_2: Optional[str] = None
    kop_surat_baris_3: Optional[str] = None
    kop_surat_alamat: Optional[str] = None
    logo_instansi: Optional[str] = None


class InstansiResponse(InstansiBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class IndukUnitKerjaBase(BaseModel):
    nama_induk_unit: str
    kode_induk: str
    parent_kode_induk: Optional[str] = None


class IndukUnitKerjaCreate(IndukUnitKerjaBase):
    id_instansi: str
    name: str
    parent_id: Optional[str] = None


class IndukUnitKerjaUpdate(IndukUnitKerjaBase):
    name: Optional[str] = None
    parent_id: Optional[str] = None


class IndukUnitKerjaResponse(IndukUnitKerjaBase):
    id: str
    id_instansi: str
    name: str
    children: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class IndukUnitKerjaWithInstansi(IndukUnitKerjaResponse):
    nama_instansi: str
    kode_instansi: str


class IndukUnitKerjaGroupByInstansi(BaseModel):
    id_instansi: str
    nama_instansi: str
    kode_instansi: str
    induk_unit_kerja: List[IndukUnitKerjaResponse]


class StrukturOrganisasiBase(BaseModel):
    kode: str
    kode_induk: Optional[str] = None  # Parent organization's unique code
    nama: str
    nama_pendek: str
    selera_risiko: int = Field(ge=1, le=25)
    provinsi: str
    pimpinan: Optional[str] = None
    jabatan_pimpinan: Optional[str] = None
    kota: Optional[str] = None


class JenisKonteksInStruktur(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()))
    kode: str
    nama: str
    jenis: JenisKonteks
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class StrukturOrganisasiCreate(StrukturOrganisasiBase):
    id_induk_unit_kerja: str
    id_instansi: str
    jenis_konteks: Optional[List[JenisKonteksInStruktur]] = Field(default_factory=list)
    parent_nama_induk_unit: Optional[str] = (
        None  # Store original parent induk unit kerja name
    )


class StrukturOrganisasiUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    nama_pendek: Optional[str] = None
    selera_risiko: Optional[int] = None
    provinsi: Optional[str] = None
    pimpinan: Optional[str] = None
    jabatan_pimpinan: Optional[str] = None
    kota: Optional[str] = None
    id_induk_unit_kerja: Optional[str] = None


class UserInStruktur(BaseModel):
    user_id: str
    role: UserRole
    assigned_at: datetime = Field(default_factory=datetime.utcnow)


class StrukturOrganisasiResponse(StrukturOrganisasiBase):
    id: str
    id_instansi: str
    id_induk_unit_kerja: str
    nama_instansi: str
    nama_induk_unit: str
    jenis: str
    jenis_konteks: List[JenisKonteksInStruktur]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    assigned_users: List[UserInStruktur] = []

    updated_at: Optional[datetime] = None
    assigned_users: List[UserInStruktur] = []

class AssignUserRequest(BaseModel):
    user_ids: List[str]
