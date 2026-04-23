import os
from dotenv import load_dotenv
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from database import get_db
from models import ClipboardHistory
from schemas import HistoryItemSchema, HistoryImportSchema
from services.history_service import save_or_update_history

load_dotenv()

router = APIRouter(prefix="/api/history", tags=["History"])

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


@router.post("/save")
def save_history_item(
    payload: HistoryItemSchema,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    item = save_or_update_history(db, user_id, payload)
    return {"message": "Saved", "id": item.id}


@router.post("/import")
def import_history(
    payload: HistoryImportSchema,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    for item in payload.items:
        save_or_update_history(db, user_id, item)

    return {"message": "Import complete", "count": len(payload.items)}


@router.get("")
def list_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    items = (
        db.query(ClipboardHistory)
        .filter(ClipboardHistory.user_id == user_id)
        .order_by(ClipboardHistory.id.desc())
        .all()
    )

    return [
        {
            "id": item.external_id,
            "text": item.text,
            "sourceUrl": item.source_url,
            "sourceTitle": item.source_title,
            "isPinned": item.is_pinned,
            "copyCount": item.copy_count,
            "createdAt": item.created_at,
            "updatedAt": item.updated_at,
        }
        for item in items
    ]