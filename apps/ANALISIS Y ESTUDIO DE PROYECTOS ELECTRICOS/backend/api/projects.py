"""CRUD de proyectos."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import Proyecto
from ..schemas import ProyectoCreate, ProyectoUpdate, ProyectoOut

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProyectoOut, status_code=status.HTTP_201_CREATED)
def crear_proyecto(data: ProyectoCreate, db: Session = Depends(get_db)):
    p = Proyecto(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=list[ProyectoOut])
def listar_proyectos(db: Session = Depends(get_db)):
    return db.execute(select(Proyecto).order_by(Proyecto.updated_at.desc())).scalars().all()


@router.get("/{proyecto_id}", response_model=ProyectoOut)
def obtener_proyecto(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    return p


@router.put("/{proyecto_id}", response_model=ProyectoOut)
def actualizar_proyecto(proyecto_id: int, data: ProyectoUpdate, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{proyecto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_proyecto(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    db.delete(p)
    db.commit()
    return None
