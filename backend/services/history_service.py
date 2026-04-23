from models import ClipboardHistory


def save_or_update_history(db, user_id, item):
    existing = (
        db.query(ClipboardHistory)
        .filter(
            ClipboardHistory.user_id == user_id,
            ClipboardHistory.text == item.text
        )
        .first()
    )

    if existing:
        existing.source_url = item.sourceUrl
        existing.source_title = item.sourceTitle
        existing.is_pinned = item.isPinned
        existing.copy_count = max((existing.copy_count or 1), (item.copyCount or 1))
        existing.updated_at = item.updatedAt
        if item.createdAt and not existing.created_at:
            existing.created_at = item.createdAt
        db.commit()
        db.refresh(existing)
        return existing

    new_item = ClipboardHistory(
        external_id=item.id,
        user_id=user_id,
        text=item.text,
        source_url=item.sourceUrl,
        source_title=item.sourceTitle,
        is_pinned=item.isPinned,
        copy_count=item.copyCount,
        created_at=item.createdAt,
        updated_at=item.updatedAt
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item