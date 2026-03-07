from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from app.database import Database
from app.schemas.notification import NotificationResponse, NotificationUpdate
from app.api.v1.users import get_current_user
from bson import ObjectId

router = APIRouter()

def format_time_ago(dt: datetime) -> str:
    """Format datetime to relative time string (e.g., '5 minutes')"""
    if not dt:
        return ""
        
    now = datetime.now(timezone.utc)
    
    # Ensure dt is timezone aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
        
    diff = now - dt
    
    minutes = int(diff.total_seconds() / 60)
    
    if minutes < 1:
        return "Just now"
    if minutes == 1:
        return "1 min"
    if minutes < 60:
        return f"{minutes} mins"
    
    hours = int(minutes / 60)
    if hours == 1:
        return "1 hour"
    if hours < 24:
        return f"{hours} hours"
        
    days = int(hours / 24)
    if days == 1:
        return "1 day"
    return f"{days} days"

@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 10
):
    """
    Get notifications for the current user
    """
    db = await Database.get_db()
    
    user_id = current_user.get("id") or current_user.get("_id")
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {"user_id": {"$in": [user_id, user_id_obj, str(user_id)]}}
    except:
        query = {"user_id": user_id}
        
    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    notifications = await cursor.to_list(length=limit)
    
    result = []
    for notif in notifications:
        notif["id"] = str(notif.pop("_id"))
        
        # Ensure user_id is string for Pydantic schema
        if "user_id" in notif:
            notif["user_id"] = str(notif["user_id"])
        
        # Calculate time_ago for frontend
        dt = notif.get("created_at")
        if dt:
            notif["time_ago"] = format_time_ago(dt)
        else:
            notif["time_ago"] = "0"
            
        result.append(notif)
        
    return result

@router.put("/read-all", response_model=dict)
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user
    """
    db = await Database.get_db()
    
    user_id = current_user.get("id") or current_user.get("_id")
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {"user_id": {"$in": [user_id, user_id_obj, str(user_id)]}, "is_read": False}
    except:
        query = {"user_id": user_id, "is_read": False}
        
    result = await db.notifications.update_many(
        query,
        {"$set": {"is_read": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Marked {result.modified_count} notifications as read"}

@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a specific notification as read
    """
    db = await Database.get_db()
    
    try:
        obj_id = ObjectId(notification_id)
        user_id = current_user.get("id") or current_user.get("_id")
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {"_id": obj_id, "user_id": {"$in": [user_id, user_id_obj, str(user_id)]}}
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    notif = await db.notifications.find_one_and_update(
        query,
        {"$set": {"is_read": True, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif["id"] = str(notif.pop("_id"))
    
    if "user_id" in notif:
        notif["user_id"] = str(notif["user_id"])
        
    notif["time_ago"] = format_time_ago(notif.get("created_at"))
    
    return notif
