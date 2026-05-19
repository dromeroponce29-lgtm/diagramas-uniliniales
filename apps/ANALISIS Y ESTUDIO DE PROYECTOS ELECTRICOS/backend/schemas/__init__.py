"""Schemas Pydantic para request/response de la API."""
from .proyecto import ProyectoCreate, ProyectoUpdate, ProyectoOut
from .documento import DocumentoOut, DocumentoListItem
from .cubicacion import ItemCubicacionCreate, ItemCubicacionUpdate, ItemCubicacionOut
from .chat import ChatRequest, ChatResponse, ChatMessage
from .common import HealthOut, AgentRunOut

__all__ = [
    "ProyectoCreate", "ProyectoUpdate", "ProyectoOut",
    "DocumentoOut", "DocumentoListItem",
    "ItemCubicacionCreate", "ItemCubicacionUpdate", "ItemCubicacionOut",
    "ChatRequest", "ChatResponse", "ChatMessage",
    "HealthOut", "AgentRunOut",
]
