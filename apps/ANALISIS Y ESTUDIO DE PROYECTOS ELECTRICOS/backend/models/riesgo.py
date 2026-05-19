"""Modelo Riesgo / hallazgo."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Riesgo(Base):
    __tablename__ = "riesgo"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    categoria: Mapped[str] = mapped_column(String(64))  # Técnico/Normativo/Constructivo/Comercial/Seguridad/Plazo
    descripcion: Mapped[str] = mapped_column(Text)
    probabilidad: Mapped[str] = mapped_column(String(16), default="Media")
    impacto: Mapped[str] = mapped_column(String(16), default="Medio")
    nivel: Mapped[str] = mapped_column(String(16), default="Moderado")
    mitigacion: Mapped[str | None] = mapped_column(Text)
    responsable: Mapped[str | None] = mapped_column(String(128))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proyecto = relationship("Proyecto", back_populates="riesgos")
