import { useEffect, useState } from 'react';
import type { Tablero, TensionSistema, EsquemaTierra } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioDatosElectricos({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [tension, setTension] = useState<TensionSistema>(tablero.tensionSistema);
  const [esquema, setEsquema] = useState<EsquemaTierra>(tablero.esquemaTierra);
  const [potencia, setPotencia] = useState(tablero.potenciaContratadaKW?.toString() ?? '');
  const [corriente, setCorriente] = useState(tablero.corrienteNominalA?.toString() ?? '');
  const [espacios, setEspacios] = useState(tablero.espaciosTotales?.toString() ?? '');
  const [frecuencia, setFrecuencia] = useState(tablero.frecuenciaHz?.toString() ?? '50');
  const [capacidad, setCapacidad] = useState(tablero.capacidadNominalA?.toString() ?? '');

  useEffect(() => {
    setTension(tablero.tensionSistema);
    setEsquema(tablero.esquemaTierra);
    setPotencia(tablero.potenciaContratadaKW?.toString() ?? '');
    setCorriente(tablero.corrienteNominalA?.toString() ?? '');
    setEspacios(tablero.espaciosTotales?.toString() ?? '');
    setFrecuencia(tablero.frecuenciaHz?.toString() ?? '50');
    setCapacidad(tablero.capacidadNominalA?.toString() ?? '');
  }, [tablero]);

  const num = (s: string) => s ? Number(s) : undefined;

  async function guardar() {
    const pN = num(potencia), cN = num(corriente), eN = num(espacios), fN = num(frecuencia), kN = num(capacidad);
    await actualizarDatos(clienteSlug, tableroSlug, {
      tensionSistema: tension,
      esquemaTierra: esquema,
      ...(pN !== undefined && !Number.isNaN(pN) && { potenciaContratadaKW: pN }),
      ...(cN !== undefined && !Number.isNaN(cN) && { corrienteNominalA: cN }),
      ...(eN !== undefined && !Number.isNaN(eN) && { espaciosTotales: eN }),
      ...(fN !== undefined && !Number.isNaN(fN) && { frecuenciaHz: fN }),
      ...(kN !== undefined && !Number.isNaN(kN) && { capacidadNominalA: kN })
    });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Datos eléctricos</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Tensión del sistema
          <select value={tension} onChange={e => setTension(e.target.value as TensionSistema)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="220V-mono">220V monofásico</option>
            <option value="380V-trif">380V trifásico</option>
            <option value="380V/220V-trif-n">380V/220V trifásico + N</option>
          </select>
        </label>
        <label className="text-sm">
          Esquema de tierra
          <select value={esquema} onChange={e => setEsquema(e.target.value as EsquemaTierra)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="TT">TT</option>
            <option value="TN-S">TN-S</option>
            <option value="TN-C-S">TN-C-S</option>
            <option value="IT">IT</option>
          </select>
        </label>
        <label className="text-sm">
          Frecuencia (Hz)
          <input type="number" value={frecuencia} onChange={e => setFrecuencia(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Potencia contratada (kW)
          <input type="number" step="0.1" value={potencia} onChange={e => setPotencia(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Corriente nominal (A)
          <input type="number" step="0.1" value={corriente} onChange={e => setCorriente(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Capacidad nominal del gabinete (A)
          <input type="number" step="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Espacios totales
          <input type="number" min="1" value={espacios} onChange={e => setEspacios(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar datos eléctricos</button>
    </section>
  );
}
