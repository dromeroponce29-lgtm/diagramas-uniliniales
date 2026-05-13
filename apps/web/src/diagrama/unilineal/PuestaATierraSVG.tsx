// SVG de la puesta a tierra: electrodo + resistencia + esquema.
import type { DatosPuestaATierra, EsquemaTierra } from '@tipos/modelo';

interface Props {
  tierra: DatosPuestaATierra & { esquema: EsquemaTierra };
  x: number;
  y: number;
}

export function PuestaATierraSVG({ tierra, x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="-20" x2="0" y2="0" stroke="#22c55e" strokeWidth="2" />
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#22c55e" strokeWidth="2" />
      <line x1="-8" y1="5" x2="8" y2="5" stroke="#22c55e" strokeWidth="2" />
      <line x1="-4" y1="10" x2="4" y2="10" stroke="#22c55e" strokeWidth="2" />
      <text x="18" y="0" fontSize="9" fill="#22c55e" fontFamily="sans-serif">
        Tierra · {tierra.esquema} {tierra.resistenciaOhmMedida !== undefined ? ` · ${tierra.resistenciaOhmMedida} Ω` : ''}
      </text>
      {tierra.tipoElectrodo && (
        <text x="18" y="12" fontSize="8" fill="#16a34a">
          {tierra.tipoElectrodo}
        </text>
      )}
    </g>
  );
}
