"""
Entry point de FastAPI — Sistema AEP-Eléctrico.

Levantar con:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

Documentación interactiva:
    http://localhost:8000/docs
    http://localhost:8000/redoc
"""
import logging
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from .config import settings
from .database import engine, init_db
from .api import projects, documents, cubicacion, chat, exports, rag, health


# Configurar logging
logging.basicConfig(level=getattr(logging, settings.log_level, logging.INFO))
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)
log = structlog.get_logger("aep")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización: asegurar extensión pgvector y crear tablas si faltan."""
    log.info("startup", app=settings.app_name, version=settings.app_version)
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        # En producción usar Alembic. Para dev iniciamos con create_all.
        init_db()
        log.info("db_ready")
    except Exception as e:
        log.warning("startup_db_warning", error=str(e))
    yield
    log.info("shutdown")


app = FastAPI(
    title="AEP-Eléctrico API",
    version=settings.app_version,
    description=(
        "Sistema de análisis y estudio de proyectos eléctricos.\n\n"
        "Procesa planos PDF/DXF, planillas Excel, bases técnicas y catálogos. "
        "Genera cubicación, presupuesto, especificaciones técnicas, matriz normativa "
        "y comparativos de alternativas — todo trazable y editable."
    ),
    lifespan=lifespan,
)

# CORS — permitir frontend local y dominios configurados
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(cubicacion.router)
app.include_router(chat.router)
app.include_router(exports.router)
app.include_router(rag.router)


@app.get("/", tags=["system"])
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }
