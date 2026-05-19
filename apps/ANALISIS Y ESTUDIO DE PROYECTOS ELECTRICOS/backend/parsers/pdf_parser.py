"""
Parser de PDF usando pdfplumber.
Extrae texto, tablas y metadatos. Si el PDF está escaneado (texto vacío),
ofrece fallback a OCR vía Tesseract (función ocr_pdf en workers/ocr_task).
"""
from pathlib import Path
from typing import Any
import re

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


# Patrones útiles para reconocer información típica de planos eléctricos
PATRONES_PLANO = {
    "numero_plano": re.compile(r"(?:plano|drawing|dwg)[\s#:.-]*([A-Z0-9\-_]{3,})", re.I),
    "revision": re.compile(r"(?:rev|revisión|revision)[\s.:]*([A-Z0-9]+)", re.I),
    "escala": re.compile(r"(?:escala|scale)[\s:]*1[\s:]*[/:]?[\s]*(\d+)", re.I),
    "fecha": re.compile(r"(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})"),
}

# Palabras clave eléctricas para conteo
KEYWORDS_ELECTRICAS = [
    "tablero", "alimentador", "canalización", "canalizacion", "bandeja", "escalerilla",
    "EMT", "PVC", "luminaria", "tomacorriente", "enchufe", "interruptor",
    "diferencial", "automático", "automatico", "contactor", "transformador",
    "puesta a tierra", "PAT", "electrodo", "soldadura exotérmica", "cámara",
    "conductor", "XTU", "EVA", "RV-K", "XLPE", "EPR", "Cu", "AWG",
]


def parse_pdf(path: Path) -> dict[str, Any]:
    if pdfplumber is None:
        return {
            "tipo": "PDF",
            "texto_plano": "",
            "estructura": {},
            "metadatos": {},
            "advertencias": ["pdfplumber no instalado — instalar requirements.txt"],
        }

    texto_total: list[str] = []
    paginas_info: list[dict] = []
    tablas_total: list[dict] = []
    metadatos: dict[str, Any] = {}
    advertencias: list[str] = []

    try:
        with pdfplumber.open(path) as pdf:
            metadatos["paginas"] = len(pdf.pages)
            if pdf.metadata:
                for k in ("Title", "Author", "Subject", "Producer", "CreationDate"):
                    if k in pdf.metadata:
                        metadatos[k.lower()] = str(pdf.metadata[k])

            for i, page in enumerate(pdf.pages, start=1):
                texto = page.extract_text() or ""
                texto_total.append(texto)

                # Tablas
                try:
                    tablas = page.extract_tables() or []
                    for t_idx, tabla in enumerate(tablas):
                        tablas_total.append({
                            "pagina": i,
                            "tabla_idx": t_idx,
                            "filas": len(tabla),
                            "cols": len(tabla[0]) if tabla else 0,
                            "datos": tabla,
                        })
                except Exception as e:
                    advertencias.append(f"Error extrayendo tablas en página {i}: {e}")

                # Conteo de palabras clave eléctricas
                conteo_kw = {}
                texto_lower = texto.lower()
                for kw in KEYWORDS_ELECTRICAS:
                    n = texto_lower.count(kw.lower())
                    if n > 0:
                        conteo_kw[kw] = n

                paginas_info.append({
                    "pagina": i,
                    "chars": len(texto),
                    "palabras_clave": conteo_kw,
                })

                # Detectar metadatos de plano en la primera página (suele tener viñeta)
                if i == 1 and texto:
                    for clave, patron in PATRONES_PLANO.items():
                        m = patron.search(texto)
                        if m and clave not in metadatos:
                            metadatos[clave] = m.group(1) if m.groups() else m.group(0)

    except Exception as e:
        return {
            "tipo": "PDF",
            "texto_plano": "",
            "estructura": {},
            "metadatos": {},
            "advertencias": [f"Error procesando PDF: {e}"],
        }

    texto_plano = "\n".join(texto_total)

    # Si el PDF está vacío de texto, probablemente es escaneado → sugerir OCR
    if len(texto_plano.strip()) < 50:
        advertencias.append(
            "PDF aparentemente escaneado (texto extraído < 50 chars). "
            "Recomendado: ejecutar OCR con Tesseract (workers/ocr_task.py)."
        )

    return {
        "tipo": "PDF",
        "texto_plano": texto_plano,
        "estructura": {
            "paginas": paginas_info,
            "tablas": tablas_total,
            "total_tablas": len(tablas_total),
        },
        "metadatos": metadatos,
        "advertencias": advertencias,
    }
