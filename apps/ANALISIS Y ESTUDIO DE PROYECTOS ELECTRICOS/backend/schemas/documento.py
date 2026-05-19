"""Schemas para Documento."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any
from ..models.documento import EstadoDocumento


class DocumentoListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo: str
    tamano_kb: int
    estado: EstadoDocumento
    uploaded_at: datetime
    processed_at: datetime | None = None


class DocumentoOut(DocumentoListItem):
    proyecto_id: int
    storage_path: str
    error: str | None = None
    contenido_estructurado: dict[str, Any] | None = None
    metadatos: dict[str, Any] | None = None
