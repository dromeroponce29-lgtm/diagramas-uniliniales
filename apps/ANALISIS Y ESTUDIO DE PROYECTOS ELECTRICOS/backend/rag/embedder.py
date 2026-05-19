"""
Embedder — genera embeddings con Voyage AI.

Si VOYAGE_API_KEY no está configurada, se devuelven vectores nulos (None)
y el retriever cae a búsqueda BM25-only sobre `chunk.texto`.
"""
from typing import Any
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

log = logging.getLogger("rag.embedder")

try:
    import voyageai
    _voyage_client = None
except ImportError:
    voyageai = None
    _voyage_client = None


def _get_client():
    global _voyage_client
    if _voyage_client is None and voyageai is not None and settings.voyage_api_key:
        _voyage_client = voyageai.Client(api_key=settings.voyage_api_key)
    return _voyage_client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def embed_texts(
    textos: list[str],
    input_type: str = "document",  # "document" | "query"
) -> list[list[float] | None]:
    """
    Genera embeddings para una lista de textos.

    Returns:
        Lista de vectores (mismo orden que la entrada).
        None para cada texto si Voyage no está configurado.
    """
    if not textos:
        return []

    client = _get_client()
    if client is None:
        log.warning("Voyage no configurado — embeddings devueltos como None.")
        return [None] * len(textos)

    try:
        result = client.embed(
            texts=textos,
            model=settings.voyage_model,
            input_type=input_type,
        )
        return [list(e) for e in result.embeddings]
    except Exception as e:
        log.exception("Error generando embeddings: %s", e)
        return [None] * len(textos)
