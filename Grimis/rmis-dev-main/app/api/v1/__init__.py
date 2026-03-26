from fastapi import APIRouter
from .users import router as users_router
from .instansi import router as instansi_router
from .induk_unit_kerja import router as induk_unit_kerja_router
from .struktur_organisasi import router as struktur_organisasi_router
from .kategori_risiko import router as kategori_risiko_router
from .jenis_penyebab import router as jenis_penyebab_router
from .jenis_konteks import router as jenis_konteks_router
from .konteks import router as konteks_router
from .indikator import router as indikator_router
from .kamus_risiko import router as kamus_risiko_router
from .identifikasi_risiko import router as identifikasi_risiko_router
from .komentar import router as komentar_router
from .analisis_risiko import router as analisis_risiko_router
from .kriteria_risiko import router as kriteria_risiko_router
from .evaluasi_risiko import router as evaluasi_risiko_router
from .approval import router as approval_router
from .monitoring_risiko import router as monitoring_risiko_router
from .rtp import router as rtp_router
from .health import router as health_router
from .dashboard import router as dashboard_router
from .laporan_kejadian import router as laporan_kejadian_router
from .notifications import router as notifications_router
from .groups import router as groups_router
from .audit_trail import router as audit_trail_router
from app.api.v1 import (
    bagan_risiko,
    metode_spip,
    peta_risiko,
    pelaporan_risiko,
    export
)
from .role_permissions import router as role_permissions_router

# ... other imports ...

api_router = APIRouter()

# Register health check router
api_router.include_router(health_router, prefix="/health", tags=["Health"])

# Register dashboard router
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

# Register all routers
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(instansi_router, prefix="/instansi", tags=["Instansi"])
api_router.include_router(
    induk_unit_kerja_router, 
    prefix="/induk-unit-kerja", 
    tags=["Induk Unit Kerja"]
)
api_router.include_router(
    struktur_organisasi_router, 
    prefix="/struktur-organisasi", 
    tags=["Struktur Organisasi"]
)
api_router.include_router(
    kategori_risiko_router, 
    prefix="/kategori-risiko", 
    tags=["Kategori Risiko"]
)
api_router.include_router(
    jenis_penyebab_router,
    prefix="/jenis-penyebab",
    tags=["Jenis Penyebab"]
)
api_router.include_router(
    jenis_konteks_router,
    prefix="/jenis-konteks",
    tags=["Jenis Konteks"]
)
api_router.include_router(
    konteks_router,
    prefix="/konteks",
    tags=["Konteks"]
)
api_router.include_router(
    indikator_router,
    prefix="/indikator",
    tags=["Indikator"]
)
api_router.include_router(
    kamus_risiko_router,
    prefix="/kamus-risiko",
    tags=["Kamus Risiko"]
)

api_router.include_router(bagan_risiko.router, prefix="/bagan-risiko", tags=["bagan-risiko"])
api_router.include_router(metode_spip.router, prefix="/metode-spip", tags=["metode-spip"])

api_router.include_router(
    identifikasi_risiko_router,
    prefix="/identifikasi-risiko",
    tags=["Identifikasi Risiko"]
)
api_router.include_router(
    komentar_router,
    prefix="/komentar",
    tags=["Komentar"]
)
api_router.include_router(kriteria_risiko_router, prefix="/kriteria-risiko", tags=["Risk Criteria"])

api_router.include_router(
    analisis_risiko_router,
    prefix="/analisis-risiko",
    tags=["Analisis-risiko"]
)

api_router.include_router(
    evaluasi_risiko_router,
    prefix="/evaluasi-risiko",
    tags=["Evaluasi-risiko"]
)

api_router.include_router(
    approval_router,
    prefix="/approval",
    tags=["Approval"]
)

api_router.include_router(
    monitoring_risiko_router,
    prefix="/monitoring-risiko",
    tags=["Monitoring"]
)

api_router.include_router(
    rtp_router,
    prefix="/rtp",
    tags=["RTP"]
)

api_router.include_router(
    peta_risiko.router,
    prefix="/peta-risiko",
    tags=["Peta Risiko"]
)

# Register laporan kejadian router
api_router.include_router(
    laporan_kejadian_router,
    prefix="/laporan-kejadian",
    tags=["Laporan Kejadian"]
)

# Register pelaporan risiko router
api_router.include_router(
    pelaporan_risiko.router,
    prefix="/pelaporan-risiko",
    tags=["Pelaporan Risiko"]
)

api_router.include_router(
    export.router,
    prefix="/export",
    tags=["Export"]
)

api_router.include_router(
    notifications_router,
    prefix="/notifications",
    tags=["Notifications"]
)

# Register groups router (Group-based Access Control)
api_router.include_router(
    groups_router,
    prefix="/groups",
    tags=["Groups"]
)

# Register role permissions router (Manage permissions for built-in Peran)
api_router.include_router(
    role_permissions_router,
    prefix="/roles",
    tags=["Roles"]
)

# Register audit trail router (Audit logging like AWS CloudTrail)
api_router.include_router(
    audit_trail_router,
    prefix="/audit-trail",
    tags=["Audit Trail"]
)

# ... other routers ... 