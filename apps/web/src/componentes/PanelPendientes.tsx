import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function PanelPendientes({ tablero }: Props) {
  const pendientesNoResueltos = tablero.pendientes.filter(p => !p.resueltoEn);

  return (
    <section className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Pendientes</h2>

      <h3 className="font-medium text-sm mb-2">Pendientes ({pendientesNoResueltos.length})</h3>
      {pendientesNoResueltos.length === 0 ? (
        <div className="text-xs text-slate-500">Sin pendientes — todo lo que se ha levantado está completo.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {pendientesNoResueltos.map(p => (
            <li key={p.id} className="border-l-2 border-orange-400 pl-2">
              <div>{p.descripcion}</div>
              <div className="text-xs text-slate-500">Resoluble por: {p.resoluble}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
