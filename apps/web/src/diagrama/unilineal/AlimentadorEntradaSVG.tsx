// SVG del alimentador de entrada con etiqueta normativa RIC N°18.
import type { DatosAlimentadorEntrada } from '@tipos/modelo';

interface Props {
  alimentador: DatosAlimentadorEntrada;
  x: number;
  yInicio: number;
  yFin: number;
}

export function AlimentadorEntradaSVG({ alimentador, x, yInicio, yFin }: Props) {
  const a = alimentador;
  const tieneDatos = a.seccionConductorMM2 || a.longitudM || a.canalizacionTipo;
  return (
    <g>
      <line x1={x} y1={yInicio} x2={x} y2={yFin} stroke="black" strokeWidth="2" />
      {tieneDatos && (
        <g transform={`translate(${x + 10}, ${(yInicio + yFin) / 2 - 16})`}>
          <rect x="0" y="0" width="160" height="44" fill="#fffbe6" stroke="#999" strokeWidth="0.5" />
          <text x="6" y="14" fontSize="10" fontFamily="sans-serif">
            {a.seccionConductorMM2 ? `${a.seccionConductorMM2} mm²` : 'mm² —'}
            {a.conductoresPorFase && a.conductoresPorFase > 1 ? ` × ${a.conductoresPorFase}` : ''}
            {a.longitudM ? ` · ${a.longitudM} m` : ''}
          </text>
          <text x="6" y="28" fontSize="9" fill="#555">
            {a.canalizacionTipo ?? '—'}{a.canalizacionDiametroMM ? ` Ø${a.canalizacionDiametroMM}` : ''}
            {a.canalizacionMaterial ? ` ${a.canalizacionMaterial}` : ''}
          </text>
          <text x="6" y="40" fontSize="9" fill="#555">
            Capac. {a.capacidadCorrienteA ?? '—'} A
          </text>
        </g>
      )}
    </g>
  );
}
