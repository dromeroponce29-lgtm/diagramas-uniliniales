import { useEffect, useState } from 'react';
import type { Tablero } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioNotasGenerales({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [notas, setNotas] = useState(tablero.notasGenerales ?? '');

  useEffect(() => {
    setNotas(tablero.notasGenerales ?? '');
  }, [tablero.notasGenerales]);

  async function guardar() {
    await actualizarDatos(clienteSlug, tableroSlug, { notasGenerales: notas });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-2">
      <h3 className="font-semibold">Notas generales del proyecto</h3>
      <p className="text-xs text-slate-500">Estas notas aparecen en el bloque superior del diagrama unilineal.</p>
      <textarea
        value={notas}
        onChange={e => setNotas(e.target.value)}
        rows={5}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar notas</button>
    </section>
  );
}
