"""
Endpoint de búsqueda semántica RAG.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Proyecto
from ..rag.retriever import buscar_chunks

router = APIRouter(prefix="/api/projects", tags=["rag"])


@router.get("/{proyecto_id}/rag/search")
def buscar(proyecto_id: int, q: str, top_k: int = 10, db: Session = Depends(get_db)):
    p = db.get(Proyecto, proyecto_id)
    if not p:
        raise HTTPException(404)
    if not q or len(q.strip()) < 2:
        raise HTTPException(400, "Query muy corta")
    chunks = buscar_chunks(db, proyecto_id, q, top_k=top_k)
    return {"query": q, "results": chunks}
