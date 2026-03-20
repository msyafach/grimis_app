from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.middleware.audit_middleware import AuditLogMiddleware

app = FastAPI(
    title="Risk Management API",
    description="API for Risk Management System",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Add Audit Log middleware (captures all API requests like AWS CloudTrail)
app.add_middleware(AuditLogMiddleware)

app.include_router(api_router, prefix="/api/v1") 