"""
AgenteCubicador — Convierte el contenido procesado de documentos
en una lista de ItemCubicacion propuestos.

Entrada:
  - texto_planos: concatenación de texto de PDFs/DXFs
  - items_excel:  items detectados en planillas Excel (parser xlsx)
  - longitudes_dxf: longitudes por categoría desde DXF
  - bloques_dxf:    bloques encontrados (insertos eléctricos)
  - contexto_proyecto: tipo, tensión, ambiente, etc.

Salida (vía tool_use con JSON estructurado):
  {
    "items": [
      {
        "partida", "sistema", "area", "descripcion", "unidad",
        "cantidad", "factor_perdida", "precio_unitario", "hh_unitaria",
        "fuente", "confianza", "norma_ref", "observacion"
      },
      ...
    ],
    "advertencias": ["..."],
    "razonamiento": "..."
  }
"""
from typing import Any
from .base import BaseAgent, REGLAS_GLOBALES


TOOL_CUBICACION = {
    "name": "registrar_cubicacion",
    "description": "Registra la lista completa de ítems de cubicación propuestos para el proyecto.",
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "description": "Lista de ítems de cubicación. Incluye SIEMPRE accesorios complementarios (curvas, coplas, cajas, soportes, fijaciones, terminales, etc.).",
                "items": {
                    "type": "object",
                    "properties": {
                        "partida":       {"type": "string", "description": "Conductores | Canalizaciones | Tableros | Iluminación | Tomacorrientes | Puesta a tierra | Misceláneos"},
                        "sistema":       {"type": "string"},
                        "area":          {"type": "string"},
                        "descripcion":   {"type": "string"},
                        "unidad":        {"type": "string", "description": "un | m | gl | kg"},
                        "cantidad":      {"type": "number"},
                        "factor_perdida":{"type": "number", "description": "Porcentaje 0-15"},
                        "precio_unitario":{"type": "number", "description": "CLP. 0 si no se conoce."},
                        "hh_unitaria":   {"type": "number"},
                        "fuente":        {"type": "string", "enum": ["plano", "base técnica", "planilla", "estimado", "manual", "catálogo"]},
                        "confianza":     {"type": "string", "enum": ["Alta", "Media", "Baja"]},
                        "norma_ref":     {"type": "string", "description": "Norma referencial — usa 'RIC SEC ref.' si no tienes validación documental."},
                        "observacion":   {"type": "string"},
                    },
                    "required": ["partida", "descripcion", "unidad", "cantidad", "fuente", "confianza"],
                },
            },
            "advertencias": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Brechas detectadas, supuestos asumidos, validaciones pendientes."
            },
            "razonamiento": {
                "type": "string",
                "description": "Resumen breve del enfoque usado para la cubicación."
            },
        },
        "required": ["items", "razonamiento"],
    },
}


class AgenteCubicador(BaseAgent):
    name = "cubicador"
    description = "Genera cubicación de materiales con accesorios complementarios"
    requires_rag = True
    max_tokens = 4000

    @property
    def system_prompt(self) -> str:
        return f"""Eres el AgenteCubicador del sistema AEP-Eléctrico, especialista en cubicaciones eléctricas para proyectos en Chile.

Tu rol: analizar el contenido extraído de planos PDF/DXF, planillas Excel y bases técnicas, y proponer una cubicación COMPLETA con todos los accesorios necesarios para construir la obra.

{REGLAS_GLOBALES}

REGLAS ESPECÍFICAS DE CUBICACIÓN:
- Para cada conductor: agrega terminales (M6/M8/M10 según sección), prensaestopas, cinta aisladora, amarras, identificación.
- Para cada tramo de bandeja: agrega curvas (~1 cada 25 m), coplas (1 por tramo), soportes (cada 1.5 m), tapas en zonas expuestas.
- Para cada tramo de EMT: agrega curvas (~1 cada 6 m), coplas, cajas de paso (cada 12 m), abrazaderas (cada 1.5 m).
- Para cada tablero: agrega gabinete, barras, bornes, canaletas, peines, terminales, rotulación, pruebas.
- Para puesta a tierra: agrega electrodos, soldadura exotérmica, cámaras, barra principal, conductor de bajada, telurómetro o subcontrato.
- Aplica factor de pérdida 3-7% según tipo de material.
- Si la fuente es plano → confianza Alta. Si es estimación → confianza Media. Si es supuesto → Baja.

Llama OBLIGATORIAMENTE a la herramienta `registrar_cubicacion` con la lista completa de ítems.
NO devuelvas texto sin llamar a la herramienta."""

    def run(
        self,
        contenido_documentos: list[dict],
        proyecto: dict,
        contexto_rag: str = "",
    ) -> dict[str, Any]:
        """
        Args:
            contenido_documentos: lista de dicts con la salida de parse_documento.
            proyecto: dict con campos del proyecto (tipo, tensión, ambiente, etc.)
            contexto_rag: texto adicional recuperado del RAG.
        """
        # Resumir contenido para no saturar el contexto
        resumen_docs = []
        for d in contenido_documentos:
            tipo = d.get("tipo", "?")
            meta = d.get("metadatos", {})
            estructura = d.get("estructura", {})
            resumen = {"tipo": tipo, "metadatos": meta}

            if tipo == "DXF":
                resumen["layers_relevantes"] = {
                    k: {"entidades": v["entidades"], "longitud_m": round(v["longitud_total_m"], 2)}
                    for k, v in estructura.get("layers", {}).items()
                    if v.get("categoria")
                }
                resumen["bloques"] = estructura.get("bloques", {})
                resumen["longitudes_por_categoria"] = estructura.get("longitudes_m_por_categoria", {})
            elif tipo == "XLSX":
                resumen["items_detectados_planilla"] = estructura.get("items", [])[:100]
            elif tipo == "PDF":
                resumen["paginas"] = len(estructura.get("paginas", []))
                resumen["tablas_count"] = estructura.get("total_tablas", 0)
                resumen["texto_muestra"] = d.get("texto_plano", "")[:3000]
            elif tipo == "DOCX":
                resumen["headings"] = estructura.get("headings", [])[:30]
                resumen["secciones"] = meta.get("secciones_clave_detectadas", [])
                resumen["texto_muestra"] = d.get("texto_plano", "")[:3000]
            resumen_docs.append(resumen)

        user_msg = f"""DATOS DEL PROYECTO:
{proyecto}

CONTENIDO PROCESADO DE DOCUMENTOS:
{resumen_docs}

CONTEXTO ADICIONAL DEL RAG:
{contexto_rag if contexto_rag else '(sin contexto RAG adicional)'}

INSTRUCCIONES:
Analiza el contenido y genera la cubicación completa del proyecto.
Incluye OBLIGATORIAMENTE los accesorios complementarios.
Llama a la herramienta `registrar_cubicacion` con la lista de ítems propuestos.
Marca con confianza "Baja" cualquier ítem que sea supuesto sin respaldo documental.
"""

        response = self._call_claude(
            messages=[{"role": "user", "content": user_msg}],
            tools=[TOOL_CUBICACION],
        )

        resultado = self.extract_tool_use(response, "registrar_cubicacion")
        if resultado is None:
            # Si Claude no usó la tool, devolvemos lo que haya en texto
            return {
                "items": [],
                "advertencias": ["El agente no devolvió cubicación estructurada."],
                "razonamiento": self.extract_text(response),
                "tokens_in": response.usage.input_tokens,
                "tokens_out": response.usage.output_tokens,
            }

        return {
            **resultado,
            "tokens_in": response.usage.input_tokens,
            "tokens_out": response.usage.output_tokens,
        }
