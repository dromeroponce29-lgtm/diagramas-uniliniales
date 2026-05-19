"""Modelo Documento — archivos subidos al proyecto."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from ..database import Base


class EstadoDocumento(str, enum.Enum):
    pendiente = "pendiente"
    procesando = "procesando"
    procesado = "procesado"
    error = "error"


class Documento(Base):
    __tablename__ = "documento"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    nombre: Mapped[str] = mapped_column(String(512))
    tipo: Mapped[str] = mapped_column(String(16))  # PDF, DXF, XLSX, DOCX, IMG, TXT
    tamano_kb: Mapped[int] = mapped_column(Integer)
    hash_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    storage_path: Mapped[str] = mapped_column(String(1024))

    estado: Mapped[EstadoDocumento] = mapped_column(
        SAEnum(EstadoDocumento), default=EstadoDocumento.pendiente, index=True
    )
    error: Mapped[str | None] = mapped_column(Text)

    # Salida estructurada del parser (texto, tablas, layers, etc.)
    contenido_estructurado: Mapped[dict | None] = mapped_column(JSON)

    # Metadatos detectados (autor, fecha, escala, número plano, etc.)
    metadatos: Mapped[dict | None] = mapped_column(JSON)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="documentos")
    chunks = relationship("Chunk", back_populates="documento", cascade="all, delete-orphan")
    items_origen = relationship("ItemCubicacion", back_populates="documento_origen")
