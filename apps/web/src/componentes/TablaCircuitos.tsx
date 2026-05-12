import { useMemo } from 'react';
import { ulid } from 'ulid';
import type { Tablero, Circuito, UsoCircuito } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const USOS: UsoCircuito[] = [
  'iluminacion', 'enchufes', 'fuerza', 'calefaccion',
  'climatizacion', 'cocina', 'otro', 'pendiente'
];

export function TablaCircuitos({ tablero, clienteSlug, tableroSlug }: Props) {
  const { reemplazarCircuitos } = useTableroStore();

  // Filas inicializadas a partir de automáticos sin circuito asignado.
  const filasMostrar = useMemo<Circuito[]>(() => {
    if (tablero.circuitos.length > 0) return tablero.circuitos;
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
    return automaticos.map((c, i): Circuito => ({
      id: ulid(),
      numero: i + 1,
      proteccionComponenteId: c.id,
      destino: 'pendiente',
      uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'baja' }
    }));
  }, [tablero.circuitos, tablero.componentes]);

  async function guardar(circuitos: Circuito[]) {
    await reemplazarCircuitos(clienteSlug, tableroSlug, circuitos);
  }

  function actualizarFila(id: string, parche: Partial<Circuito>) {
    const nuevos = filasMostrar.map(c => c.id === id ? { ...c, ...parche } : c);
    void guardar(nuevos);
  }

  function eliminarFila(id: string) {
    void guardar(filasMostrar.filter(c => c.id !== id));
  }

  function agregarFila() {
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
    const primerAuto = automaticos[0];
    if (!primerAuto) return;
    const nuevoNumero = (filasMostrar.at(-1)?.numero ?? 0) + 1;
    void guardar([...filasMostrar, {
      id: ulid(),
      numero: nuevoNumero,
      proteccionComponenteId: primerAuto.id,
      destino: 'pendiente',
      uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'baja' }
    }]);
  }

  const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const diferenciales = tablero.componentes.filter(c => c.tipo === 'diferencial');

  return (
    <div className="space-y-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-slate-600">
            <th className="py-2 pr-2">Nº</th>
            <th className="py-2 pr-2">Protección</th>
            <th className="py-2 pr-2">Diferencial</th>
            <th className="py-2 pr-2">Destino</th>
            <th className="py-2 pr-2">Uso</th>
            <th className="py-2 pr-2">mm²</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {filasMostrar.map(c => (
            <tr key={c.id} className="border-b">
              <td className="py-1 pr-2">
                <input
                  type="number"
                  value={c.numero}
                  onChange={e => actualizarFila(c.id, { numero: Number(e.target.value) })}
                  className="w-12 border rounded px-1"
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.proteccionComponenteId}
                  onChange={e => actualizarFila(c.id, { proteccionComponenteId: e.target.value })}
                  className="border rounded px-1"
                >
                  {automaticos.map(a => (
                    <option key={a.id} value={a.id}>
                      {`C${a.calibreA ?? '?'} (${a.id.slice(-4)})`}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.diferencialComponenteId ?? ''}
                  onChange={e => actualizarFila(c.id, { diferencialComponenteId: e.target.value || undefined })}
                  className="border rounded px-1"
                >
                  <option value="">—</option>
                  {diferenciales.map(d => (
                    <option key={d.id} value={d.id}>
                      {`${d.sensibilidadMA ?? '?'}mA (${d.id.slice(-4)})`}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <input
                  type="text"
                  value={c.destino === 'pendiente' ? '' : c.destino}
                  placeholder="pendiente"
                  onChange={e => actualizarFila(c.id, { destino: e.target.value || 'pendiente' })}
                  className="w-32 border rounded px-1"
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.uso}
                  onChange={e => actualizarFila(c.id, { uso: e.target.value as UsoCircuito })}
                  className="border rounded px-1"
                >
                  {USOS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td className="py-1 pr-2">
                <input
                  type="number"
                  step="0.5"
                  value={c.seccionConductorMM2 ?? ''}
                  onChange={e => actualizarFila(c.id, {
                    seccionConductorMM2: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-16 border rounded px-1"
                />
              </td>
              <td className="py-1 text-right">
                <button
                  onClick={() => eliminarFila(c.id)}
                  className="text-red-600 hover:underline text-xs"
                >Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={agregarFila}
        className="text-sm text-blue-600 hover:underline"
        disabled={automaticos.length === 0}
      >+ Agregar circuito</button>
      {filasMostrar.length === 0 && (
        <p className="text-sm text-slate-500">
          Aún no hay automáticos detectados. Sube fotos del tablero o agrega componentes manualmente.
        </p>
      )}
    </div>
  );
}
