"""
RAG documental — indexa documentos del proyecto y permite búsqueda semántica.

Flujo:
  parse_documento → chunker.split → embedder.embed → almacenamiento como Chunk
                                                         ↓
                                                  retriever.search(query)
                                                         ↓
                                                  top-k chunks → contexto agente
"""
from .chunker import split_text
from .embedder import embed_texts
from .retriever import buscar_chunks

__all__ = ["split_text", "embed_texts", "buscar_chunks"]
