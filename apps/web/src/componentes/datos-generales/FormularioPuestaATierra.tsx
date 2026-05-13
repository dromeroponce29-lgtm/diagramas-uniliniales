import { useEffect, useState } from 'react';
import type { Tablero, DatosPuestaATierra, TipoElectrodoTierra } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioPuestaATierra({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const p = tablero.puestaATierra ?? {};
  const [rMedida, setRMedida] = useState(p.resistenciaOhmMedida?.toString() ?? '');
  const [rProyectada, setRProyectada] = useState(p.resistenciaOhmProyectada?.toString() ?? '');
  const [instrumento, setInstrumento] = useState(p.instrumentoMedicion ?? '');
  const [fecha, setFecha] = useState(p.fechaMedicion ?? '');
  const [electrodo, setElectrodo] = useState<TipoElectrodoTierra>(p.tipoElectrodo ?? 'pendiente');
  const [notas, setNotas] = useState(p.notas ?? '');

  useEffect(() => {
    const x = tablero.puestaATierra ?? {};
    setRMedida(x.resistenciaOhmMedida?.toString() ?? '');
    setRProyectada(x.resistenciaOhmProyectada?.toString() ?? '');
    setInstrumento(x.instrumentoMedicion ?? '');
    setFecha(x.fechaMedicion ?? '');
    setElectrodo(x.tipoElectrodo ?? 'pendiente');
    setNotas(x.notas ?? '');
  }, [tablero.puestaATierra]);

  const numOpt = (s: string): number | undefined => s ? Number(s) : undefined;

  async function guardar() {
    const payload: DatosPuestaATierra = {
      ...(numOpt(rMedida) !== undefined && { resistenciaOhmMedida: numOpt(rMedida) }),
      ...(numOpt(rProyectada) !== undefined && { resistenciaOhmProyectada: numOpt(rProyectada) }),
      ...(instrumento && { instrumentoMedicion: instrumento }),
      ...(fecha && { fechaMedicion: fecha }),
      tipoElectrodo: electrodo,
      ...(notas && { notas })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { puestaATierra: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Puesta a tierra</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Resistencia medida (Ω)
          <input type="number" step="0.01" value={rMedida} onChange={e => setRMedida(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Resistencia proyectada (Ω)
          <input type="number" step="0.01" value={rProyectada} onChange={e => setRProyectada(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instrumento de medición
          <input type="text" value={instrumento} onChange={e => setInstrumento(e.target.value)} placeholder="Ej. Telurímetro Fluke 1623-2" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Fecha de medición
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Tipo de electrodo
          <select value={electrodo} onChange={e => setElectrodo(e.target.value as TipoElectrodoTierra)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="jabalina">jabalina</option>
            <option value="malla">malla</option>
            <option value="multielectrodo">multielectrodo</option>
          </select>
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar puesta a tierra</button>
    </section>
  );
}
