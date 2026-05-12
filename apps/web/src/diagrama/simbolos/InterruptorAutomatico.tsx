import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  x: number;
  y: number;
  componente: ComponenteReconciliado;
}

// Símbolo IEC 60617 del interruptor magnetotérmico: rectángulo con barra
// inclinada interna. Etiqueta con calibre y polos a un lado.
export function InterruptorAutomatico({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-automatico">
      <rect x="3" y="0" width="6" height="12" fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="0" x2="6" y2="2" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="2" x2="9" y2="6" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="10" x2="6" y2="12" stroke="black" strokeWidth="0.5" />
      <text x="12" y="6" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
