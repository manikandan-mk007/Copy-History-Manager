from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class RegisterSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)


class LoginSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"


class HistoryItemSchema(BaseModel):
    id: str
    text: str
    sourceUrl: Optional[str] = ""
    sourceTitle: Optional[str] = ""
    isPinned: Optional[bool] = False
    copyCount: Optional[int] = 1
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class HistoryImportSchema(BaseModel):
    items: List[HistoryItemSchema]


class SettingsSchema(BaseModel):
    cloud_sync_enabled: bool = True
    max_items: int = 20
    ignore_duplicates: bool = True
    blocked_domains: str = ""