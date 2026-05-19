"""Schemas del chat IA."""
from pydantic import BaseModel
from datetime import datetime
from typing import Any


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    proyecto_id: int
    message: str
    use_rag: bool = True
    agent: str = "general"  # general | cubicador | normativo | especificaciones | catalogos


class FuenteCitada(BaseModel):
    documento_id: int
    documento_nombre: str
    chunk_id: int
    pagina: int | None = None
    score: float


class ChatResponse(BaseModel):
    answer: str
    agent_used: str
    fuentes: list[FuenteCitada] = []
    tokens_in: int = 0
    tokens_out: int = 0
    created_at: datetime
