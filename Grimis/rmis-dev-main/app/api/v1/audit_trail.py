"""
Audit Trail API endpoints
Similar to AWS CloudTrail for viewing and querying audit logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from app.schemas.audit_log import (
    AuditLogResponse,
    AuditLogListResponse,
    AuditLogFilter,
    AuditAction,
    ResourceType,
    AuditLogSummary
)
from app.schemas.user import UserRole
from app.services.audit_service import AuditService
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    username: Optional[str] = Query(None, description="Filter by username"),
    action: Optional[AuditAction] = Query(None, description="Filter by action type"),
    resource_type: Optional[ResourceType] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[datetime] = Query(None, description="Filter to date (ISO format)"),
    endpoint: Optional[str] = Query(None, description="Filter by API endpoint"),
    status_code: Optional[int] = Query(None, description="Filter by HTTP status code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("timestamp", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit logs with filtering and pagination.

    Permissions:
    - SUPER_ADMIN can view all audit logs
    - ADMIN_KLP can view logs for their instansi
    - Other users can only view their own logs
    """
    # Check permissions
    if current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        # Regular users can only see their own logs
        user_id = current_user.get("id")

    # Build filter
    filter_params = AuditLogFilter(
        user_id=user_id,
        username=username,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        date_from=date_from,
        date_to=date_to,
        endpoint=endpoint,
        status_code=status_code
    )

    result = await AuditService.get_logs(
        filter_params=filter_params,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return AuditLogListResponse(**result)


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log_by_id(
    log_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific audit log by ID.
    """
    log = await AuditService.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    # Check permissions
    if current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        if log.user_id != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="You can only view your own audit logs"
            )

    return log


@router.get("/summary", response_model=AuditLogSummary)
async def get_audit_summary(
    days: int = Query(7, ge=1, le=365, description="Number of days to summarize"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get summary statistics for audit logs.

    Permissions:
    - SUPER_ADMIN can see summary for all users
    - Others see only their own summary
    """
    date_from = datetime.utcnow() - timedelta(days=days)
    date_to = datetime.utcnow()

    # Filter by user if not admin
    user_id = None
    if current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        user_id = current_user.get("id")

    summary = await AuditService.get_summary(
        date_from=date_from,
        date_to=date_to,
        user_id=user_id
    )

    return summary


@router.get("/my-activity", response_model=AuditLogListResponse)
async def get_my_activity(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user's activity history.
    """
    result = await AuditService.get_user_activity(
        user_id=current_user.get("id"),
        page=page,
        page_size=page_size
    )

    return AuditLogListResponse(**result)


@router.get("/resource/{resource_type}/{resource_id}", response_model=AuditLogListResponse)
async def get_resource_history(
    resource_type: ResourceType,
    resource_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit history for a specific resource.
    """
    # Check permissions - only admins can view resource history
    if current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ADMIN_KLP]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to view resource history"
        )

    result = await AuditService.get_resource_history(
        resource_type=resource_type,
        resource_id=resource_id,
        page=page,
        page_size=page_size
    )

    return AuditLogListResponse(**result)


@router.get("/actions", response_model=List[str])
async def get_available_actions(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of available audit action types for filtering.
    """
    return [action.value for action in AuditAction]


@router.get("/resource-types", response_model=List[str])
async def get_available_resource_types(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of available resource types for filtering.
    """
    return [rt.value for rt in ResourceType]


@router.delete("/cleanup", response_model=dict)
async def cleanup_old_logs(
    older_than_days: int = Query(365, ge=30, description="Delete logs older than X days"),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete old audit logs (admin only).

    Use this to manage storage - keep audit logs for compliance requirements
    but remove very old data.
    """
    # Only SUPER_ADMIN can cleanup logs
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only SUPER_ADMIN can cleanup audit logs"
        )

    deleted_count = await AuditService.delete_old_logs(older_than_days)

    return {
        "message": f"Deleted {deleted_count} audit logs older than {older_than_days} days",
        "deleted_count": deleted_count
    }
