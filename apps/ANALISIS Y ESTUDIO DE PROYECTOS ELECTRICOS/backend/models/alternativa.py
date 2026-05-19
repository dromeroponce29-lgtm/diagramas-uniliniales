"""Modelo Alternativa de diseño."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Alternativa(Base):
    __tablename__ = "alternativa"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    categoria: Mapped[str] = mapped_column(String(128))  # ej. "Canalización", "Conductor"
    nombre: Mapped[str] = mapped_column(String(256))
    ventajas: Mapped[str] = mapped_column(Text)
    desventajas: Mapped[str] = mapped_column(Text)
    uso: Mapped[str | None] = mapped_column(Text)
    costo_relativo: Mapped[str | None] = mapped_column(String(64))
    riesgo: Mapped[str | None] = mapped_column(String(64))
    materiales_complementarios: Mapped[list | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    proyecto = relationship("Proyecto", back_populates="alternativas")
