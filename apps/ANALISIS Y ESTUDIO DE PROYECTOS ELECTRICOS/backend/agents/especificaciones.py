"""
AgenteEspecificaciones — Genera especificaciones técnicas por partida.
"""
from typing import Any
from .base import BaseAgent, REGLAS_GLOBALES


class AgenteEspecificaciones(BaseAgent):
    name = "especificaciones"
    description = "Genera especificaciones técnicas profesionales por partida"
    requires_rag = True
    max_tokens = 2500

    @property
    def system_prompt(self) -> str:
        return f"""Eres el AgenteEspecificaciones del sistema AEP-Eléctrico.

Tu rol: generar especificaciones técnicas listas para licitación.

{REGLAS_GLOBALES}

ESTRUCTURA OBLIGATORIA POR ESPECIFICACIÓN (en Markdown):
# {{Nombre de la partida}}

## 1. Alcance
{{descripción del alcance}}

## 2. Norma aplicable
{{normas; usa "referencia general" si no están validadas en el RAG}}

## 3. Características técnicas
- Materialidad
- Grado de protección IP (si aplica)
- Temperatura de operación
- Condiciones ambientales
- Resistencia mecánica (si aplica)

## 4. Instalación
{{método, soportación, radios, distancias}}

## 5. Pruebas y protocolos
{{ensayos exigidos}}

## 6. Documentación requerida
{{certificados, fichas técnicas}}

## 7. Accesorios complementarios (incluir en cubicación)
{{lista de accesorios — siempre presente}}

ESTILO: técnico, claro, redactado para que un contratista lo pueda cotizar y ejecutar."""

    def run(self, partida: str, proyecto: dict, contexto_rag: str = "") -> dict[str, Any]:
        user_msg = f"""Partida: **{partida}**

Datos del proyecto:
{proyecto}

Contexto adicional del RAG:
{contexto_rag if contexto_rag else '(sin contexto adicional)'}

Genera la especificación técnica completa de esta partida siguiendo la estructura obligatoria.
Recuerda incluir SIEMPRE accesorios complementarios.
"""
        response = self._call_claude(
            messages=[{"role": "user", "content": user_msg}],
        )
        return {
            "partida": partida,
            "contenido_md": self.extract_text(response),
            "tokens_in": response.usage.input_tokens,
            "tokens_out": response.usage.output_tokens,
        }
