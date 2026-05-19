"""
AgenteNormativoRIC — Audita el diseño contra normativa chilena.

REGLA CRÍTICA: este agente NO inventa artículos RIC. Si la referencia no
está en el RAG (documentos cargados al proyecto), el estado se marca como
"Requiere validación" y el campo "articulo" queda vacío.
"""
from typing import Any
from .base import BaseAgent, REGLAS_GLOBALES


TOOL_NORMATIVA = {
    "name": "registrar_matriz_normativa",
    "description": "Registra la matriz de cumplimiento normativo del proyecto.",
    "input_schema": {
        "type": "object",
        "properties": {
            "requisitos": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "requisito":  {"type": "string"},
                        "norma_ref":  {"type": "string", "description": "Norma referencial (RIC SEC ref., NCh, IEC, etc.)"},
                        "articulo":   {"type": "string", "description": "Artículo específico SOLO si tienes evidencia en el RAG. Si no, vacío."},
                        "estado":     {"type": "string", "enum": ["Cumple", "No cumple", "Requiere validación", "No aplica"]},
                        "evidencia":  {"type": "string", "description": "Texto/cita que respalda el estado."},
                        "observacion":{"type": "string"},
                    },
                    "required": ["requisito", "estado"],
                },
            },
            "brechas_criticas": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Brechas que requieren atención inmediata del ingeniero responsable."
            },
        },
        "required": ["requisitos"],
    },
}


class AgenteNormativo(BaseAgent):
    name = "normativo"
    description = "Audita cumplimiento normativo RIC SEC y normas asociadas"
    requires_rag = True
    max_tokens = 3000

    @property
    def system_prompt(self) -> str:
        return f"""Eres el AgenteNormativoRIC del sistema AEP-Eléctrico, especialista en normativa eléctrica chilena.

Tu rol: revisar el diseño y los antecedentes del proyecto, y construir una matriz de cumplimiento normativo.

{REGLAS_GLOBALES}

REGLAS NORMATIVAS ESPECÍFICAS:
- NUNCA inventes artículos específicos del RIC SEC, NCh, IEC u otro. Si no tienes el documento cargado en el RAG, marca "Requiere validación" y deja el campo `articulo` VACÍO.
- Cita el chunk/documento exacto cuando uses una referencia validada.
- Cubre AL MENOS estas categorías: canalizaciones, conductores, protecciones, puesta a tierra, rotulación, iluminación de emergencia, certificación de tableros, pruebas y protocolos, distancias eléctricas, sellos cortafuego.
- Si una norma es "referencia general" (no validada), márcalo expresamente en el campo `observacion`.

Llama OBLIGATORIAMENTE a la herramienta `registrar_matriz_normativa`."""

    def run(self, proyecto: dict, cubicacion: list[dict], contexto_rag: str = "") -> dict[str, Any]:
        user_msg = f"""DATOS DEL PROYECTO:
{proyecto}

CUBICACIÓN ACTUAL (extracto):
{cubicacion[:50]}

CONTEXTO NORMATIVO DEL RAG:
{contexto_rag if contexto_rag else '(sin RAG normativo cargado — todas las referencias deben marcarse como "Requiere validación")'}

INSTRUCCIONES:
Genera la matriz de cumplimiento normativo del proyecto.
RECUERDA: no inventes artículos. Si no tienes evidencia documental, "Requiere validación".
Llama a la herramienta `registrar_matriz_normativa`."""

        response = self._call_claude(
            messages=[{"role": "user", "content": user_msg}],
            tools=[TOOL_NORMATIVA],
        )

        resultado = self.extract_tool_use(response, "registrar_matriz_normativa")
        return {
            "requisitos": resultado.get("requisitos", []) if resultado else [],
            "brechas_criticas": resultado.get("brechas_criticas", []) if resultado else [],
            "tokens_in": response.usage.input_tokens,
            "tokens_out": response.usage.output_tokens,
        }
