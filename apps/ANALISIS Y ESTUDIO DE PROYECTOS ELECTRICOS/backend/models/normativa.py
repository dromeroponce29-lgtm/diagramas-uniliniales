"""Modelo RequisitoNormativo."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class RequisitoNormativo(Base):
    __tablename__ = "requisito_normativo"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    requisito: Mapped[str] = mapped_column(Text)
    norma_ref: Mapped[str | None] = mapped_column(String(256))
    articulo: Mapped[str | None] = mapped_column(String(128))
    estado: Mapped[str] = mapped_column(String(32), default="Requiere validación")
    evidencia: Mapped[str | None] = mapped_column(Text)
    observacion: Mapped[str | None] = mapped_column(Text)

    documento_id_validacion: Mapped[int | None] = mapped_column(ForeignKey("documento.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proyecto = relationship("Proyecto", back_populates="requisitos")
