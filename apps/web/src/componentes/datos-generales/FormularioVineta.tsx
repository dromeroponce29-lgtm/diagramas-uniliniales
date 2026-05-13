import { useEffect, useState } from 'react';
import type { Tablero, Cliente, DatosVineta, ClaseSEC } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioVineta({ tablero, cliente, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const v = tablero.vineta ?? {};
  const [numeroLamina, setNumeroLamina] = useState(v.numeroLamina ?? '');
  const [revision, setRevision] = useState(v.revision ?? '');
  const [fecha, setFecha] = useState(v.fechaEmision ?? '');
  const [instalador, setInstalador] = useState(v.instaladorNombre ?? '');
  const [rut, setRut] = useState(v.instaladorRUT ?? '');
  const [clase, setClase] = useState<ClaseSEC | ''>(v.instaladorClaseSEC ?? '');
  const [proyecto, setProyecto] = useState(v.proyectoNombre ?? '');

  useEffect(() => {
    const x = tablero.vineta ?? {};
    setNumeroLamina(x.numeroLamina ?? '');
    setRevision(x.revision ?? '');
    setFecha(x.fechaEmision ?? '');
    setInstalador(x.instaladorNombre ?? '');
    setRut(x.instaladorRUT ?? '');
    setClase(x.instaladorClaseSEC ?? '');
    setProyecto(x.proyectoNombre ?? '');
  }, [tablero.vineta]);

  async function guardar() {
    const payload: DatosVineta = {
      ...(numeroLamina && { numeroLamina }),
      ...(revision && { revision }),
      ...(fecha && { fechaEmision: fecha }),
      ...(instalador && { instaladorNombre: instalador }),
      ...(rut && { instaladorRUT: rut }),
      ...(clase && { instaladorClaseSEC: clase }),
      ...(proyecto && { proyectoNombre: proyecto })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { vineta: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Viñeta del plano</h3>
      <p className="text-xs text-slate-500">
        Campos vacíos heredan del cliente: instalador {cliente?.instaladorPredeterminadoNombre ?? '—'},
        clase SEC {cliente?.instaladorPredeterminadoClaseSEC ?? '—'},
        proyecto {cliente?.proyectoNombrePredeterminado ?? '—'}.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Número de lámina
          <input type="text" value={numeroLamina} onChange={e => setNumeroLamina(e.target.value)} placeholder="Ej. E-01" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Revisión
          <input type="text" value={revision} onChange={e => setRevision(e.target.value)} placeholder="Ej. Rev 0" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Fecha de emisión
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Proyecto
          <input type="text" value={proyecto} onChange={e => setProyecto(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instalador (nombre)
          <input type="text" value={instalador} onChange={e => setInstalador(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instalador (RUT)
          <input type="text" value={rut} onChange={e => setRut(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Clase SEC
          <select value={clase} onChange={e => setClase(e.target.value as ClaseSEC)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar viñeta</button>
    </section>
  );
}
