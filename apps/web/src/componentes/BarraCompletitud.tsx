import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

export function BarraCompletitud({ tablero }: Props) {
  const pct = tablero.porcentajeCompletitud;
  const pendientesNoResueltos = tablero.pendientes.filter(p => !p.resueltoEn).length;
  const discrepancias = tablero.componentes.filter(c => c.procedencia.confianza === 'discrepancia').length;

  const colorBarra = pct < 50 ? 'bg-red-500' : pct < 90 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold">{tablero.codigo} — {tablero.nombre}</h1>
          <p className="text-xs text-slate-500">{tablero.tipo} · {tablero.ubicacion ?? 'sin ubicación'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{pct}%</div>
          <div className="text-xs text-slate-500">
            {pendientesNoResueltos} pendiente{pendientesNoResueltos === 1 ? '' : 's'} · {discrepancias} discrepancia{discrepancias === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
        <div className={`h-full transition-all ${colorBarra}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
