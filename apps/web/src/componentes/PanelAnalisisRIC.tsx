import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Tablero, AnotacionHallazgo, PlanNormalizacion } from '@tipos/modelo';
import { apiPlanes } from '../api/cliente.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';
import { tableroEstaVacio } from '../../../../tipos/ric/empty-state.js';
import { useTableroStore } from '../estado/tableroStore.js';
import { AccionesHallazgo } from './AccionesHallazgo.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

function emojiResultado(r: string) {
  if (r === 'cumple') return '✓';
  if (r === 'no-cumple') return '❌';
  return '⏳';
}

export function PanelAnalisisRIC({ tablero, clienteSlug, tableroSlug }: Props) {
  const { reemplazarAnotacionesHallazgos } = useTableroStore();
  const [tab, setTab] = useState<'hallazgos' | 'terreno'>('hallazgos');

  // Hooks deben ejecutarse siempre antes de cualquier return condicional
  const hallazgos = useMemo(() => evaluarRIC(tablero), [tablero]);
  const levantamientos = useMemo(() => derivarLevantamientosTerreno(tablero), [tablero]);

  function anotacionesPara(reglaId: string, componenteId?: string, circuitoId?: string): AnotacionHallazgo[] {
    return tablero.anotacionesHallazgos.filter(a =>
      a.reglaId === reglaId &&
      a.componenteId === componenteId &&
      a.circuitoId === circuitoId
    );
  }

  function agregarAnotacion(a: AnotacionHallazgo) {
    void reemplazarAnotacionesHallazgos(clienteSlug, tableroSlug, [...tablero.anotacionesHallazgos, a]);
  }

  function eliminarAnotacion(id: string) {
    void reemplazarAnotacionesHallazgos(
      clienteSlug, tableroSlug,
      tablero.anotacionesHallazgos.filter(a => a.id !== id)
    );
  }

  const ordenados = useMemo(() => {
    return [...hallazgos].sort((a, b) => {
      const sa = anotacionesPara(a.reglaId, a.componenteId, a.circuitoId).some(an => an.tipo === 'no-aplica');
      const sb = anotacionesPara(b.reglaId, b.componenteId, b.circuitoId).some(an => an.tipo === 'no-aplica');
      if (sa !== sb) return sa ? 1 : -1;
      const orden = { 'no-cumple': 0, 'pendiente-verificar': 1, 'cumple': 2 };
      return orden[a.resultado] - orden[b.resultado];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallazgos, tablero.anotacionesHallazgos]);

  // Todos los hooks están arriba; ahora es seguro hacer early-return condicional.
  if (tableroEstaVacio(tablero)) {
    return (
      <div className="bg-white border rounded p-4 h-full">
        <h2 className="font-semibold mb-3">Análisis RIC</h2>
        <div className="text-center py-8 space-y-3">
          <p className="text-slate-700 font-medium">Tablero sin datos</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Para que aparezca el análisis RIC necesitamos al menos uno de:
          </p>
          <ul className="text-sm text-slate-500 list-disc list-inside max-w-md mx-auto text-left">
            <li>Fotos del tablero subidas</li>
            <li>Datos manuales en el tab "Datos generales"</li>
            <li>Componentes o circuitos ingresados manualmente</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded p-4 h-full overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">Análisis RIC</h2>
        <div className="ml-auto flex border rounded overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${tab === 'hallazgos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            onClick={() => setTab('hallazgos')}
          >Hallazgos ({hallazgos.length})</button>
          <button
            className={`px-2 py-1 ${tab === 'terreno' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            onClick={() => setTab('terreno')}
          >Levantamientos terreno ({levantamientos.length})</button>
        </div>
      </div>

      {tab === 'hallazgos' && (
        <>
          <p className="text-xs text-slate-500 mb-2 italic">
            Desviaciones técnicas del tablero respecto a los Pliegos Técnicos RIC (SEC Chile) y normas internacionales aplicables.
          </p>
          <ul className="space-y-3">
          {ordenados.map((h, i) => {
            const anots = anotacionesPara(h.reglaId, h.componenteId, h.circuitoId);
            const silenciado = anots.some(a => a.tipo === 'no-aplica');
            return (
              <li key={`${h.reglaId}-${i}`} className={`p-2 border rounded ${silenciado ? 'bg-slate-50 text-slate-400 line-through' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{emojiResultado(h.resultado)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{h.descripcionRegla}</div>
                    <div className="text-xs text-slate-600">{h.detalle}</div>
                  </div>
                  <span className="text-xs text-slate-500">{h.parteRIC}</span>
                </div>
                {!silenciado && h.resultado !== 'cumple' && (
                  <AccionesHallazgo
                    hallazgo={h}
                    anotacionesExistentes={anots}
                    onAgregar={agregarAnotacion}
                    onEliminar={eliminarAnotacion}
                  />
                )}
                {silenciado && (
                  <div className="mt-1 text-xs text-slate-500">
                    Silenciado: {anots.find(a => a.tipo === 'no-aplica')?.justificacion}
                  </div>
                )}
              </li>
            );
          })}
          </ul>
        </>
      )}

      {tab === 'terreno' && (
        <>
          <p className="text-xs text-slate-500 mb-2 italic">
            Datos que faltan en componentes y conexiones del tablero para completar el diagrama unilineal. No incluyen
            cuestiones de cumplimiento normativo — esas viven en la pestaña "Hallazgos".
          </p>
          <ul className="space-y-2">
            {levantamientos.length === 0 && (
              <li className="text-sm text-slate-500">Sin levantamientos pendientes — el diagrama tiene toda la información.</li>
            )}
            {levantamientos.map(l => (
              <li key={l.id} className="p-2 border rounded flex items-start gap-2">
                <span className={`text-xs px-1 rounded ${
                  l.prioridad === 'alta' ? 'bg-red-100 text-red-700' :
                  l.prioridad === 'media' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>{l.prioridad}</span>
                <div className="flex-1">
                  <div className="text-sm">{l.descripcion}</div>
                  <div className="text-xs text-slate-500">
                    {l.categoria ? `${l.categoria}` : `origen: ${l.origen}`}
                    {l.instrumentoSugerido && ` · instrumento: ${l.instrumentoSugerido}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <SeccionPlanes clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}

function SeccionPlanes({ clienteSlug, tableroSlug }: { clienteSlug: string; tableroSlug: string }) {
  const [planes, setPlanes] = useState<PlanNormalizacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function recargar() {
    apiPlanes.listar(clienteSlug, tableroSlug).then(setPlanes).catch(e => setError(String(e)));
  }
  useEffect(recargar, [clienteSlug, tableroSlug]);

  async function nuevoPlan() {
    try {
      const p = await apiPlanes.crear(clienteSlug, tableroSlug, { autoSugerir: true });
      navigate(`/clientes/${clienteSlug}/tableros/${tableroSlug}/planes/${p.id}`);
    } catch (e) { setError(String(e)); }
  }

  return (
    <section className="mt-4 border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Planes de normalización ({planes.length})</h3>
        <button onClick={nuevoPlan} className="text-sm text-blue-600 hover:underline">+ Nuevo plan</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {planes.length === 0 ? (
        <p className="text-slate-500 italic text-sm">Aún no hay planes de normalización para este tablero.</p>
      ) : (
        <ul className="text-sm space-y-1">
          {planes.slice().reverse().map(p => (
            <li key={p.id} className="flex items-center justify-between">
              <Link
                to={`/clientes/${clienteSlug}/tableros/${tableroSlug}/planes/${p.id}`}
                className="text-blue-600 hover:underline"
              >Plan #{p.numero}</Link>
              <span className="text-slate-600">CLP {p.totalCLP.toLocaleString('es-CL')} · {p.estado}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
