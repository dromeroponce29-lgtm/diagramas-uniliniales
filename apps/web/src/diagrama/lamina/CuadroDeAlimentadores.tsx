// Cuadro del alimentador de entrada — datos RIC N°18.
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

function f(v: number | undefined, dec = 1): string {
  return v === undefined ? '—' : v.toFixed(dec).replace(/\.0+$/, '');
}

export function CuadroDeAlimentadores({ tablero }: Props) {
  const a = tablero.alimentadorEntrada ?? {};
  const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b text-left text-slate-700 font-medium">
          <th className="py-1 px-1">Alimentador</th>
          <th className="py-1 px-1">mm²</th>
          <th className="py-1 px-1">Long.</th>
          <th className="py-1 px-1">Canaliz.</th>
          <th className="py-1 px-1">Capac. A</th>
          <th className="py-1 px-1">In</th>
          <th className="py-1 px-1">Icu kA</th>
          <th className="py-1 px-1">Curva</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-1 px-1">Acometida → {tablero.codigo}</td>
          <td className="py-1 px-1">{f(a.seccionConductorMM2)}</td>
          <td className="py-1 px-1">{f(a.longitudM)}</td>
          <td className="py-1 px-1">
            {a.canalizacionTipo
              ? `${a.canalizacionTipo} Ø${a.canalizacionDiametroMM ?? '?'} ${a.canalizacionMaterial ?? ''}`.trim()
              : '—'}
          </td>
          <td className="py-1 px-1">{f(a.capacidadCorrienteA, 0)}</td>
          <td className="py-1 px-1">{ig?.calibreA ?? '—'}A</td>
          <td className="py-1 px-1">{ig?.capacidadCortocircuitoKA ?? '—'}</td>
          <td className="py-1 px-1">{ig?.curva ?? '—'}</td>
        </tr>
      </tbody>
    </table>
  );
}
