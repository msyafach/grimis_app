from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class AuditAction(str, Enum):
    """Types of audit actions"""
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    ASSIGN = "ASSIGN"
    UNASSIGN = "UNASSIGN"
    OTHER = "OTHER"


class ResourceType(str, Enum):
    """Types of resources that can be audited"""
    USER = "USER"
    GROUP = "GROUP"
    INSTANSI = "INSTANSI"
    INDUK_UNIT_KERJA = "INDUK_UNIT_KERJA"
    STRUKTUR_ORGANISASI = "STRUKTUR_ORGANISASI"
    IDENTIFIKASI_RISIKO = "IDENTIFIKASI_RISIKO"
    ANALISIS_RISIKO = "ANALISIS_RISIKO"
    EVALUASI_RISIKO = "EVALUASI_RISIKO"
    RTP = "RTP"
    MONITORING = "MONITORING"
    KAMUS_RISIKO = "KAMUS_RISIKO"
    KATEGORI_RISIKO = "KATEGORI_RISIKO"
    KRITERIA_RISIKO = "KRITERIA_RISIKO"
    BAGAN_RISIKO = "BAGAN_RISIKO"
    KONTeks = "KONTEKS"
    INDIKATOR = "INDIKATOR"
    LAPORAN_KEJADIAN = "LAPORAN_KEJADIAN"
    APPROVAL = "APPROVAL"
    SETTINGS = "SETTINGS"
    OTHER = "OTHER"


class AuditLogBase(BaseModel):
    """Base audit log model"""
    user_id: Optional[str] = Field(None, description="ID of the user who performed the action")
    username: Optional[str] = Field(None, description="Username of the user")
    user_role: Optional[str] = Field(None, description="Role of the user at the time of action")
    action: AuditAction = Field(..., description="Type of action performed")
    resource_type: ResourceType = Field(..., description="Type of resource affected")
    resource_id: Optional[str] = Field(None, description="ID of the resource affected")
    resource_name: Optional[str] = Field(None, description="Human-readable name of the resource")
    description: str = Field(..., description="Human-readable description of the action")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details about the action")
    old_values: Optional[Dict[str, Any]] = Field(None, description="Previous values before update (for UPDATE actions)")
    new_values: Optional[Dict[str, Any]] = Field(None, description="New values after action")
    ip_address: Optional[str] = Field(None, description="IP address of the request")
    user_agent: Optional[str] = Field(None, description="User agent string")
    endpoint: str = Field(..., description="API endpoint accessed")
    method: str = Field(..., description="HTTP method used")
    status_code: Optional[int] = Field(None, description="HTTP response status code")
    error_message: Optional[str] = Field(None, description="Error message if action failed")


class AuditLogCreate(AuditLogBase):
    """Schema for creating audit logs"""
    pass


class AuditLogResponse(AuditLogBase):
    """Schema for audit log responses"""
    id: str = Field(..., description="Unique ID of the audit log entry")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the action occurred")

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """Filter parameters for querying audit logs"""
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: Optional[AuditAction] = None
    resource_type: Optional[ResourceType] = None
    resource_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None


class AuditLogListResponse(BaseModel):
    """Paginated list of audit logs"""
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogSummary(BaseModel):
    """Summary statistics for audit logs"""
    total_actions: int
    actions_by_type: Dict[str, int]
    actions_by_resource: Dict[str, int]
    top_users: List[Dict[str, Any]]
    period_start: datetime
    period_end: datetime
