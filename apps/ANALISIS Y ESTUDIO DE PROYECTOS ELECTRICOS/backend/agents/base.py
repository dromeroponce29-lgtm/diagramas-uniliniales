"""
BaseAgent — clase base para todos los agentes IA del sistema.

Cada agente declara:
  - name:           identificador
  - system_prompt:  prompt de sistema con su rol
  - requires_rag:   si necesita inyección RAG automática
  - model:          modelo Claude a usar (default sonnet)

Implementa run(input, context) que devuelve un dict con la respuesta estructurada.

Diseño con tenacity para reintentos y logging estructurado.
"""
from typing import Any
import json
import logging
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

log = logging.getLogger("agents")

# Cliente Anthropic compartido
_client: Anthropic | None = None


def get_anthropic_client() -> Anthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY no configurada. "
                "Setea la variable en .env antes de usar agentes IA."
            )
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


# Prompt base — reglas compartidas por todos los agentes
REGLAS_GLOBALES = """REGLAS GLOBALES INNEGOCIABLES:
1. NUNCA inventes artículos específicos de RIC SEC, NCh u otra normativa si no tienes el documento normativo cargado al proyecto. Marca toda referencia normativa no validada como "referencia general".
2. Toda recomendación de cantidad debe declarar fuente: plano, base técnica, planilla, estimado, manual o catálogo.
3. Toda cantidad estimada debe marcarse con nivel de confianza: Alta, Media o Baja.
4. SIEMPRE incluye accesorios complementarios al material principal:
   - Canalización → ducto + curvas + coplas + cajas de paso + soportes + abrazaderas + prensas + fijaciones + misceláneos.
   - Conductor → terminales + identificación + conectores + prensaestopas + amarras + canalización asociada + pruebas.
   - Tablero → gabinete + protecciones + barras + bornes + rotulación + canaletas + peines + cableado + pruebas.
   - Puesta a tierra → conductor + barras + electrodos + uniones + soldadura exotérmica + cámaras + medición + protocolo.
5. Sé conciso, técnico, profesional. Responde en español de Chile.
6. Si te falta información, declara la brecha explícitamente en lugar de inventar."""


class BaseAgent:
    name: str = "base"
    description: str = "Agente base"
    requires_rag: bool = False
    model: str = settings.anthropic_model
    max_tokens: int = 2000

    @property
    def system_prompt(self) -> str:
        raise NotImplementedError("Cada agente debe definir su system_prompt")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def _call_claude(
        self,
        messages: list[dict],
        max_tokens: int | None = None,
        tools: list[dict] | None = None,
    ) -> Any:
        """Llamada a Claude con retries automáticos."""
        client = get_anthropic_client()
        params = {
            "model": self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "system": self.system_prompt,
            "messages": messages,
        }
        if tools:
            params["tools"] = tools

        response = client.messages.create(**params)
        log.info(
            "agent_call",
            extra={
                "agent": self.name,
                "tokens_in": response.usage.input_tokens,
                "tokens_out": response.usage.output_tokens,
            },
        )
        return response

    def extract_text(self, response) -> str:
        """Extrae el texto principal de la respuesta de Claude."""
        for block in response.content:
            if getattr(block, "type", "") == "text":
                return block.text
        return ""

    def extract_tool_use(self, response, tool_name: str) -> dict | None:
        """Extrae el input de un tool_use específico."""
        for block in response.content:
            if getattr(block, "type", "") == "tool_use" and block.name == tool_name:
                return block.input
        return None

    def run(self, *args, **kwargs) -> dict[str, Any]:
        raise NotImplementedError
