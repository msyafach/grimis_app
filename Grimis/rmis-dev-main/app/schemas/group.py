from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Permission(str, Enum):
    """
    List of all available permissions in the system.
    These permissions can be assigned to groups.
    """
    # Dashboard
    VIEW_DASHBOARD = "view:dashboard"
    VIEW_RISK_MAP = "view:risk_map"

    # Organization Management (Instansi, Unit Kerja)
    MANAGE_ORGANIZATION = "manage:organization"
    VIEW_ORGANIZATION = "view:organization"

    # Parameters Management
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

    # Risk Analysis
    MANAGE_ANALYSIS = "manage:analysis"
    VIEW_ANALYSIS = "view:analysis"
    CREATE_ANALYSIS = "create:analysis"
    EDIT_ANALYSIS = "edit:analysis"

    # Risk Evaluation (RTP)
    MANAGE_EVALUATION = "manage:evaluation"
    VIEW_EVALUATION = "view:evaluation"
    CREATE_EVALUATION = "create:evaluation"
    EDIT_EVALUATION = "edit:evaluation"
    VERIFY_EVALUATION = "verify:evaluation"

    # Monitoring & Reporting
    MANAGE_MONITORING = "manage:monitoring"
    VIEW_MONITORING = "view:monitoring"
    CREATE_MONITORING = "create:monitoring"
    MANAGE_REPORTING = "manage:reporting"

    # User Management
    MANAGE_USERS = "manage:users"
    VIEW_USERS = "view:users"
    CREATE_USERS = "create:users"
    EDIT_USERS = "edit:users"
    DELETE_USERS = "delete:users"

    # Group Management
    MANAGE_GROUPS = "manage:groups"
    VIEW_GROUPS = "view:groups"

    # Approval
    APPROVE_PROPOSALS = "approve:proposals"
    VIEW_APPROVALS = "view:approvals"

    # Settings
    MANAGE_SETTINGS = "manage:settings"
    VIEW_SETTINGS = "view:settings"


class GroupBase(BaseModel):
    name: str = Field(..., description="Group name", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="Group description", max_length=500)


class GroupCreate(GroupBase):
    permissions: Optional[List[Permission]] = Field(
        default_factory=list,
        description="List of permissions to grant to this group"
    )
    member_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of user IDs to add as initial members"
    )


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: Optional[List[Permission]] = None
    member_ids: Optional[List[str]] = None


class GroupResponse(GroupBase):
    id: str
    permissions: List[Permission] = Field(default_factory=list)
    member_count: int = Field(0, description="Number of users in this group")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GroupMemberResponse(BaseModel):
    """Response for group member with user details"""
    user_id: str
    username: str
    email: str
    nama_depan: str
    nama_belakang: str
    role: str
    added_at: datetime = Field(default_factory=datetime.utcnow)


class GroupWithMembers(GroupResponse):
    """Extended group response including member details"""
    members: List[GroupMemberResponse] = Field(default_factory=list)
