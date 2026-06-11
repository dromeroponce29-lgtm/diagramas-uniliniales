import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTableroStore } from '../estado/tableroStore.js';
import { useClienteStore } from '../estado/clienteStore.js';
import { useTabActiva } from '../hooks/useTabActiva.js';
import { BarraCompletitud } from '../componentes/BarraCompletitud.js';
import { TabDatosGenerales } from '../componentes/tabs/TabDatosGenerales.js';
import { TabFotosComponentes } from '../componentes/tabs/TabFotosComponentes.js';
import { TabDiagrama } from '../componentes/tabs/TabDiagrama.js';
import { TabAnalisisRIC } from '../componentes/tabs/TabAnalisisRIC.js';

type TabId = 'datos-generales' | 'fotos-componentes' | 'diagrama' | 'ric';
const TABS_PERMITIDAS: readonly TabId[] = ['datos-generales', 'fotos-componentes', 'diagrama', 'ric'];

const NOMBRES_TAB: Record<TabId, string> = {
  'datos-generales': 'Datos generales',
  'fotos-componentes': 'Fotos y componentes',
  'diagrama': 'Diagrama',
  'ric': 'Análisis RIC'
};

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  const { tablero, cargando, error, cargar, limpiar } = useTableroStore();
  const { clientes, cargarTodos } = useClienteStore();
  const [componenteResaltadoId, setComponenteResaltadoId] = useState<string | null>(null);
  const { tab, setTab } = useTabActiva<TabId>('fotos-componentes', TABS_PERMITIDAS);

  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  useEffect(() => {
    if (clientes.length === 0) cargarTodos();
  }, [clientes.length, cargarTodos]);

  if (cargando) return <div className="p-8 text-slate-500">Cargando tablero...</div>;
  if (error) return (
    <div className="p-8">
      <Link to="/clientes" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded text-red-900">{error}</div>
    </div>
  );
  if (!tablero) return null;

  const cliente = clientes.find(c => c.slug === clienteSlug);

  return (
    <div className="min-h-full flex flex-col">
      <BarraCompletitud tablero={tablero} />
      <div className="px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Lista de clientes</Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/clientes/${clienteSlug}/tableros/${tableroSlug}/informe`}
            className="text-sm px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-700 font-medium"
            title="Genera un informe técnico completo apto para entregar al cliente. Incluye portada, datos generales, diagrama unilineal, cuadros y plan de normalización."
          >📄 Generar informe completo PDF</Link>
          <a
            href={`/api/clientes/${clienteSlug}/tableros/${tableroSlug}/exportar.xlsx`}
            className="text-sm px-3 py-1 border rounded text-blue-700 hover:bg-blue-50"
            target="_blank"
            rel="noopener noreferrer"
          >Exportar a Excel ↓</a>
        </div>
      </div>
      <div className="px-6 border-b">
        <nav className="flex gap-1">
          {TABS_PERMITIDAS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {NOMBRES_TAB[t]}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-6">
        {tab === 'datos-generales' && (
          <TabDatosGenerales
            tablero={tablero}
            cliente={cliente}
            clienteSlug={clienteSlug!}
            tableroSlug={tableroSlug!}
          />
        )}
        {tab === 'fotos-componentes' && (
          <TabFotosComponentes
            tablero={tablero}
            clienteSlug={clienteSlug!}
            tableroSlug={tableroSlug!}
            componenteResaltadoId={componenteResaltadoId}
          />
        )}
        {tab === 'diagrama' && (
          <TabDiagrama
            tablero={tablero}
            cliente={cliente}
            clienteSlug={clienteSlug}
            tableroSlug={tableroSlug}
            onClicComponente={setComponenteResaltadoId}
          />
        )}
        {tab === 'ric' && (
          <TabAnalisisRIC tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        )}
      </div>
    </div>
  );
}
