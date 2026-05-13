// Símbolo SVG de la acometida (entrada de energía al tablero).
import type { DatosAcometida, TensionSistema } from '@tipos/modelo';

interface Props {
  acometida: DatosAcometida;
  tensionSistema: TensionSistema;
  frecuenciaHz: number;
  x: number;
  y: number;
}

export function Acometida({ acometida, tensionSistema, frecuenciaHz, x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="0" x2="0" y2="40" stroke="black" strokeWidth="2" />
      <polygon points="-5,35 5,35 0,45" fill="black" />
      <text x="10" y="15" fontSize="11" fill="black" fontFamily="sans-serif">
        ACOMETIDA {acometida.tipo !== 'pendiente' ? `(${acometida.tipo})` : ''}
      </text>
      <text x="10" y="30" fontSize="9" fill="#666">
        {tensionSistema !== 'pendiente' ? tensionSistema : '—'} · {frecuenciaHz} Hz
      </text>
    </g>
  );
}
