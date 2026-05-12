import { useState, useEffect } from 'react';
import type { Tablero, TensionSistema, EsquemaTierra } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const OPCIONES_TENSION: { valor: TensionSistema; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: '— pendiente —' },
  { valor: '220V-mono', etiqueta: '220 V monofásico' },
  { valor: '380V-trif', etiqueta: '380 V trifásico (sin neutro)' },
  { valor: '380V/220V-trif-n', etiqueta: '380/220 V trifásico (con neutro)' }
];

const OPCIONES_TIERRA: { valor: EsquemaTierra; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: '— pendiente —' },
  { valor: 'TT', etiqueta: 'TT' },
  { valor: 'TN-S', etiqueta: 'TN-S' },
  { valor: 'TN-C-S', etiqueta: 'TN-C-S' },
  { valor: 'IT', etiqueta: 'IT' }
];

export function PanelPendientes({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [tensionSistema, setTensionSistema] = useState<TensionSistema>(tablero.tensionSistema);
  const [esquemaTierra, setEsquemaTierra] = useState<EsquemaTierra>(tablero.esquemaTierra);
  const [potencia, setPotencia] = useState<string>(tablero.potenciaContratadaKW?.toString() ?? '');
  const [corriente, setCorriente] = useState<string>(tablero.corrienteNominalA?.toString() ?? '');

  useEffect(() => {
    setTensionSistema(tablero.tensionSistema);
    setEsquemaTierra(tablero.esquemaTierra);
    setPotencia(tablero.potenciaContratadaKW?.toString() ?? '');
    setCorriente(tablero.corrienteNominalA?.toString() ?? '');
  }, [tablero]);

  async function alGuardar() {
    const pNum = potencia.trim() ? Number(potencia) : undefined;
    const cNum = corriente.trim() ? Number(corriente) : undefined;
    await actualizarDatos(clienteSlug, tableroSlug, {
      tensionSistema,
      esquemaTierra,
      ...(pNum !== undefined && !Number.isNaN(pNum) && { potenciaContratadaKW: pNum }),
      ...(cNum !== undefined && !Number.isNaN(cNum) && { corrienteNominalA: cNum })
    });
  }

  const pendientesNoResueltos = tablero.pendientes.filter(p => !p.resueltoEn);

  return (
    <section className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Datos del tablero y pendientes</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Tensión del sistema</span>
          <select value={tensionSistema} onChange={e => setTensionSistema(e.target.value as TensionSistema)}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm">
            {OPCIONES_TENSION.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Esquema de tierra</span>
          <select value={esquemaTierra} onChange={e => setEsquemaTierra(e.target.value as EsquemaTierra)}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm">
            {OPCIONES_TIERRA.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Potencia contratada (kW)</span>
          <input value={potencia} onChange={e => setPotencia(e.target.value)} type="number" step="0.1"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Corriente nominal (A)</span>
          <input value={corriente} onChange={e => setCorriente(e.target.value)} type="number" step="0.1"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
        </label>
      </div>

      <button onClick={alGuardar}
        className="mb-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
        Guardar datos manuales
      </button>

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
