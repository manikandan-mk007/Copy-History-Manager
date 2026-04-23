import os
from dotenv import load_dotenv
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from database import get_db
from models import UserSetting
from schemas import SettingsSchema

load_dotenv()

router = APIRouter(prefix="/api/settings", tags=["Settings"])

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def get_current_user_id(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        return int(user_id)
    except (JWTError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    settings = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()

    if not settings:
        return {
            "cloud_sync_enabled": True,
            "max_items": 20,
            "ignore_duplicates": True,
            "blocked_domains": ""
        }

    return {
        "cloud_sync_enabled": settings.cloud_sync_enabled,
        "max_items": settings.max_items,
        "ignore_duplicates": settings.ignore_duplicates,
        "blocked_domains": settings.blocked_domains
    }


@router.post("")
def save_settings(
    payload: SettingsSchema,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    settings = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()

    if not settings:
        settings = UserSetting(user_id=user_id)
        db.add(settings)

    settings.cloud_sync_enabled = payload.cloud_sync_enabled
    settings.max_items = payload.max_items
    settings.ignore_duplicates = payload.ignore_duplicates
    settings.blocked_domains = payload.blocked_domains

    db.commit()
    return {"message": "Settings saved"}