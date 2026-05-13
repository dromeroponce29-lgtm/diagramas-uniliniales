// SVG del Interruptor General con datos RIC (In, Icu, curva, marca/modelo).
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  ig: ComponenteReconciliado;
  x: number;
  y: number;
  onClick?: () => void;
}

export function InterruptorGeneralSVG({ ig, x, y, onClick }: Props) {
  const polos = ig.polos ?? 3;
  const barras = Array.from({ length: polos }, (_, i) => i);
  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <rect x="-30" y="-20" width="60" height="40" fill="white" stroke="black" strokeWidth="2" />
      {barras.map(i => (
        <line
          key={i}
          x1={-20 + i * 12}
          y1={-15}
          x2={-12 + i * 12}
          y2={15}
          stroke="black"
          strokeWidth="2"
        />
      ))}
      <text x="35" y="-5" fontSize="11" fontFamily="sans-serif">
        IG · {ig.calibreA ?? '?'}A · {polos}P
      </text>
      <text x="35" y="8" fontSize="9" fill="#555">
        {ig.curva ?? '?'} · {ig.capacidadCortocircuitoKA ?? '?'} kA
      </text>
      <text x="35" y="20" fontSize="9" fill="#555">
        {ig.marca ?? ''} {ig.modelo ?? ''}
      </text>
    </g>
  );
}
