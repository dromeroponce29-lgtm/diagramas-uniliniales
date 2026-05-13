import { useEffect, useState } from 'react';
import type { Tablero, DatosAcometida, TipoAcometida } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioAcometida({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const inicial: DatosAcometida = tablero.acometida ?? { tipo: 'pendiente' };
  const [tipo, setTipo] = useState<TipoAcometida>(inicial.tipo);
  const [ubicacion, setUbicacion] = useState(inicial.ubicacion ?? '');
  const [notas, setNotas] = useState(inicial.notas ?? '');

  useEffect(() => {
    const x = tablero.acometida ?? { tipo: 'pendiente' as const };
    setTipo(x.tipo);
    setUbicacion(x.ubicacion ?? '');
    setNotas(x.notas ?? '');
  }, [tablero.acometida]);

  async function guardar() {
    await actualizarDatos(clienteSlug, tableroSlug, {
      acometida: {
        tipo,
        ...(ubicacion && { ubicacion }),
        ...(notas && { notas })
      }
    });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Acometida</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Tipo
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoAcometida)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="aerea">aérea</option>
            <option value="subterranea">subterránea</option>
            <option value="desde-tablero-superior">desde tablero superior</option>
          </select>
        </label>
        <label className="text-sm">
          Ubicación
          <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" placeholder="Ej. Frontis edificio" />
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar acometida</button>
    </section>
  );
}
