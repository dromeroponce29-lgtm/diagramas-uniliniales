"""
Parsers de documentos.
Cada parser devuelve un dict con la estructura:
{
  "tipo": "PDF" | "DXF" | "XLSX" | "DOCX" | "IMG" | "TXT",
  "texto_plano": "...",            # texto concatenado para RAG
  "estructura": {...},              # estructura específica del formato
  "metadatos": {...},               # autor, fechas, escala, número plano, etc.
  "advertencias": [...]
}
"""
from pathlib import Path
from typing import Any

from .pdf_parser import parse_pdf
from .dxf_parser import parse_dxf
from .xlsx_parser import parse_xlsx
from .docx_parser import parse_docx


def parse_documento(path: Path, tipo: str) -> dict[str, Any]:
    """Dispatcher: elige el parser según el tipo de archivo."""
    tipo = tipo.upper()
    if tipo == "PDF":
        return parse_pdf(path)
    if tipo == "DXF":
        return parse_dxf(path)
    if tipo == "XLSX":
        return parse_xlsx(path)
    if tipo == "DOCX":
        return parse_docx(path)
    if tipo == "TXT":
        return {
            "tipo": "TXT",
            "texto_plano": path.read_text(encoding="utf-8", errors="replace"),
            "estructura": {},
            "metadatos": {},
            "advertencias": [],
        }
    return {
        "tipo": tipo,
        "texto_plano": "",
        "estructura": {},
        "metadatos": {"nota": f"Formato {tipo} no procesado automáticamente"},
        "advertencias": [f"Formato {tipo} requiere procesamiento manual o agente especializado."],
    }


__all__ = ["parse_documento", "parse_pdf", "parse_dxf", "parse_xlsx", "parse_docx"]
