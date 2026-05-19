"""
Parser de DXF usando ezdxf.
Extrae:
  - Layers (capas) y entidad por capa
  - Bloques eléctricos (INSERTs)
  - Textos y MTEXTs
  - Polilíneas con longitudes calculadas (para estimar metros lineales de canalización)
  - Líneas con longitudes
  - Coordenadas y áreas de intervención
"""
from pathlib import Path
from typing import Any
import math

try:
    import ezdxf
    from ezdxf.math import Vec3
except ImportError:
    ezdxf = None
    Vec3 = None


# Heurísticas para identificar layers eléctricas
LAYER_PATTERNS = {
    "bandeja":       ["bandeja", "tray", "cable_tray"],
    "escalerilla":   ["escalerilla", "ladder"],
    "emt":           ["emt", "tubería", "tuberia", "conduit"],
    "pvc":           ["pvc", "ductopvc"],
    "tablero":       ["tablero", "panel", "board", "tgm", "tgs", "ccm", "mcc"],
    "alimentador":   ["alimentador", "feeder"],
    "circuito":      ["circuito", "circuit"],
    "luminaria":     ["luminaria", "luminar", "lighting"],
    "tomacorriente": ["tomacorriente", "enchufe", "tc", "outlet"],
    "pat":           ["pat", "tierra", "ground", "earth", "grounding"],
    "cámara":        ["cámara", "camara", "chamber"],
    "canalización":  ["canalización", "canalizacion", "raceway"],
}


def _clasificar_layer(nombre: str) -> str | None:
    n = nombre.lower()
    for cat, kws in LAYER_PATTERNS.items():
        if any(kw in n for kw in kws):
            return cat
    return None


def _longitud_polilinea(poly) -> float:
    """Calcula la longitud de una polilínea sumando segmentos."""
    try:
        pts = list(poly.points())
        total = 0.0
        for a, b in zip(pts[:-1], pts[1:]):
            total += math.dist(a[:2] if hasattr(a, "__getitem__") else (a.x, a.y),
                               b[:2] if hasattr(b, "__getitem__") else (b.x, b.y))
        return total
    except Exception:
        return 0.0


def _longitud_linea(line) -> float:
    """Longitud de una LINE."""
    try:
        s, e = line.dxf.start, line.dxf.end
        return math.dist((s.x, s.y), (e.x, e.y))
    except Exception:
        return 0.0


def parse_dxf(path: Path) -> dict[str, Any]:
    if ezdxf is None:
        return {
            "tipo": "DXF",
            "texto_plano": "",
            "estructura": {},
            "metadatos": {},
            "advertencias": ["ezdxf no instalado — instalar requirements.txt"],
        }

    try:
        doc = ezdxf.readfile(str(path))
    except Exception as e:
        return {
            "tipo": "DXF",
            "texto_plano": "",
            "estructura": {},
            "metadatos": {},
            "advertencias": [f"Error leyendo DXF: {e}"],
        }

    msp = doc.modelspace()

    layers_info: dict[str, dict] = {}
    bloques: dict[str, int] = {}
    textos: list[dict] = []
    longitudes_por_categoria: dict[str, float] = {}
    bbox = {"xmin": math.inf, "ymin": math.inf, "xmax": -math.inf, "ymax": -math.inf}

    # Inicializar info de layers
    for layer in doc.layers:
        nombre = layer.dxf.name
        cat = _clasificar_layer(nombre)
        layers_info[nombre] = {
            "categoria": cat,
            "entidades": 0,
            "longitud_total_m": 0.0,
            "color": getattr(layer.dxf, "color", 7),
        }

    # Recorrer entidades del modelspace
    for ent in msp:
        layer = ent.dxf.layer
        if layer not in layers_info:
            layers_info[layer] = {"categoria": _clasificar_layer(layer), "entidades": 0,
                                  "longitud_total_m": 0.0, "color": 7}
        layers_info[layer]["entidades"] += 1

        tipo = ent.dxftype()

        # Bloques (INSERTs) — bloques eléctricos típicos
        if tipo == "INSERT":
            blk = ent.dxf.name
            bloques[blk] = bloques.get(blk, 0) + 1

        # Textos
        elif tipo in ("TEXT", "MTEXT"):
            try:
                txt = ent.dxf.text if tipo == "TEXT" else ent.text
                pos = ent.dxf.insert
                textos.append({
                    "layer": layer,
                    "texto": str(txt)[:200],
                    "x": float(pos.x),
                    "y": float(pos.y),
                })
            except Exception:
                pass

        # Líneas → longitud
        elif tipo == "LINE":
            L = _longitud_linea(ent)
            layers_info[layer]["longitud_total_m"] += L
            cat = layers_info[layer]["categoria"]
            if cat:
                longitudes_por_categoria[cat] = longitudes_por_categoria.get(cat, 0) + L
            try:
                bbox["xmin"] = min(bbox["xmin"], ent.dxf.start.x, ent.dxf.end.x)
                bbox["xmax"] = max(bbox["xmax"], ent.dxf.start.x, ent.dxf.end.x)
                bbox["ymin"] = min(bbox["ymin"], ent.dxf.start.y, ent.dxf.end.y)
                bbox["ymax"] = max(bbox["ymax"], ent.dxf.start.y, ent.dxf.end.y)
            except Exception:
                pass

        # Polilíneas → longitud
        elif tipo in ("LWPOLYLINE", "POLYLINE"):
            L = _longitud_polilinea(ent)
            layers_info[layer]["longitud_total_m"] += L
            cat = layers_info[layer]["categoria"]
            if cat:
                longitudes_por_categoria[cat] = longitudes_por_categoria.get(cat, 0) + L

    # Texto plano concatenado para RAG (todos los textos del DXF)
    texto_plano = "\n".join(t["texto"] for t in textos)

    # Filtrar layers vacías para el reporte
    layers_filtradas = {k: v for k, v in layers_info.items() if v["entidades"] > 0}

    advertencias: list[str] = []
    if not layers_filtradas:
        advertencias.append("DXF sin entidades reconocidas en el modelspace.")

    if bbox["xmin"] == math.inf:
        bbox = {}

    return {
        "tipo": "DXF",
        "texto_plano": texto_plano,
        "estructura": {
            "layers": layers_filtradas,
            "bloques": dict(sorted(bloques.items(), key=lambda x: -x[1])),
            "textos_count": len(textos),
            "textos_sample": textos[:50],
            "longitudes_m_por_categoria": longitudes_por_categoria,
            "bbox": bbox,
            "version_dxf": str(doc.dxfversion) if doc.dxfversion else "?",
        },
        "metadatos": {
            "layers_total": len(layers_filtradas),
            "categorias_detectadas": sorted({v["categoria"] for v in layers_filtradas.values() if v["categoria"]}),
        },
        "advertencias": advertencias,
    }
