from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import datetime
from pydantic import Field

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN_KLP = "ADMIN_KLP"
    UNIT_MANAJEMEN_RISIKO = "UNIT_MANAJEMEN_RISIKO"
    PEMILIK_RISIKO = "PEMILIK_RISIKO"
    PENGELOLA_RISIKO = "PENGELOLA_RISIKO"
    PENGAWAS_INTERN = "PENGAWAS_INTERN"
    PEGAWAI = "PEGAWAI"

class UserBase(BaseModel):
    nama_depan: str
    nama_belakang: str
    email: str
    username: str
    role: UserRole

class UserCreate(UserBase):
    password: Optional[str] = Field(None, description="Leave empty to auto-generate random password", max_length=70)
    send_email: bool = Field(True, description="Send welcome email with credentials")
    instansi_id: Optional[str] = Field(None, description="Required for all roles except SUPER_ADMIN")
    induk_unit_kerja_ids: Optional[List[str]] = Field(None, description="List of parent work unit IDs the user has access to")

class UserUpdate(BaseModel):
    nama_depan: Optional[str] = None
    nama_belakang: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    last_instansi_id: Optional[str] = None
    last_induk_unit_kerja_id: Optional[str] = None
    instansi_id: Optional[str] = None
    induk_unit_kerja_ids: Optional[List[str]] = None
    group_ids: Optional[List[str]] = Field(None, description="List of group IDs the user belongs to")

class UserSelfUpdate(BaseModel):
    nama_depan: Optional[str] = None
    nama_belakang: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., description="New password to set", min_length=6)
    confirm_password: str = Field(..., description="Confirm the new password")

class UserResponse(UserBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_instansi_id: Optional[str] = None
    last_induk_unit_kerja_id: Optional[str] = None
    instansi_id: Optional[str] = None
    induk_unit_kerja_ids: Optional[List[str]] = None
    group_ids: Optional[List[str]] = Field(default_factory=list, description="List of group IDs the user belongs to")
    nama_instansi: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    recaptcha_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Email of the user requesting password reset")

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="The reset token received via email")
    new_password: str = Field(..., description="New password to set", min_length=6)
    confirm_password: str = Field(..., description="Confirm the new password") 