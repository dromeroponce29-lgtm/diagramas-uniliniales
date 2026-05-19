"""Modelo Especificacion técnica."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Especificacion(Base):
    __tablename__ = "especificacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    partida: Mapped[str] = mapped_column(String(256))
    contenido_md: Mapped[str] = mapped_column(Text)
    norma_ref: Mapped[str | None] = mapped_column(String(256))
    validado: Mapped[bool] = mapped_column(Boolean, default=False)
    validado_por: Mapped[str | None] = mapped_column(String(128))
    validado_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proyecto = relationship("Proyecto", back_populates="especificaciones")
