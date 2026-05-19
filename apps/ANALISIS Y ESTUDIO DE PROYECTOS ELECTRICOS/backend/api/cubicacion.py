"""
CRUD de ItemCubicacion + ejecución del AgenteCubicador.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import ItemCubicacion, Documento, Proyecto, EstadoDocumento, FuenteItem, EstadoItem
from ..schemas import ItemCubicacionCreate, ItemCubicacionUpdate, ItemCubicacionOut, AgentRunOut
from ..agents import AgenteCubicador
from ..rag.retriever import buscar_chunks, formatear_contexto_rag
from ..parsers import parse_documento
from pathlib import Path

router = APIRouter(prefix="/api", tags=["cubicacion"])


def _to_out(item: ItemCubicacion) -> dict:
    return {
        **{c.name: getattr(item, c.name) for c in item.__table__.columns},
        "cantidad_final": item.cantidad_final,
        "total_material": item.total_material,
    }


@router.get(
    "/projects/{proyecto_id}/cubicacion",
    response_model=list[ItemCubicacionOut],
)
def listar(proyecto_id: int, db: Session = Depends(get_db)):
    items = (
        db.execute(
            select(ItemCubicacion)
            .where(ItemCubicacion.proyecto_id == proyecto_id)
            .order_by(ItemCubicacion.partida, ItemCubicacion.id)
        )
        .scalars()
        .all()
    )
    return [_to_out(it) for it in items]


@router.post(
    "/projects/{proyecto_id}/cubicacion",
    response_model=ItemCubicacionOut,
    status_code=status.HTTP_201_CREATED,
)
def crear(proyecto_id: int, data: ItemCubicacionCreate, db: Session = Depends(get_db)):
    data.proyecto_id = proyecto_id
    item = ItemCubicacion(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.put("/cubicacion/{item_id}", response_model=ItemCubicacionOut)
def actualizar(item_id: int, data: ItemCubicacionUpdate, db: Session = Depends(get_db)):
    it = db.get(ItemCubicacion, item_id)
    if not it:
        raise HTTPException(404, "Item no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(it, k, v)
    db.commit()
    db.refresh(it)
    return _to_out(it)


@router.delete("/cubicacion/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(item_id: int, db: Session = Depends(get_db)):
    it = db.get(ItemCubicacion, item_id)
    if not it:
        raise HTTPException(404, "Item no encontrado")
    db.delete(it)
    db.commit()
    return None


@router.post(
    "/projects/{proyecto_id}/cubicacion/agent",
    response_model=AgentRunOut,
)
def ejecutar_agente_cubicador(proyecto_id: int, db: Session = Depends(get_db)):
    """
    Ejecuta el AgenteCubicador sobre los documentos procesados del proyecto.
    Propone items con estado='propuesto' para revisión humana.
    """
    proyecto = db.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(404, "Proyecto no encontrado")

    # Cargar documentos procesados
    docs = (
        db.execute(
            select(Documento)
            .where(Documento.proyecto_id == proyecto_id)
            .where(Documento.estado == EstadoDocumento.procesado)
        )
        .scalars()
        .all()
    )

    if not docs:
        return AgentRunOut(
            agent="cubicador",
            success=False,
            mensaje="No hay documentos procesados. Sube y procesa al menos uno.",
        )

    # Reconstruir contenido estructurado por documento
    contenido_docs = []
    for d in docs:
        contenido_docs.append({
            "tipo": d.tipo,
            "metadatos": d.metadatos or {},
            "estructura": d.contenido_estructurado or {},
            "texto_plano": "",  # ya está en chunks; no duplicamos
            "_id": d.id,
            "_nombre": d.nombre,
        })

    # Contexto RAG complementario
    rag_chunks = buscar_chunks(db, proyecto_id, "cubicación materiales eléctricos canalización conductor", top_k=10)
    contexto_rag = formatear_contexto_rag(rag_chunks)

    proyecto_dict = {
        "nombre": proyecto.nombre, "tipo": proyecto.tipo, "tension": proyecto.tension,
        "potencia": proyecto.potencia, "ambiente": proyecto.ambiente,
        "metodo_instalacion": proyecto.metodo_instalacion,
    }

    # Ejecutar agente
    try:
        agent = AgenteCubicador()
        resultado = agent.run(contenido_docs, proyecto_dict, contexto_rag)
    except RuntimeError as e:
        # API key no configurada
        return AgentRunOut(
            agent="cubicador", success=False,
            mensaje=f"No se pudo ejecutar el agente: {e}",
        )

    items_propuestos = resultado.get("items", [])
    creados = 0
    for it in items_propuestos:
        try:
            db.add(ItemCubicacion(
                proyecto_id=proyecto_id,
                partida=it.get("partida", "Misceláneos"),
                sistema=it.get("sistema"),
                area=it.get("area"),
                descripcion=it.get("descripcion", ""),
                unidad=it.get("unidad", "un"),
                cantidad=float(it.get("cantidad", 0) or 0),
                factor_perdida=float(it.get("factor_perdida", 0) or 0),
                precio_unitario=float(it.get("precio_unitario", 0) or 0),
                hh_unitaria=float(it.get("hh_unitaria", 0) or 0),
                fuente=FuenteItem(it.get("fuente", "estimado")),
                confianza=it.get("confianza", "Media"),
                norma_ref=it.get("norma_ref"),
                observacion=it.get("observacion"),
                estado=EstadoItem.propuesto,
                creado_por="agente",
            ))
            creados += 1
        except Exception:
            continue
    db.commit()

    return AgentRunOut(
        agent="cubicador",
        success=True,
        items_creados=creados,
        items_propuestos=creados,
        mensaje=f"Se crearon {creados} ítems propuestos. Revísalos en la cubicación.",
        detalle={
            "advertencias": resultado.get("advertencias", []),
            "razonamiento": resultado.get("razonamiento", ""),
            "tokens_in": resultado.get("tokens_in"),
            "tokens_out": resultado.get("tokens_out"),
        },
    )
