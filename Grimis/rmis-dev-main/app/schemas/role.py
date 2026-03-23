from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Permission(str, Enum):
    """
    List of all available permissions in the system.
    These permissions can be assigned to roles (same as groups).
    """
    # Dashboard
    VIEW_DASHBOARD = "view:dashboard"
    VIEW_RISK_MAP = "view:risk_map"

    # Organization Management (Instansi, Unit Kerja)
    MANAGE_ORGANIZATION = "manage:organization"
    VIEW_ORGANIZATION = "view:organization"
    MANAGE_STRUCTURAL_UNITS = "manage:structural_units"
    VIEW_STRUCTURAL_UNITS = "view:structural_units"

    # Parameters Management (Konteks Sasaran, Konteks Probis, Kamus Risiko)
    MANAGE_CONTEXT_TARGET = "manage:context_target"
    VIEW_CONTEXT_TARGET = "view:context_target"
    MANAGE_CONTEXT_PROBIS = "manage:context_probis"
    VIEW_CONTEXT_PROBIS = "view:context_probis"
    MANAGE_RISK_DICTIONARY = "manage:risk_dictionary"
    VIEW_RISK_DICTIONARY = "view:risk_dictionary"

    # Legacy Parameters
    MANAGE_PARAMETERS = "manage:parameters"
    VIEW_PARAMETERS = "view:parameters"
    PROPOSE_PARAMETERS = "propose:parameters"

    # Risk Management
    MANAGE_RISK = "manage:risk"
    VIEW_RISK = "view:risk"
    PROPOSE_RISK = "propose:risk"
    APPROVE_RISK = "approve:risk"

    # Risk Identification
    MANAGE_IDENTIFICATION = "manage:identification"
    VIEW_IDENTIFICATION = "view:identification"
    CREATE_IDENTIFICATION = "create:identification"
    EDIT_IDENTIFICATION = "edit:identification"
    DELETE_IDENTIFICATION = "delete:identification"
    MANAGE_RISK_IDENTIFICATION = "manage:risk_identification"
    VIEW_RISK_IDENTIFICATION = "view:risk_identification"

    # Risk Analysis / Assessment
    MANAGE_ANALYSIS = "manage:analysis"
    VIEW_ANALYSIS = "view:analysis"
    CREATE_ANALYSIS = "create:analysis"
    EDIT_ANALYSIS = "edit:analysis"
    CREATE_RISK_ASSESSMENT = "create:risk_assessment"
    APPROVE_RISK_ASSESSMENT = "approve:risk_assessment"

    # Risk Treatment / Evaluation (RTP)
    MANAGE_EVALUATION = "manage:evaluation"
    VIEW_EVALUATION = "view:evaluation"
    CREATE_EVALUATION = "create:evaluation"
    EDIT_EVALUATION = "edit:evaluation"
    VERIFY_EVALUATION = "verify:evaluation"
    MANAGE_RISK_TREATMENT = "manage:risk_treatment"
    VIEW_RISK_TREATMENT = "view:risk_treatment"

    # Monitoring & Reporting
    MANAGE_MONITORING = "manage:monitoring"
    VIEW_MONITORING = "view:monitoring"
    CREATE_MONITORING = "create:monitoring"
    MANAGE_REPORTING = "manage:reporting"
    VIEW_REPORTS = "view:reports"
    EXPORT_REPORTS = "export:reports"

    # Event Management (Kejadian)
    MANAGE_EVENT = "manage:event"
    VIEW_EVENT = "view:event"
    APPROVE_EVENT = "approve:event"
    APPROVE_KEJADIAN = "approve:kejadian"

    # User Management
    MANAGE_USERS = "manage:users"
    VIEW_USERS = "view:users"
    CREATE_USERS = "create:users"
    EDIT_USERS = "edit:users"
    DELETE_USERS = "delete:users"

    # Group Management
    MANAGE_GROUPS = "manage:groups"
    VIEW_GROUPS = "view:groups"

    # Role Management
    MANAGE_ROLES = "manage:roles"
    VIEW_ROLES = "view:roles"

    # Risk Dictionary Approval
    APPROVE_RISK_DICTIONARY = "approve:risk_dictionary"

    # Approval
    APPROVE_PROPOSALS = "approve:proposals"
    VIEW_APPROVALS = "view:approvals"

    # Settings
    MANAGE_SETTINGS = "manage:settings"
    VIEW_SETTINGS = "view:settings"
    VIEW_AUDIT_LOGS = "view:audit_logs"


class RoleBase(BaseModel):
    name: str = Field(..., description="Role name", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="Role description", max_length=500)


class RoleCreate(RoleBase):
    permissions: Optional[List[Permission]] = Field(
        default_factory=list,
        description="List of permissions to grant to this role"
    )
    user_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of user IDs to assign this role to initially"
    )


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: Optional[List[Permission]] = None
    user_ids: Optional[List[str]] = None


class RoleResponse(RoleBase):
    id: str
    permissions: List[Permission] = Field(default_factory=list)
    user_count: int = Field(0, description="Number of users with this role")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleUserResponse(BaseModel):
    """Response for role user with user details"""
    user_id: str
    username: str
    email: str
    nama_depan: str
    nama_belakang: str
    role: str
    assigned_at: datetime = Field(default_factory=datetime.utcnow)


class RolePermissionUpdate(BaseModel):
    permissions: List[Permission] = Field(default_factory=list, description="List of permissions for the role")


class RoleWithUsers(RoleResponse):
    """Extended role response including user details"""
    users: List[RoleUserResponse] = Field(default_factory=list)
