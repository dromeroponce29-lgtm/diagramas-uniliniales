import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// El interruptor general es visualmente igual a un automático pero más grande
// y con etiqueta "IG".
export function InterruptorGeneral({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-int-general">
      <rect x="2" y="0" width="8" height="14" fill="white" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="0" x2="6" y2="3" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="3" x2="10" y2="8" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="11" x2="6" y2="14" stroke="black" strokeWidth="0.7" />
      <text x="3" y="13" fontSize="2" fontFamily="sans-serif" fontWeight="bold">IG</text>
      <text x="12" y="7" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
