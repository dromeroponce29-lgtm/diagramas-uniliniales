"""Schemas para ItemCubicacion."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from ..models.cubicacion import FuenteItem, EstadoItem


class ItemCubicacionBase(BaseModel):
    partida: str
    sistema: str | None = None
    area: str | None = None
    descripcion: str
    unidad: str = "un"
    cantidad: float = 0
    factor_perdida: float = 0
    precio_unitario: float = 0
    hh_unitaria: float = 0
    fuente: FuenteItem = FuenteItem.manual
    confianza: str = "Media"
    norma_ref: str | None = None
    observacion: str | None = None


class ItemCubicacionCreate(ItemCubicacionBase):
    proyecto_id: int
    documento_id_origen: int | None = None
    pagina_origen: int | None = None
    creado_por: str = "usuario"
    estado: EstadoItem = EstadoItem.aprobado


class ItemCubicacionUpdate(BaseModel):
    partida: str | None = None
    sistema: str | None = None
    area: str | None = None
    descripcion: str | None = None
    unidad: str | None = None
    cantidad: float | None = None
    factor_perdida: float | None = None
    precio_unitario: float | None = None
    hh_unitaria: float | None = None
    fuente: FuenteItem | None = None
    confianza: str | None = None
    norma_ref: str | None = None
    observacion: str | None = None
    estado: EstadoItem | None = None


class ItemCubicacionOut(ItemCubicacionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proyecto_id: int
    documento_id_origen: int | None = None
    pagina_origen: int | None = None
    cantidad_final: float = 0
    total_material: float = 0
    estado: EstadoItem
    creado_por: str
    created_at: datetime
    updated_at: datetime
