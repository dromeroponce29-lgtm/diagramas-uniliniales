import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTableroStore } from '../estado/tableroStore.js';
import { BarraCompletitud } from '../componentes/BarraCompletitud.js';
import { PanelFotos } from '../componentes/PanelFotos.js';
import { PanelComponentes } from '../componentes/PanelComponentes.js';
import { PanelPendientes } from '../componentes/PanelPendientes.js';

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  const { tablero, cargando, error, cargar, limpiar } = useTableroStore();

  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  if (cargando) return <div className="p-8 text-slate-500">Cargando tablero...</div>;
  if (error) return (
    <div className="p-8">
      <Link to="/clientes" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded text-red-900">{error}</div>
    </div>
  );
  if (!tablero) return null;

  return (
    <div className="min-h-full flex flex-col">
      <BarraCompletitud tablero={tablero} />
      <div className="px-6 py-2">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Lista de clientes</Link>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-6">
        <div className="col-span-3">
          <PanelFotos tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-5">
          <PanelComponentes tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-4">
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded p-6 h-full text-center text-slate-500">
            Diagrama unilineal — se construye en el Plan 3.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-6">
          <PanelPendientes tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-6">
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded p-4 text-center text-slate-500">
            Hallazgos RIC — se construyen en el Plan 4.
          </div>
        </div>
      </div>
    </div>
  );
}
