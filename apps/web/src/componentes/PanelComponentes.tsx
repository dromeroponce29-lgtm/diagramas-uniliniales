import { useState } from 'react';
import type { Tablero, ComponenteReconciliado } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';
import { ResolverDiscrepancia } from './ResolverDiscrepancia.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
  componenteResaltadoId?: string | null;
}

export function PanelComponentes({ tablero, clienteSlug, tableroSlug, componenteResaltadoId }: Props) {
  const { actualizarComponente } = useTableroStore();
  const [resolviendo, setResolviendo] = useState<ComponenteReconciliado | null>(null);

  return (
    <section className="bg-white rounded-lg shadow flex flex-col h-full">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">Componentes y circuitos ({tablero.componentes.length})</h2>
      </header>

      <div className="flex-1 overflow-auto">
        {tablero.componentes.length === 0 && (
          <div className="p-8 text-sm text-slate-500 text-center">
            Sin componentes todavía. Sube una foto del tablero para empezar.
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Calibre</th>
              <th className="px-3 py-2">Marca/Modelo</th>
              <th className="px-3 py-2">Confianza</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tablero.componentes.map(c => (
              <tr key={c.id} className={`border-b last:border-b-0 ${c.id === componenteResaltadoId ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-2">{c.tipo}</td>
                <td className="px-3 py-2">{c.calibreA ? `${c.calibreA} A` : '—'}{c.polos ? ` · ${c.polos}P` : ''}</td>
                <td className="px-3 py-2">{c.marca ?? '—'} {c.modelo ?? ''}</td>
                <td className="px-3 py-2">
                  <span className={claseConfianza(c.procedencia.confianza)}>
                    {c.procedencia.confianza}
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5">{c.procedencia.fuente}</div>
                </td>
                <td className="px-3 py-2">
                  {c.procedencia.confianza === 'discrepancia' && (
                    <button onClick={() => setResolviendo(c)}
                      className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded">
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolviendo && (
        <ResolverDiscrepancia
          componente={resolviendo}
          onCerrar={() => setResolviendo(null)}
          onResolver={async parche => {
            await actualizarComponente(clienteSlug, tableroSlug, resolviendo.id, parche);
            setResolviendo(null);
          }}
        />
      )}
    </section>
  );
}

function claseConfianza(c: string): string {
  switch (c) {
    case 'alta': return 'px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs';
    case 'media': return 'px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs';
    case 'baja': return 'px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-xs';
    case 'discrepancia': return 'px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs';
    default: return 'text-xs';
  }
}
