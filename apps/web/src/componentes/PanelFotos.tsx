import { useRef } from 'react';
import type { Tablero } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const MAX_FOTOS = 20;

export function PanelFotos({ tablero, clienteSlug, tableroSlug }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { subiendoFoto, subirFoto, error } = useTableroStore();

  const restantes = MAX_FOTOS - tablero.fotos.length;

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    for (const archivo of archivos) {
      if (tablero.fotos.length + archivos.indexOf(archivo) >= MAX_FOTOS) break;
      await subirFoto(clienteSlug, tableroSlug, archivo);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="bg-white rounded-lg shadow flex flex-col h-full">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold">Fotos ({tablero.fotos.length}/{MAX_FOTOS})</h2>
      </header>

      <div className="p-4 flex-1 overflow-auto space-y-2">
        {tablero.fotos.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6">
            Sin fotos todavía. Sube la primera foto del tablero.
          </div>
        )}
        {tablero.fotos.map(f => (
          <div key={f.id} className="border border-slate-200 rounded p-2 text-sm">
            <div className="font-medium truncate">{f.nombreOriginal}</div>
            <div className="text-xs text-slate-500">
              Calidad: <span className={claseCalidad(f.calidadFoto)}>{f.calidadFoto}</span>
            </div>
            {f.problemasFoto.length > 0 && (
              <ul className="text-xs text-orange-700 mt-1 list-disc ml-4">
                {f.problemasFoto.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      <footer className="border-t p-3">
        {subiendoFoto && (
          <div className="text-sm text-blue-700 mb-2">Procesando foto... (10-30s)</div>
        )}
        {error && (
          <div className="text-sm text-red-700 mb-2">{error}</div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={alSeleccionar}
          disabled={subiendoFoto || restantes <= 0}
          className="block w-full text-sm"
        />
        {restantes <= 0 && (
          <div className="text-xs text-orange-700 mt-1">Límite de {MAX_FOTOS} fotos alcanzado.</div>
        )}
      </footer>
    </section>
  );
}

function claseCalidad(c: string): string {
  switch (c) {
    case 'buena': return 'text-green-700';
    case 'aceptable': return 'text-yellow-700';
    case 'mala': return 'text-red-700';
    default: return '';
  }
}
