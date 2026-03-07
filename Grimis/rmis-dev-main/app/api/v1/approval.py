from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.risk import (
    ApprovalCreate,
    ApprovalUpdate,
    ApprovalResponse,
    ApprovalStatus
)
from app.schemas.user import UserRole
from app.database import Database
from app.utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=ApprovalResponse)
async def create_approval(
    approval: ApprovalCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new approval record.
    """
    db = await Database.get_db()
    
    approval_dict = approval.dict()
    approval_dict["created_at"] = datetime.utcnow()
    approval_dict["created_by"] = str(current_user["id"])
    
    result = await db.approvals.insert_one(approval_dict)
    created = await db.approvals.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])
    
    return ApprovalResponse(**created)

@router.get("", response_model=List[ApprovalResponse])
async def get_approvals(
    type: Optional[str] = None,
    status: Optional[ApprovalStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of approvals with optional filtering.
    """
    db = await Database.get_db()
    
    query = {}
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    
    approvals = []
    async for approval in db.approvals.find(query).sort("created_at", -1):
        approval["id"] = str(approval["_id"])
        approvals.append(ApprovalResponse(**approval))
    
    return approvals

@router.put("/{approval_id}", response_model=ApprovalResponse)
async def update_approval(
    approval_id: str,
    approval: ApprovalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an approval record.
    """
    if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to update approval"
        )
    
    db = await Database.get_db()
    
    update_data = approval.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["id"])
    
    result = await db.approvals.update_one(
        {"_id": ObjectId(approval_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    updated = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    updated["id"] = approval_id
    
    return ApprovalResponse(**updated)

@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(
    approval_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific approval record.
    """
    db = await Database.get_db()
    
    approval = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    approval["id"] = str(approval["_id"])
    return ApprovalResponse(**approval) 