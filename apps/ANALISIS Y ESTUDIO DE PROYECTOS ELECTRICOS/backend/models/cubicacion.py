"""Modelo ItemCubicacion."""
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from ..database import Base


class FuenteItem(str, enum.Enum):
    plano = "plano"
    base_tecnica = "base técnica"
    planilla = "planilla"
    estimado = "estimado"
    manual = "manual"
    catalogo = "catálogo"


class EstadoItem(str, enum.Enum):
    propuesto = "propuesto"
    aprobado = "aprobado"
    rechazado = "rechazado"


class ItemCubicacion(Base):
    __tablename__ = "item_cubicacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    proyecto_id: Mapped[int] = mapped_column(ForeignKey("proyecto.id", ondelete="CASCADE"), index=True)

    partida: Mapped[str] = mapped_column(String(128), index=True)
    sistema: Mapped[str | None] = mapped_column(String(64))
    area: Mapped[str | None] = mapped_column(String(64))
    descripcion: Mapped[str] = mapped_column(String(512))
    unidad: Mapped[str] = mapped_column(String(16))

    cantidad: Mapped[float] = mapped_column(Float, default=0)
    factor_perdida: Mapped[float] = mapped_column(Float, default=0)
    precio_unitario: Mapped[float] = mapped_column(Float, default=0)
    hh_unitaria: Mapped[float] = mapped_column(Float, default=0)

    fuente: Mapped[FuenteItem] = mapped_column(SAEnum(FuenteItem), default=FuenteItem.manual)
    confianza: Mapped[str] = mapped_column(String(16), default="Media")  # Alta/Media/Baja
    norma_ref: Mapped[str | None] = mapped_column(String(256))

    # Trazabilidad
    documento_id_origen: Mapped[int | None] = mapped_column(ForeignKey("documento.id"))
    pagina_origen: Mapped[int | None] = mapped_column(Integer)
    observacion: Mapped[str | None] = mapped_column(Text)

    estado: Mapped[EstadoItem] = mapped_column(SAEnum(EstadoItem), default=EstadoItem.aprobado)
    creado_por: Mapped[str] = mapped_column(String(32), default="usuario")  # usuario | agente

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="items")
    documento_origen = relationship("Documento", back_populates="items_origen")

    @property
    def cantidad_final(self) -> float:
        return self.cantidad * (1 + (self.factor_perdida or 0) / 100)

    @property
    def total_material(self) -> float:
        return self.cantidad_final * (self.precio_unitario or 0)
