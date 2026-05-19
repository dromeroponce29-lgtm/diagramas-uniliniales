"""
Agentes IA del sistema AEP-Eléctrico.

Cada agente es una clase con un system_prompt especializado y un método run().
Todos heredan de BaseAgent.

Para añadir un nuevo agente:
  1. Crear archivo en este directorio.
  2. Heredar de BaseAgent.
  3. Definir name, description, system_prompt y run().
  4. Exportar aquí.
"""
from .base import BaseAgent, REGLAS_GLOBALES, get_anthropic_client
from .cubicador import AgenteCubicador
from .normativo import AgenteNormativo
from .especificaciones import AgenteEspecificaciones
from .chat import AgenteChat

# Registro de agentes disponibles para selección dinámica en /api/chat
REGISTRO = {
    "cubicador": AgenteCubicador,
    "normativo": AgenteNormativo,
    "especificaciones": AgenteEspecificaciones,
    "chat": AgenteChat,
    "general": AgenteChat,  # alias por compatibilidad
}


def get_agent(name: str) -> BaseAgent:
    """Instancia un agente por nombre."""
    cls = REGISTRO.get(name)
    if cls is None:
        raise ValueError(f"Agente desconocido: {name}. Disponibles: {list(REGISTRO.keys())}")
    return cls()


__all__ = [
    "BaseAgent", "REGLAS_GLOBALES", "get_anthropic_client",
    "AgenteCubicador", "AgenteNormativo", "AgenteEspecificaciones", "AgenteChat",
    "REGISTRO", "get_agent",
]
