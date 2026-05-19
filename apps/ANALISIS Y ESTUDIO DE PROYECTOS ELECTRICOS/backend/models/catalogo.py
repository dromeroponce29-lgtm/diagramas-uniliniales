"""Modelo Catalogo de material."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Catalogo(Base):
    __tablename__ = "catalogo"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int | None] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    material: Mapped[str] = mapped_column(String(256))
    marca: Mapped[str | None] = mapped_column(String(128))
    modelo: Mapped[str | None] = mapped_column(String(128))
    caracteristicas: Mapped[str | None] = mapped_column(Text)
    norma: Mapped[str | None] = mapped_column(String(128))
    link: Mapped[str | None] = mapped_column(String(512))
    equivalentes: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[str | None] = mapped_column(String(64), default="Validar SEC")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proyecto = relationship("Proyecto", back_populates="catalogos")
