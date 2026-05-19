"""Endpoint de salud."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..config import settings
from ..schemas import HealthOut

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return HealthOut(
        status="ok",
        version=settings.app_version,
        db_ok=db_ok,
        anthropic_configured=bool(settings.anthropic_api_key),
        voyage_configured=bool(settings.voyage_api_key),
    )
