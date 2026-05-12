import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; ancho: number; componente: ComponenteReconciliado; }

export function Barra({ x, y, ancho, componente }: Props) {
  const color = componente.tipo === 'barra-tierra' ? '#10b981'
    : componente.tipo === 'barra-neutro' ? '#3b82f6'
    : 'black';
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-barra">
      <line x1="0" y1="0" x2={ancho} y2="0" stroke={color} strokeWidth="1.5" />
    </g>
  );
}
