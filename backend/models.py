from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    histories = relationship("ClipboardHistory", back_populates="user", cascade="all, delete-orphan")


class ClipboardHistory(Base):
    __tablename__ = "clipboard_histories"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    source_url = Column(Text, nullable=True)
    source_title = Column(String(255), nullable=True)
    is_pinned = Column(Boolean, default=False)
    copy_count = Column(Integer, default=1)
    created_at = Column(String(255), nullable=True)
    updated_at = Column(String(255), nullable=True)

    user = relationship("User", back_populates="histories")


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    cloud_sync_enabled = Column(Boolean, default=True)
    max_items = Column(Integer, default=20)
    ignore_duplicates = Column(Boolean, default=True)
    blocked_domains = Column(Text, default="")