import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

export function Generico({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-generico">
      <rect x="2" y="0" width="8" height="12" fill="white" stroke="black" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="6" y="7" fontSize="2" fontFamily="sans-serif" textAnchor="middle">{componente.tipo.substring(0, 4)}</text>
    </g>
  );
}
