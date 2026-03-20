"""
Audit logging service for tracking all system activities
Similar to AWS CloudTrail
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from app.database import Database
from app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse,
    AuditAction,
    ResourceType,
    AuditLogFilter,
    AuditLogSummary
)


class AuditService:
    """Service for managing audit logs"""

    @staticmethod
    async def log_action(
        user_id: Optional[str],
        username: Optional[str],
        user_role: Optional[str],
        action: AuditAction,
        resource_type: ResourceType,
        endpoint: str,
        method: str,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        description: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status_code: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Optional[AuditLogResponse]:
        """
        Create an audit log entry
        """
        try:
            db = await Database.get_db()

            # Generate description if not provided
            if not description:
                description = AuditService._generate_description(
                    action, resource_type, resource_name or resource_id, username
                )

            audit_log = {
                "user_id": user_id,
                "username": username,
                "user_role": user_role,
                "action": action.value,
                "resource_type": resource_type.value,
                "resource_id": resource_id,
                "resource_name": resource_name,
                "description": description,
                "details": details or {},
                "old_values": old_values,
                "new_values": new_values,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "error_message": error_message,
                "timestamp": datetime.utcnow()
            }

            result = await db.audit_logs.insert_one(audit_log)

            # Return the created log
            audit_log["id"] = str(result.inserted_id)
            return AuditLogResponse(**audit_log)

        except Exception as e:
            # Don't let audit logging failures break the application
            print(f"Failed to create audit log: {str(e)}")
            return None

    @staticmethod
    def _generate_description(
        action: AuditAction,
        resource_type: ResourceType,
        resource_identifier: Optional[str],
        username: Optional[str]
    ) -> str:
        """Generate a human-readable description"""
        user_str = username or "Unknown user"
        resource_str = resource_identifier or f"a {resource_type.value.lower()}"

        action_descriptions = {
            AuditAction.CREATE: f"{user_str} created {resource_str}",
            AuditAction.READ: f"{user_str} viewed {resource_str}",
            AuditAction.UPDATE: f"{user_str} updated {resource_str}",
            AuditAction.DELETE: f"{user_str} deleted {resource_str}",
            AuditAction.LOGIN: f"{user_str} logged in",
            AuditAction.LOGOUT: f"{user_str} logged out",
            AuditAction.EXPORT: f"{user_str} exported {resource_str}",
            AuditAction.IMPORT: f"{user_str} imported {resource_str}",
            AuditAction.APPROVE: f"{user_str} approved {resource_str}",
            AuditAction.REJECT: f"{user_str} rejected {resource_str}",
            AuditAction.ASSIGN: f"{user_str} assigned {resource_str}",
            AuditAction.UNASSIGN: f"{user_str} unassigned {resource_str}",
            AuditAction.OTHER: f"{user_str} performed action on {resource_str}"
        }

        return action_descriptions.get(action, action_descriptions[AuditAction.OTHER])

    @staticmethod
    async def get_logs(
        filter_params: AuditLogFilter,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "timestamp",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Get audit logs with filtering and pagination
        """
        db = await Database.get_db()

        # Build query
        query = {}

        if filter_params.user_id:
            query["user_id"] = filter_params.user_id
        if filter_params.username:
            query["username"] = {"$regex": filter_params.username, "$options": "i"}
        if filter_params.action:
            query["action"] = filter_params.action.value
        if filter_params.resource_type:
            query["resource_type"] = filter_params.resource_type.value
        if filter_params.resource_id:
            query["resource_id"] = filter_params.resource_id
        if filter_params.endpoint:
            query["endpoint"] = {"$regex": filter_params.endpoint, "$options": "i"}
        if filter_params.status_code:
            query["status_code"] = filter_params.status_code

        # Date range filter
        date_query = {}
        if filter_params.date_from:
            date_query["$gte"] = filter_params.date_from
        if filter_params.date_to:
            date_query["$lte"] = filter_params.date_to
        if date_query:
            query["timestamp"] = date_query

        # Count total
        total = await db.audit_logs.count_documents(query)

        # Sort
        sort_direction = -1 if sort_order.lower() == "desc" else 1

        # Get paginated results
        skip = (page - 1) * page_size
        cursor = db.audit_logs.find(query).sort(sort_by, sort_direction).skip(skip).limit(page_size)

        logs = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            logs.append(AuditLogResponse(**doc))

        total_pages = (total + page_size - 1) // page_size

        return {
            "logs": logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    @staticmethod
    async def get_log_by_id(log_id: str) -> Optional[AuditLogResponse]:
        """Get a specific audit log by ID"""
        db = await Database.get_db()

        try:
            doc = await db.audit_logs.find_one({"_id": ObjectId(log_id)})
            if doc:
                doc["id"] = str(doc.pop("_id"))
                return AuditLogResponse(**doc)
        except:
            pass

        return None

    @staticmethod
    async def get_summary(
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        user_id: Optional[str] = None
    ) -> AuditLogSummary:
        """Get summary statistics for audit logs"""
        db = await Database.get_db()

        query = {}
        if date_from or date_to:
            query["timestamp"] = {}
            if date_from:
                query["timestamp"]["$gte"] = date_from
            if date_to:
                query["timestamp"]["$lte"] = date_to
        if user_id:
            query["user_id"] = user_id

        # Total actions
        total_actions = await db.audit_logs.count_documents(query)

        # Actions by type
        actions_by_type = {}
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}}
        ]
        async for doc in db.audit_logs.aggregate(pipeline):
            actions_by_type[doc["_id"]] = doc["count"]

        # Actions by resource
        actions_by_resource = {}
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$resource_type", "count": {"$sum": 1}}}
        ]
        async for doc in db.audit_logs.aggregate(pipeline):
            actions_by_resource[doc["_id"]] = doc["count"]

        # Top users
        top_users = []
        pipeline = [
            {"$match": query},
            {"$group": {"_id": {"user_id": "$user_id", "username": "$username"}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        async for doc in db.audit_logs.aggregate(pipeline):
            top_users.append({
                "user_id": doc["_id"]["user_id"],
                "username": doc["_id"]["username"],
                "action_count": doc["count"]
            })

        return AuditLogSummary(
            total_actions=total_actions,
            actions_by_type=actions_by_type,
            actions_by_resource=actions_by_resource,
            top_users=top_users,
            period_start=date_from or datetime.utcnow(),
            period_end=date_to or datetime.utcnow()
        )

    @staticmethod
    async def get_user_activity(
        user_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get activity history for a specific user"""
        filter_params = AuditLogFilter(user_id=user_id)
        return await AuditService.get_logs(filter_params, page, page_size)

    @staticmethod
    async def get_resource_history(
        resource_type: ResourceType,
        resource_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get audit history for a specific resource"""
        filter_params = AuditLogFilter(
            resource_type=resource_type,
            resource_id=resource_id
        )
        return await AuditService.get_logs(filter_params, page, page_size)

    @staticmethod
    async def delete_old_logs(older_than_days: int = 365) -> int:
        """Delete audit logs older than specified days (for cleanup)"""
        db = await Database.get_db()

        cutoff_date = datetime.utcnow()
        cutoff_date = cutoff_date.replace(day=cutoff_date.day - older_than_days)

        result = await db.audit_logs.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })

        return result.deleted_count
