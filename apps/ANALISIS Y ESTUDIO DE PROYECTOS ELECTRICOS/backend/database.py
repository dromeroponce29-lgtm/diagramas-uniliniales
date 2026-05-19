"""
Engine SQLAlchemy y dependency de sesión para FastAPI.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from contextlib import contextmanager
from typing import Generator
from .config import settings


class Base(DeclarativeBase):
    """Base declarativa para todos los modelos."""
    pass


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """Dependency de FastAPI para inyectar sesión por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope():
    """Context manager para uso fuera de FastAPI (workers, scripts)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Crea todas las tablas. En producción usar Alembic."""
    from . import models  # noqa: F401  — registra todas las clases
    Base.metadata.create_all(bind=engine)
