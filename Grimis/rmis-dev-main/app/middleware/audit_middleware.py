"""
FastAPI middleware for audit logging
Captures all API requests and logs them
"""
import json
import asyncio
from typing import Optional, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.services.audit_service import AuditService
from app.schemas.audit_log import AuditAction, ResourceType
from app.utils.auth import validate_token


class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically logs all API requests
    Similar to AWS CloudTrail
    """

    # Endpoints to exclude from audit logging (health checks, etc.)
    EXCLUDED_PATHS = [
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico",
        "/static"
    ]

    # Sensitive fields to redact from logs
    SENSITIVE_FIELDS = ["password", "token", "secret", "credit_card", "ssn"]

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    def _should_log(self, path: str) -> bool:
        """Check if the request should be logged"""
        for excluded in self.EXCLUDED_PATHS:
            if path.startswith(excluded):
                return False
        return True

    def _redact_sensitive_data(self, data: dict) -> dict:
        """Redact sensitive fields from logged data"""
        if not isinstance(data, dict):
            return data

        redacted = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in self.SENSITIVE_FIELDS):
                redacted[key] = "***REDACTED***"
            elif isinstance(value, dict):
                redacted[key] = self._redact_sensitive_data(value)
            elif isinstance(value, list):
                redacted[key] = [
                    self._redact_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                redacted[key] = value
        return redacted

    def _determine_resource_type(self, path: str, method: str) -> ResourceType:
        """Determine the resource type based on the endpoint path"""
        path_lower = path.lower()

        if "/users" in path_lower or "/register" in path_lower:
            return ResourceType.USER
        elif "/groups" in path_lower:
            return ResourceType.GROUP
        elif "/instansi" in path_lower:
            return ResourceType.INSTANSI
        elif "/induk-unit-kerja" in path_lower:
            return ResourceType.INDUK_UNIT_KERJA
        elif "/struktur-organisasi" in path_lower:
            return ResourceType.STRUKTUR_ORGANISASI
        elif "/identifikasi-risiko" in path_lower:
            return ResourceType.IDENTIFIKASI_RISIKO
        elif "/analisis-risiko" in path_lower:
            return ResourceType.ANALISIS_RISIKO
        elif "/evaluasi-risiko" in path_lower:
            return ResourceType.EVALUASI_RISIKO
        elif "/rtp" in path_lower:
            return ResourceType.RTP
        elif "/monitoring" in path_lower:
            return ResourceType.MONITORING
        elif "/kamus-risiko" in path_lower:
            return ResourceType.KAMUS_RISIKO
        elif "/kategori-risiko" in path_lower:
            return ResourceType.KATEGORI_RISIKO
        elif "/kriteria-risiko" in path_lower:
            return ResourceType.KRITERIA_RISIKO
        elif "/bagan-risiko" in path_lower:
            return ResourceType.BAGAN_RISIKO
        elif "/konteks" in path_lower:
            return ResourceType.KONTEKS
        elif "/indikator" in path_lower:
            return ResourceType.INDIKATOR
        elif "/laporan-kejadian" in path_lower:
            return ResourceType.LAPORAN_KEJADIAN
        elif "/approval" in path_lower:
            return ResourceType.APPROVAL
        elif "/settings" in path_lower:
            return ResourceType.SETTINGS
        else:
            return ResourceType.OTHER

    def _determine_action(self, method: str, path: str, status_code: int) -> AuditAction:
        """Determine the action type based on HTTP method"""
        # Check for specific actions in path
        if "/approve" in path.lower():
            return AuditAction.APPROVE
        elif "/reject" in path.lower():
            return AuditAction.REJECT
        elif "/export" in path.lower():
            return AuditAction.EXPORT
        elif "/import" in path.lower():
            return AuditAction.IMPORT
        elif "/assign" in path.lower():
            return AuditAction.ASSIGN

        # Determine by HTTP method
        if method == "POST":
            return AuditAction.CREATE
        elif method == "GET":
            return AuditAction.READ
        elif method == "PUT" or method == "PATCH":
            return AuditAction.UPDATE
        elif method == "DELETE":
            return AuditAction.DELETE
        else:
            return AuditAction.OTHER

    def _extract_resource_id(self, path: str) -> Optional[str]:
        """Try to extract resource ID from path"""
        import re
        # Match UUID or MongoDB ObjectId patterns in the path
        patterns = [
            r'/([0-9a-f]{24})/?',  # MongoDB ObjectId (24 hex chars)
            r'/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?',  # UUID
        ]
        for pattern in patterns:
            match = re.search(pattern, path, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and log it"""
        path = request.url.path

        # Skip excluded paths
        if not self._should_log(path):
            return await call_next(request)

        # Get request details
        method = request.method
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Try to get current user info from token
        user_id = None
        username = None
        user_role = None

        try:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                user = await validate_token(token)
                if user:
                    user_id = user.get("id")
                    username = user.get("username")
                    user_role = user.get("role")
        except:
            pass  # User not authenticated or invalid token

        # Process the request FIRST - let the endpoint handle the body
        response = await call_next(request)
        status_code = response.status_code

        # Determine action and resource type
        action = self._determine_action(method, path, status_code)
        resource_type = self._determine_resource_type(path, method)
        resource_id = self._extract_resource_id(path)

        # Build details from query params only (not body, to avoid consuming stream)
        details = {
            "query_params": str(request.query_params) if request.query_params else None
        }

        # Log the action (fire and forget - don't wait for it)
        asyncio.create_task(AuditService.log_action(
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=None,  # Cannot extract without reading body
            endpoint=path,
            method=method,
            ip_address=client_ip,
            user_agent=user_agent,
            status_code=status_code,
            details=details
        ))

        return response
