import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// DPS: rectángulo con flecha apuntando hacia abajo (descarga a tierra).
export function DPS({ x, y }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-dps">
      <rect x="2" y="0" width="8" height="10" fill="white" stroke="black" strokeWidth="0.5" />
      <text x="6" y="6" fontSize="2.5" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">DPS</text>
      <line x1="6" y1="10" x2="6" y2="14" stroke="black" strokeWidth="0.5" />
      <polygon points="4,14 8,14 6,16" fill="black" />
    </g>
  );
}
