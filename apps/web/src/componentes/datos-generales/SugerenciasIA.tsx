// Banner que muestra los datos generales detectados por la IA en las fotos
// del tablero. Permite aplicarlos al tablero con un clic.
import { useMemo } from 'react';
import type { Tablero } from '@tipos/modelo';
import { apiTableros } from '../../api/cliente.js';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function SugerenciasIA({ tablero, clienteSlug, tableroSlug }: Props) {
  const { cargar } = useTableroStore();

  // Agrupa todas las observaciones de las fotos. Si distintas fotos sugieren
  // distintos valores para el mismo campo, se quedan ambas para que el usuario decida.
  const sugerencias = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const f of tablero.fotos) {
      const d = f.datosGeneralesObservadosIA;
      if (!d) continue;
      if (d.tensionSistema) (out.tensionSistema ??= new Set()).add(d.tensionSistema);
      if (d.esquemaTierra) (out.esquemaTierra ??= new Set()).add(d.esquemaTierra);
      if (d.frecuenciaHz != null) (out.frecuenciaHz ??= new Set()).add(String(d.frecuenciaHz));
      if (d.capacidadNominalA != null) (out.capacidadNominalA ??= new Set()).add(String(d.capacidadNominalA));
      if (d.marcaGabinete) (out.marcaGabinete ??= new Set()).add(d.marcaGabinete);
      if (d.modeloGabinete) (out.modeloGabinete ??= new Set()).add(d.modeloGabinete);
      if (d.observaciones) (out.observaciones ??= new Set()).add(d.observaciones);
    }
    return out;
  }, [tablero.fotos]);

  const claves = Object.keys(sugerencias);
  if (claves.length === 0) return null;

  // Aplica todos los valores no conflictivos (los que tienen un único valor sugerido)
  // a los campos correspondientes del tablero, respetando los valores ya escritos
  // por el usuario.
  async function aplicarSugerencias() {
    const parche: Record<string, unknown> = {};
    if (sugerencias.tensionSistema?.size === 1 && tablero.tensionSistema === 'pendiente') {
      parche.tensionSistema = [...sugerencias.tensionSistema][0];
    }
    if (sugerencias.esquemaTierra?.size === 1 && tablero.esquemaTierra === 'pendiente') {
      parche.esquemaTierra = [...sugerencias.esquemaTierra][0];
    }
    if (sugerencias.frecuenciaHz?.size === 1 && !tablero.frecuenciaHz) {
      parche.frecuenciaHz = Number([...sugerencias.frecuenciaHz][0]);
    }
    if (sugerencias.capacidadNominalA?.size === 1 && !tablero.capacidadNominalA) {
      parche.capacidadNominalA = Number([...sugerencias.capacidadNominalA][0]);
    }
    if (Object.keys(parche).length === 0) {
      alert('No hay sugerencias aplicables: o ya escribiste estos campos manualmente, o las fotos sugieren valores distintos. Revisalos uno por uno.');
      return;
    }
    if (!confirm(`Se aplicarán estos valores al tablero:\n\n${JSON.stringify(parche, null, 2)}\n\n¿Confirmar?`)) return;
    await apiTableros.actualizar(clienteSlug, tableroSlug, parche);
    await cargar(clienteSlug, tableroSlug);
  }

  return (
    <div className="col-span-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-amber-900">🤖 Sugerencias detectadas por la IA en las fotos</h3>
        <button
          onClick={aplicarSugerencias}
          className="text-xs px-2 py-1 bg-amber-700 text-white rounded hover:bg-amber-800"
        >Aplicar valores únicos</button>
      </div>
      <ul className="space-y-1 text-amber-900">
        {claves.map(k => (
          <li key={k}>
            <span className="font-medium">{k}:</span>{' '}
            <span className={sugerencias[k]!.size > 1 ? 'text-red-700' : ''}>
              {[...sugerencias[k]!].join(' / ')}
              {sugerencias[k]!.size > 1 && ' (⚠️ conflicto entre fotos)'}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-700 mt-2 italic">
        Los valores se aplican solo a campos que aún están en 'pendiente'. No sobreescriben lo que ya editaste manualmente.
      </p>
    </div>
  );
}
