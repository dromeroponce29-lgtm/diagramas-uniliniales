"""Schemas Pydantic para Proyecto."""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Any


class ProyectoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    mandante: str | None = None
    ubicacion: str | None = None
    tipo: str | None = None
    disciplina: str | None = None
    fecha: str | None = None
    tension: float | None = 400
    frecuencia: int | None = 50
    potencia: float | None = None
    corriente: float | None = None
    tipo_carga: str | None = None
    ambiente: str | None = None
    temp_ambiente: float | None = 30
    metodo_instalacion: str | None = None
    marcas_permitidas: str | None = None
    restricciones: str | None = None
    normas: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)


class ProyectoCreate(ProyectoBase):
    pass


class ProyectoUpdate(ProyectoBase):
    nombre: str | None = None  # todos opcionales en update


class ProyectoOut(ProyectoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
