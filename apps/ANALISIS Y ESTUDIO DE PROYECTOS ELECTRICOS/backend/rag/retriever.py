"""
Retriever — búsqueda híbrida (vectorial + fallback BM25 simple).
Devuelve los top-k chunks más relevantes con su trazabilidad.
"""
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, text
from ..models import Chunk, Documento
from ..config import settings
from .embedder import embed_texts


def buscar_chunks(
    db: Session,
    proyecto_id: int,
    query: str,
    top_k: int | None = None,
) -> list[dict]:
    """
    Busca los chunks más relevantes para una query en el contexto del proyecto.

    Returns:
        Lista de dicts con: chunk_id, documento_id, documento_nombre,
        texto, pagina, score, posicion.
    """
    top_k = top_k or settings.rag_top_k

    # 1. Generar embedding de la query
    embeddings = embed_texts([query], input_type="query")
    query_embedding = embeddings[0] if embeddings else None

    # 2. Búsqueda vectorial si tenemos embedding
    resultados: list[dict] = []

    if query_embedding is not None:
        # pgvector: distancia coseno (<#>) — menor es mejor
        stmt = (
            select(
                Chunk.id,
                Chunk.documento_id,
                Chunk.posicion,
                Chunk.texto,
                Chunk.chunk_metadata,
                Documento.nombre.label("documento_nombre"),
                Chunk.embedding.cosine_distance(query_embedding).label("dist"),
            )
            .join(Documento, Documento.id == Chunk.documento_id)
            .where(Documento.proyecto_id == proyecto_id)
            .where(Chunk.embedding.isnot(None))
            .order_by("dist")
            .limit(top_k)
        )
        for row in db.execute(stmt):
            score = 1.0 - float(row.dist) if row.dist is not None else 0.0
            resultados.append({
                "chunk_id": row.id,
                "documento_id": row.documento_id,
                "documento_nombre": row.documento_nombre,
                "posicion": row.posicion,
                "texto": row.texto,
                "pagina": (row.chunk_metadata or {}).get("pagina") if row.chunk_metadata else None,
                "score": round(score, 4),
            })

    # 3. Fallback BM25 simple si no hay embeddings o queremos complementar
    if not resultados:
        # Búsqueda por similitud de texto plano usando ilike (no es BM25 real,
        # pero permite operar sin embeddings configurados).
        # En producción usar tsvector + GIN index para BM25 nativo.
        palabras = [p for p in query.lower().split() if len(p) > 3][:5]
        if palabras:
            stmt_bm25 = (
                select(
                    Chunk.id,
                    Chunk.documento_id,
                    Chunk.posicion,
                    Chunk.texto,
                    Chunk.chunk_metadata,
                    Documento.nombre.label("documento_nombre"),
                )
                .join(Documento, Documento.id == Chunk.documento_id)
                .where(Documento.proyecto_id == proyecto_id)
                .limit(top_k * 2)
            )
            for row in db.execute(stmt_bm25):
                texto_lower = row.texto.lower()
                score = sum(1 for p in palabras if p in texto_lower) / len(palabras)
                if score > 0:
                    resultados.append({
                        "chunk_id": row.id,
                        "documento_id": row.documento_id,
                        "documento_nombre": row.documento_nombre,
                        "posicion": row.posicion,
                        "texto": row.texto,
                        "pagina": (row.chunk_metadata or {}).get("pagina") if row.chunk_metadata else None,
                        "score": round(score, 4),
                    })
            resultados.sort(key=lambda x: -x["score"])
            resultados = resultados[:top_k]

    return resultados


def formatear_contexto_rag(chunks: list[dict]) -> str:
    """Convierte los chunks recuperados en texto inyectable al prompt."""
    if not chunks:
        return ""
    bloques = []
    for i, c in enumerate(chunks, start=1):
        pagina = f", p.{c['pagina']}" if c.get("pagina") else ""
        bloques.append(
            f"[Fuente {i}: {c['documento_nombre']}{pagina}]\n{c['texto']}\n"
        )
    return "\n---\n".join(bloques)
