"""
Modelo Chunk para RAG.
Cada documento se parte en chunks de ~500 tokens y se vectoriza con Voyage AI.
"""
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector
from ..database import Base
from ..config import settings


class Chunk(Base):
    __tablename__ = "chunk"

    id: Mapped[int] = mapped_column(primary_key=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documento.id", ondelete="CASCADE"), index=True)

    posicion: Mapped[int] = mapped_column(Integer)  # orden en el documento
    texto: Mapped[str] = mapped_column(Text)
    tokens: Mapped[int] = mapped_column(Integer)

    # Embedding vector — dimensión definida en settings.voyage_dimension (1024)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.voyage_dimension), nullable=True
    )

    # Metadata adicional (página, sección, tabla, etc.)
    chunk_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    documento = relationship("Documento", back_populates="chunks")
