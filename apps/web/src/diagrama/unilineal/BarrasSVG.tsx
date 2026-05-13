// SVG de las barras del tablero (fase / neutro / tierra) — incluye etiqueta de R de tierra.
import type { DatosPuestaATierra } from '@tipos/modelo';

interface Props {
  xInicio: number;
  xFin: number;
  y: number;
  tieneFase: boolean;
  tieneNeutro: boolean;
  tieneTierra: boolean;
  tierra?: DatosPuestaATierra;
}

export function BarrasSVG({ xInicio, xFin, y, tieneFase, tieneNeutro, tieneTierra, tierra }: Props) {
  return (
    <g>
      {tieneFase && (
        <>
          <line x1={xInicio} y1={y} x2={xFin} y2={y} stroke="black" strokeWidth="3" />
          <text x={xInicio - 8} y={y + 4} fontSize="9" textAnchor="end" fill="black">F</text>
        </>
      )}
      {tieneNeutro && (
        <>
          <line x1={xInicio} y1={y + 12} x2={xFin} y2={y + 12} stroke="#3b82f6" strokeWidth="2" />
          <text x={xInicio - 8} y={y + 16} fontSize="9" textAnchor="end" fill="#3b82f6">N</text>
        </>
      )}
      {tieneTierra && (
        <>
          <line x1={xInicio} y1={y + 24} x2={xFin} y2={y + 24} stroke="#22c55e" strokeWidth="2" strokeDasharray="2 2" />
          <text x={xInicio - 8} y={y + 28} fontSize="9" textAnchor="end" fill="#22c55e">⏚</text>
          {tierra?.resistenciaOhmMedida !== undefined && (
            <text x={xFin + 6} y={y + 28} fontSize="9" fill="#22c55e">
              R = {tierra.resistenciaOhmMedida} Ω ({tierra.tipoElectrodo ?? '—'})
            </text>
          )}
        </>
      )}
    </g>
  );
}
