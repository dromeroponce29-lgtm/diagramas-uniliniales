// Cuadro de cargas normativo RIC N°18 — tabla por circuito.
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

function f(v: number | undefined, decimales = 1): string {
  return v === undefined ? '—' : v.toFixed(decimales).replace(/\.0+$/, '');
}

export function CuadroDeCargas({ tablero }: Props) {
  if (tablero.circuitos.length === 0) {
    return <p className="text-xs text-slate-500 italic">Cuadro de cargas — sin circuitos definidos</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b text-left text-slate-700 font-medium">
          <th className="py-1 px-1">Nº</th>
          <th className="py-1 px-1">Destino</th>
          <th className="py-1 px-1">Uso</th>
          <th className="py-1 px-1">P (W)</th>
          <th className="py-1 px-1">I (A)</th>
          <th className="py-1 px-1">mm²</th>
          <th className="py-1 px-1">Long. m</th>
          <th className="py-1 px-1">Canaliz.</th>
          <th className="py-1 px-1">Protección</th>
        </tr>
      </thead>
      <tbody>
        {tablero.circuitos.map(c => {
          const prot = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
          const protTxt = prot
            ? `C${prot.calibreA ?? '?'} ${prot.polos ?? '?'}P${prot.curva ? ` ${prot.curva}` : ''}`
            : '—';
          const canalizTxt = c.canalizacionTipo
            ? `${c.canalizacionTipo}${c.canalizacionDiametroMM ? ` Ø${c.canalizacionDiametroMM}` : ''}`
            : '—';
          return (
            <tr key={c.id} className="border-b">
              <td className="py-1 px-1">{c.numero}</td>
              <td className="py-1 px-1">{c.destino === 'pendiente' || !c.destino ? '—' : c.destino}</td>
              <td className="py-1 px-1">{c.uso === 'pendiente' ? '—' : c.uso}</td>
              <td className="py-1 px-1">{f(c.cargaW, 0)}</td>
              <td className="py-1 px-1">{f(c.corrienteA, 1)}</td>
              <td className="py-1 px-1">{f(c.seccionConductorMM2, 1)}</td>
              <td className="py-1 px-1">{f(c.longitudM, 1)}</td>
              <td className="py-1 px-1">{canalizTxt}</td>
              <td className="py-1 px-1">{protTxt}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
