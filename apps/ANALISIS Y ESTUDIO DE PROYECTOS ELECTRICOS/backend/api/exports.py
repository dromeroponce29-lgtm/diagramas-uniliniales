"""
Endpoints de exportación: XLSX, PDF, DOCX.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from pathlib import Path
from datetime import datetime
from ..database import get_db
from ..models import Proyecto, ItemCubicacion, RequisitoNormativo, Riesgo, Especificacion
from ..config import settings
from ..exporters import exportar_xlsx, exportar_pdf, exportar_docx

router = APIRouter(prefix="/api/projects", tags=["exports"])


def _proyecto_dict(p: Proyecto) -> dict:
    return {c.name: getattr(p, c.name) for c in p.__table__.columns}


def _items(db, proyecto_id: int) -> list[dict]:
    items = db.execute(
        select(ItemCubicacion).where(ItemCubicacion.proyecto_id == proyecto_id)
    ).scalars().all()
    return [{c.name: getattr(it, c.name) for c in it.__table__.columns} for it in items]


def _normativa(db, proyecto_id: int) -> list[dict]:
    rows = db.execute(
        select(RequisitoNormativo).where(RequisitoNormativo.proyecto_id == proyecto_id)
    ).scalars().all()
    return [{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows]


def _riesgos(db, proyecto_id: int) -> list[dict]:
    rows = db.execute(
        select(Riesgo).where(Riesgo.proyecto_id == proyecto_id)
    ).scalars().all()
    return [{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows]


def _especs(db, proyecto_id: int) -> list[dict]:
    rows = db.execute(
        select(Especificacion).where(Especificacion.proyecto_id == proyecto_id)
    ).scalars().all()
    return [{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows]


@router.post("/{proyecto_id}/export/xlsx")
def export_xlsx(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out = settings.storage_path / f"proyecto_{proyecto_id}" / f"AEP_{p.id}_{ts}.xlsx"
    out.parent.mkdir(parents=True, exist_ok=True)
    exportar_xlsx(
        proyecto=_proyecto_dict(p),
        cubicacion=_items(db, proyecto_id),
        normativa=_normativa(db, proyecto_id),
        riesgos=_riesgos(db, proyecto_id),
        config=p.config or {},
        output_path=out,
    )
    return FileResponse(
        path=str(out),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=out.name,
    )


@router.post("/{proyecto_id}/export/pdf")
def export_pdf(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out = settings.storage_path / f"proyecto_{proyecto_id}" / f"AEP_{p.id}_{ts}.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    exportar_pdf(
        proyecto=_proyecto_dict(p),
        cubicacion=_items(db, proyecto_id),
        normativa=_normativa(db, proyecto_id),
        riesgos=_riesgos(db, proyecto_id),
        config=p.config or {},
        especificaciones=_especs(db, proyecto_id),
        output_path=out,
    )
    return FileResponse(path=str(out), media_type="application/pdf", filename=out.name)


@router.post("/{proyecto_id}/export/docx")
def export_docx(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out = settings.storage_path / f"proyecto_{proyecto_id}" / f"AEP_{p.id}_EETT_{ts}.docx"
    out.parent.mkdir(parents=True, exist_ok=True)
    exportar_docx(
        proyecto=_proyecto_dict(p),
        especificaciones=_especs(db, proyecto_id),
        output_path=out,
    )
    return FileResponse(
        path=str(out),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=out.name,
    )
