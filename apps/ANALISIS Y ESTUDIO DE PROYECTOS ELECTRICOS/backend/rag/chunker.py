"""
Chunker — particiona texto en chunks de ~N tokens con overlap.
Aproximación: 1 token ≈ 4 caracteres. Para precisión real usar tiktoken o
el tokenizer del modelo de embeddings.
"""
import re
from ..config import settings


# Patrón de corte preferente: límites de oración/párrafo
_CUT_PATTERN = re.compile(r"(?<=[.!?])\s+|\n\n+")


def _estimar_tokens(texto: str) -> int:
    """Estimación rápida tokens ≈ chars/4."""
    return max(1, len(texto) // 4)


def split_text(
    texto: str,
    chunk_size_tokens: int | None = None,
    overlap_tokens: int | None = None,
) -> list[dict]:
    """
    Devuelve lista de dicts con:
      - posicion: orden
      - texto:    contenido del chunk
      - tokens:   estimación de tokens
    """
    chunk_size = chunk_size_tokens or settings.chunk_size_tokens
    overlap = overlap_tokens or settings.chunk_overlap_tokens

    if not texto or not texto.strip():
        return []

    # Convertir tokens → caracteres aproximados
    chunk_chars = chunk_size * 4
    overlap_chars = overlap * 4

    # Particionar por límites naturales primero
    parrafos = _CUT_PATTERN.split(texto)
    parrafos = [p.strip() for p in parrafos if p and p.strip()]

    chunks: list[dict] = []
    buffer: list[str] = []
    buffer_chars = 0
    posicion = 0

    def flush():
        nonlocal posicion, buffer, buffer_chars
        if buffer_chars > 0:
            contenido = " ".join(buffer).strip()
            chunks.append({
                "posicion": posicion,
                "texto": contenido,
                "tokens": _estimar_tokens(contenido),
            })
            posicion += 1
            # mantener overlap
            if overlap_chars > 0 and contenido:
                tail = contenido[-overlap_chars:]
                buffer = [tail]
                buffer_chars = len(tail)
            else:
                buffer = []
                buffer_chars = 0

    for p in parrafos:
        if not p:
            continue
        # Si el párrafo solo ya supera el chunk_size, partirlo por palabras
        if len(p) > chunk_chars:
            palabras = p.split()
            actual = []
            actual_chars = 0
            for w in palabras:
                if actual_chars + len(w) + 1 > chunk_chars:
                    chunks.append({
                        "posicion": posicion,
                        "texto": " ".join(actual),
                        "tokens": _estimar_tokens(" ".join(actual)),
                    })
                    posicion += 1
                    actual = []
                    actual_chars = 0
                actual.append(w)
                actual_chars += len(w) + 1
            if actual:
                # último trozo del párrafo grande va al buffer
                buffer.append(" ".join(actual))
                buffer_chars += actual_chars
        else:
            if buffer_chars + len(p) + 1 > chunk_chars:
                flush()
            buffer.append(p)
            buffer_chars += len(p) + 1

    if buffer_chars > 0:
        flush()

    return chunks
