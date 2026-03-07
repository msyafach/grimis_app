from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationBase(BaseModel):
    title_first: str = Field(..., description="Main title or subject of the notification")
    title_second: str = Field(..., description="Description or secondary text of the notification")
    user_id: str = Field(..., description="ID of the user this notification belongs to")
    is_read: bool = Field(default=False, description="Whether the notification has been read")
    target_url: Optional[str] = Field(None, description="The URL or frontend path this notification should redirect to on click")

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    time_ago: Optional[str] = Field(None, description="Formatted time ago, e.g., '5 minutes ago', calculated on read")

class NotificationUpdate(BaseModel):
    is_read: bool
