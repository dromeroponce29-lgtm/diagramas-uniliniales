"""
Chat IA — proxy seguro a Claude con RAG opcional.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..models import Conversacion, Proyecto
from ..schemas import ChatRequest, ChatResponse, FuenteCitada
from ..agents import get_agent
from ..rag.retriever import buscar_chunks, formatear_contexto_rag

router = APIRouter(prefix="/api", tags=["chat"])


@router.post(
    "/projects/{proyecto_id}/chat",
    response_model=ChatResponse,
)
def chat(proyecto_id: int, req: ChatRequest, db: Session = Depends(get_db)):
    proyecto = db.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(404, "Proyecto no encontrado")

    # Historial (últimos 20 turnos)
    historial = (
        db.execute(
            select(Conversacion)
            .where(Conversacion.proyecto_id == proyecto_id)
            .order_by(Conversacion.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    historial.reverse()
    historial_dicts = [{"role": h.role, "content": h.content} for h in historial]

    # RAG
    chunks_rag = []
    contexto_rag = ""
    if req.use_rag:
        chunks_rag = buscar_chunks(db, proyecto_id, req.message, top_k=5)
        contexto_rag = formatear_contexto_rag(chunks_rag)

    # Persistir mensaje del usuario
    msg_user = Conversacion(
        proyecto_id=proyecto_id, role="user", content=req.message,
    )
    db.add(msg_user)
    db.commit()

    # Ejecutar agente
    try:
        agent = get_agent(req.agent)
    except ValueError as e:
        raise HTTPException(400, str(e))

    contexto_proyecto = {
        "nombre": proyecto.nombre, "tipo": proyecto.tipo,
        "tension": proyecto.tension, "potencia": proyecto.potencia,
        "ambiente": proyecto.ambiente,
    }
    try:
        resultado = agent.run(
            mensaje_usuario=req.message,
            historial=historial_dicts,
            contexto_proyecto=contexto_proyecto,
            contexto_rag=contexto_rag,
        )
    except RuntimeError as e:
        raise HTTPException(500, f"Anthropic API no configurada: {e}")

    # Persistir respuesta del asistente
    fuentes_citadas = [
        {
            "documento_id": c["documento_id"],
            "documento_nombre": c["documento_nombre"],
            "chunk_id": c["chunk_id"],
            "pagina": c.get("pagina"),
            "score": c["score"],
        }
        for c in chunks_rag
    ]
    msg_ai = Conversacion(
        proyecto_id=proyecto_id, role="assistant",
        content=resultado.get("answer", ""),
        agent_used=req.agent,
        tokens_in=resultado.get("tokens_in"),
        tokens_out=resultado.get("tokens_out"),
        fuentes_citadas=fuentes_citadas,
    )
    db.add(msg_ai)
    db.commit()

    return ChatResponse(
        answer=resultado.get("answer", ""),
        agent_used=req.agent,
        fuentes=[FuenteCitada(**f) for f in fuentes_citadas],
        tokens_in=resultado.get("tokens_in", 0) or 0,
        tokens_out=resultado.get("tokens_out", 0) or 0,
        created_at=msg_ai.created_at,
    )


@router.get("/projects/{proyecto_id}/chat/history")
def historial_chat(proyecto_id: int, limit: int = 50, db: Session = Depends(get_db)):
    proyecto = db.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(404, "Proyecto no encontrado")
    msgs = (
        db.execute(
            select(Conversacion)
            .where(Conversacion.proyecto_id == proyecto_id)
            .order_by(Conversacion.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    msgs.reverse()
    return [
        {
            "id": m.id, "role": m.role, "content": m.content,
            "agent_used": m.agent_used,
            "fuentes": m.fuentes_citadas or [],
            "created_at": m.created_at,
        }
        for m in msgs
    ]
