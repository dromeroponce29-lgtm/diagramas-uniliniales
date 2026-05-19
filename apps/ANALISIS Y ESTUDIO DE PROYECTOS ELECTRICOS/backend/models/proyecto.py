"""Modelo Proyecto."""
from sqlalchemy import String, Integer, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Proyecto(Base):
    __tablename__ = "proyecto"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), index=True)
    mandante: Mapped[str | None] = mapped_column(String(255))
    ubicacion: Mapped[str | None] = mapped_column(String(255))
    tipo: Mapped[str | None] = mapped_column(String(64))
    disciplina: Mapped[str | None] = mapped_column(String(128))
    fecha: Mapped[str | None] = mapped_column(String(32))

    # Parámetros eléctricos
    tension: Mapped[float | None] = mapped_column(Float, default=400)
    frecuencia: Mapped[int | None] = mapped_column(Integer, default=50)
    potencia: Mapped[float | None] = mapped_column(Float)
    corriente: Mapped[float | None] = mapped_column(Float)
    tipo_carga: Mapped[str | None] = mapped_column(String(64))
    ambiente: Mapped[str | None] = mapped_column(String(64))
    temp_ambiente: Mapped[float | None] = mapped_column(Float, default=30)
    metodo_instalacion: Mapped[str | None] = mapped_column(String(64))

    # Restricciones
    marcas_permitidas: Mapped[str | None] = mapped_column(String(512))
    restricciones: Mapped[str | None] = mapped_column(String(1024))
    normas: Mapped[str | None] = mapped_column(String(1024))

    # Configuración económica (JSONB para flexibilidad)
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relaciones
    documentos = relationship("Documento", back_populates="proyecto", cascade="all, delete-orphan")
    items = relationship("ItemCubicacion", back_populates="proyecto", cascade="all, delete-orphan")
    especificaciones = relationship("Especificacion", back_populates="proyecto", cascade="all, delete-orphan")
    alternativas = relationship("Alternativa", back_populates="proyecto", cascade="all, delete-orphan")
    catalogos = relationship("Catalogo", back_populates="proyecto", cascade="all, delete-orphan")
    requisitos = relationship("RequisitoNormativo", back_populates="proyecto", cascade="all, delete-orphan")
    riesgos = relationship("Riesgo", back_populates="proyecto", cascade="all, delete-orphan")
    conversaciones = relationship("Conversacion", back_populates="proyecto", cascade="all, delete-orphan")
