// SVG de las barras del tablero. En sistemas trifásicos dibuja L1, L2, L3 +
// neutro + tierra. En monofásico dibuja una sola fase + neutro + tierra.
import type { DatosPuestaATierra } from '@tipos/modelo';

interface Props {
  xInicio: number;
  xFin: number;
  y: number;
  tieneFase: boolean;
  tieneNeutro: boolean;
  tieneTierra: boolean;
  trifasico?: boolean;             // true → L1/L2/L3 separadas
  tierra?: DatosPuestaATierra;
}

export function BarrasSVG({ xInicio, xFin, y, tieneFase, tieneNeutro, tieneTierra, trifasico, tierra }: Props) {
  // Espaciado vertical entre fases en trifásico.
  const dyFase = trifasico ? 8 : 0;
  const yL1 = y;
  const yL2 = y + dyFase;
  const yL3 = y + 2 * dyFase;
  const yN = (trifasico ? yL3 : y) + 12;
  const yPE = yN + 12;

  return (
    <g>
      {tieneFase && (
        <>
          <line x1={xInicio} y1={yL1} x2={xFin} y2={yL1} stroke="black" strokeWidth="3" />
          <text x={xInicio - 8} y={yL1 + 4} fontSize="9" textAnchor="end" fill="black">{trifasico ? 'L1' : 'F'}</text>
        </>
      )}
      {tieneFase && trifasico && (
        <>
          <line x1={xInicio} y1={yL2} x2={xFin} y2={yL2} stroke="#7f1d1d" strokeWidth="3" />
          <text x={xInicio - 8} y={yL2 + 4} fontSize="9" textAnchor="end" fill="#7f1d1d">L2</text>
          <line x1={xInicio} y1={yL3} x2={xFin} y2={yL3} stroke="#475569" strokeWidth="3" />
          <text x={xInicio - 8} y={yL3 + 4} fontSize="9" textAnchor="end" fill="#475569">L3</text>
        </>
      )}
      {tieneNeutro && (
        <>
          <line x1={xInicio} y1={yN} x2={xFin} y2={yN} stroke="#3b82f6" strokeWidth="2" />
          <text x={xInicio - 8} y={yN + 4} fontSize="9" textAnchor="end" fill="#3b82f6">N</text>
        </>
      )}
      {tieneTierra && (
        <>
          <line x1={xInicio} y1={yPE} x2={xFin} y2={yPE} stroke="#22c55e" strokeWidth="2" strokeDasharray="2 2" />
          <text x={xInicio - 8} y={yPE + 4} fontSize="9" textAnchor="end" fill="#22c55e">⏚</text>
          {tierra?.resistenciaOhmMedida !== undefined && (
            <text x={xFin + 6} y={yPE + 4} fontSize="9" fill="#22c55e">
              R = {tierra.resistenciaOhmMedida} Ω ({tierra.tipoElectrodo ?? '—'})
            </text>
          )}
        </>
      )}
    </g>
  );
}
