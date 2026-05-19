"""Schemas comunes."""
from pydantic import BaseModel
from typing import Any


class HealthOut(BaseModel):
    status: str
    version: str
    db_ok: bool
    anthropic_configured: bool
    voyage_configured: bool


class AgentRunOut(BaseModel):
    agent: str
    success: bool
    items_creados: int = 0
    items_propuestos: int = 0
    mensaje: str | None = None
    detalle: dict[str, Any] | None = None
