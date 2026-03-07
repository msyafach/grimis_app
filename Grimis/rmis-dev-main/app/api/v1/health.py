from fastapi import APIRouter, Depends
from datetime import datetime
from app.database import Database

router = APIRouter()

@router.get("", status_code=200)
async def health_check():
    """
    Health check endpoint untuk memeriksa status aplikasi.
    Ini digunakan oleh Render untuk menentukan apakah aplikasi berjalan dengan baik.
    """
    # Check if application is running
    status = "ok"
    db_status = "unknown"
    
    # Try to connect to database
    try:
        db = await Database.get_db()
        # Simple database ping
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        # Even if DB connection fails, we still return 200
        # so Render won't restart the service, but we report the issue
    
    return {
        "status": status,
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    } 