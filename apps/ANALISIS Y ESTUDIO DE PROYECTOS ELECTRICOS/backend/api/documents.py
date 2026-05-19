"""
Upload y procesamiento de documentos.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from pathlib import Path
import hashlib

from ..database import get_db
from ..models import Documento, EstadoDocumento, Chunk, Proyecto
from ..schemas import DocumentoOut, DocumentoListItem
from ..config import settings
from ..parsers import parse_documento
from ..rag.chunker import split_text
from ..rag.embedder import embed_texts

router = APIRouter(prefix="/api", tags=["documents"])


EXTENSIONES_VALIDAS = {".pdf", ".dxf", ".xlsx", ".xls", ".csv", ".docx", ".doc",
                      ".txt", ".jpg", ".jpeg", ".png"}

TIPO_POR_EXT = {
    ".pdf": "PDF", ".dxf": "DXF",
    ".xlsx": "XLSX", ".xls": "XLSX", ".csv": "XLSX",
    ".docx": "DOCX", ".doc": "DOCX",
    ".txt": "TXT",
    ".jpg": "IMG", ".jpeg": "IMG", ".png": "IMG",
}


def _procesar_documento_background(documento_id: int) -> None:
    """Tarea de procesamiento ejecutada en background."""
    from ..database import session_scope

    with session_scope() as db:
        doc = db.get(Documento, documento_id)
        if not doc:
            return

        doc.estado = EstadoDocumento.procesando
        db.commit()

        try:
            path = Path(doc.storage_path)
            resultado = parse_documento(path, doc.tipo)

            doc.contenido_estructurado = resultado.get("estructura", {})
            doc.metadatos = resultado.get("metadatos", {})

            # Indexar para RAG
            texto = resultado.get("texto_plano", "")
            if texto:
                chunks_data = split_text(texto)
                if chunks_data:
                    # Generar embeddings en batch
                    textos = [c["texto"] for c in chunks_data]
                    embeddings = embed_texts(textos, input_type="document")
                    for cdata, emb in zip(chunks_data, embeddings):
                        chunk = Chunk(
                            documento_id=doc.id,
                            posicion=cdata["posicion"],
                            texto=cdata["texto"],
                            tokens=cdata["tokens"],
                            embedding=emb,
                            chunk_metadata={"tipo_origen": doc.tipo},
                        )
                        db.add(chunk)

            doc.estado = EstadoDocumento.procesado
            doc.processed_at = datetime.utcnow()
            doc.error = None
            if resultado.get("advertencias"):
                doc.metadatos = doc.metadatos or {}
                doc.metadatos["advertencias"] = resultado["advertencias"]
            db.commit()

        except Exception as e:
            doc.estado = EstadoDocumento.error
            doc.error = str(e)[:1000]
            db.commit()


@router.post(
    "/projects/{proyecto_id}/documents",
    response_model=DocumentoOut,
    status_code=status.HTTP_201_CREATED,
)
async def subir_documento(
    proyecto_id: int,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    proyecto = db.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(404, "Proyecto no encontrado")

    # Validar extensión
    ext = Path(file.filename).suffix.lower()
    if ext not in EXTENSIONES_VALIDAS:
        raise HTTPException(400, f"Extensión {ext} no soportada")

    # Validar tamaño leyendo el contenido
    contenido = await file.read()
    if len(contenido) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, f"Archivo > {settings.max_upload_size_mb} MB")

    # Guardar en storage
    proyecto_dir = settings.storage_path / f"proyecto_{proyecto_id}"
    proyecto_dir.mkdir(parents=True, exist_ok=True)
    sha = hashlib.sha256(contenido).hexdigest()
    target = proyecto_dir / f"{sha[:12]}_{file.filename}"
    target.write_bytes(contenido)

    # Registrar en DB
    doc = Documento(
        proyecto_id=proyecto_id,
        nombre=file.filename,
        tipo=TIPO_POR_EXT.get(ext, ext[1:].upper()),
        tamano_kb=len(contenido) // 1024,
        hash_sha256=sha,
        storage_path=str(target),
        estado=EstadoDocumento.pendiente,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Encolar procesamiento (en producción usar Celery, aquí BackgroundTasks de FastAPI)
    background.add_task(_procesar_documento_background, doc.id)

    return doc


@router.get(
    "/projects/{proyecto_id}/documents",
    response_model=list[DocumentoListItem],
)
def listar_documentos(proyecto_id: int, db: Session = Depends(get_db)):
    proyecto = db.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(404, "Proyecto no encontrado")
    return (
        db.execute(
            select(Documento)
            .where(Documento.proyecto_id == proyecto_id)
            .order_by(Documento.uploaded_at.desc())
        )
        .scalars()
        .all()
    )


@router.get("/documents/{documento_id}", response_model=DocumentoOut)
def obtener_documento(documento_id: int, db: Session = Depends(get_db)):
    d = db.get(Documento, documento_id)
    if not d:
        raise HTTPException(404, "Documento no encontrado")
    return d


@router.post("/documents/{documento_id}/process", response_model=DocumentoOut)
def reprocesar_documento(
    documento_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    d = db.get(Documento, documento_id)
    if not d:
        raise HTTPException(404, "Documento no encontrado")
    # Borrar chunks previos para reindexar
    for chunk in d.chunks:
        db.delete(chunk)
    d.estado = EstadoDocumento.pendiente
    d.error = None
    db.commit()
    background.add_task(_procesar_documento_background, d.id)
    db.refresh(d)
    return d


@router.delete("/documents/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_documento(documento_id: int, db: Session = Depends(get_db)):
    d = db.get(Documento, documento_id)
    if not d:
        raise HTTPException(404, "Documento no encontrado")
    # Borrar archivo del storage
    try:
        Path(d.storage_path).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(d)
    db.commit()
    return None
