"""
AgenteChat — Conversación general con RAG sobre el proyecto.
"""
from typing import Any
from .base import BaseAgent, REGLAS_GLOBALES


class AgenteChat(BaseAgent):
    name = "chat"
    description = "Asistente Técnico Eléctrico IA — conversación general"
    requires_rag = True
    max_tokens = 2000

    @property
    def system_prompt(self) -> str:
        return f"""Eres el "Asistente Técnico Eléctrico IA" del sistema AEP-Eléctrico.

Tu rol: responder consultas técnicas del ingeniero responsable del proyecto, citando siempre las fuentes documentales cuando uses RAG.

{REGLAS_GLOBALES}

ESPECIALIDAD:
- Selección de conductores (cálculo de corriente, factor T y G, caída de tensión).
- Selección de canalizaciones (tipo, ocupación, accesorios).
- Tableros eléctricos (B.T. y M.T.).
- Puesta a tierra (mallas, electrodos, mediciones).
- Iluminación interior y exterior.
- Normativa RIC SEC Chile, NCh, IEC 60364, NFPA 70E (referencia).
- Revisión de bases técnicas y cumplimiento.
- Catálogos del mercado chileno.
- Estimación de presupuesto y HH.

ESTILO: profesional, técnico, en español de Chile. Conciso pero completo. Usa listas cuando ayuden."""

    def run(
        self,
        mensaje_usuario: str,
        historial: list[dict] | None = None,
        contexto_proyecto: dict | None = None,
        contexto_rag: str = "",
    ) -> dict[str, Any]:
        """
        Args:
            mensaje_usuario: pregunta actual del usuario.
            historial: lista de mensajes previos [{"role":"user|assistant","content":"..."}]
            contexto_proyecto: datos del proyecto activo.
            contexto_rag: chunks recuperados del RAG.
        """
        # Construir mensajes
        messages = list(historial or [])

        prefijo = ""
        if contexto_proyecto:
            prefijo += f"[Proyecto activo]\n{contexto_proyecto}\n\n"
        if contexto_rag:
            prefijo += f"[Contexto recuperado de documentos del proyecto]\n{contexto_rag}\n\n"

        messages.append({
            "role": "user",
            "content": f"{prefijo}[Consulta]\n{mensaje_usuario}",
        })

        response = self._call_claude(messages=messages)

        return {
            "answer": self.extract_text(response),
            "tokens_in": response.usage.input_tokens,
            "tokens_out": response.usage.output_tokens,
        }
