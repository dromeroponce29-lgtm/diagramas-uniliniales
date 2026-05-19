"""Modelo Conversacion para el chat IA."""
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..database import Base


class Conversacion(Base):
    __tablename__ = "conversacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    agent_used: Mapped[str | None] = mapped_column(String(64))
    tokens_in: Mapped[int | None] = mapped_column(Integer)
    tokens_out: Mapped[int | None] = mapped_column(Integer)
    fuentes_citadas: Mapped[list | None] = mapped_column(JSON)  # [{doc_id, chunk_id, pagina, score}]

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    proyecto = relationship("Proyecto", back_populates="conversaciones")
