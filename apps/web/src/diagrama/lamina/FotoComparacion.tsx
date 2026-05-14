// Foto del tablero para comparar contra el diagrama unilineal.
// Permite elegir cuál foto mostrar (típicamente la interior completa).
// Al imprimir/exportar, esta sección queda en página aparte (CSS @media print).
import { useState } from 'react';
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FotoComparacion({ tablero, clienteSlug, tableroSlug }: Props) {
  const [fotoId, setFotoId] = useState<string>(tablero.fotos[0]?.id ?? '');
  const fotoSeleccionada = tablero.fotos.find(f => f.id === fotoId);

  if (tablero.fotos.length === 0) {
    return (
      <section className="bg-white border rounded p-3 print:break-before-page">
        <h4 className="font-semibold text-sm mb-2">Foto del tablero (comparación)</h4>
        <p className="text-slate-500 italic text-sm">Sin fotos cargadas. Subí una foto interior en el tab "Fotos y componentes".</p>
      </section>
    );
  }

  const url = fotoSeleccionada
    ? `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/fotos/${fotoSeleccionada.id}`
    : null;

  return (
    <section className="bg-white border rounded p-3 print:break-before-page">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Foto del tablero (comparación)</h4>
        {tablero.fotos.length > 1 && (
          <select
            value={fotoId}
            onChange={e => setFotoId(e.target.value)}
            className="text-xs border rounded px-1 py-0.5"
          >
            {tablero.fotos.map((f, i) => (
              <option key={f.id} value={f.id}>
                {f.nombreOriginal || `Foto ${i + 1}`} ({f.calidadFoto})
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-xs text-slate-500 italic mb-2 print:hidden">
        Compará la foto contra el diagrama unilineal de arriba. Si algo no coincide, usá el chat
        de refinamiento del diagrama para indicarlo.
      </p>
      {url && (
        <img
          src={url}
          alt={fotoSeleccionada?.nombreOriginal ?? 'Foto del tablero'}
          className="max-w-full max-h-[80vh] mx-auto block border"
        />
      )}
    </section>
  );
}
