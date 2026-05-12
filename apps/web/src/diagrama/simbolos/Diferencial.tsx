import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// Símbolo IEC del diferencial residual: rectángulo con doble línea diagonal
// y marca de sensibilidad (Δ).
export function Diferencial({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-diferencial">
      <rect x="2" y="0" width="8" height="12" fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="2" y1="3" x2="10" y2="3" stroke="black" strokeWidth="0.5" />
      <text x="3" y="5.5" fontSize="2" fontFamily="sans-serif">Δ</text>
      <text x="6" y="9" fontSize="2" fontFamily="sans-serif" textAnchor="middle">
        {componente.sensibilidadMA ? `${componente.sensibilidadMA}mA` : '?'}
      </text>
      <text x="12" y="6" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
