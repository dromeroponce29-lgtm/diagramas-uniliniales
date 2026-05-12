import { useState } from 'react';
import { ulid } from 'ulid';
import type { AnotacionHallazgo, TipoAnotacionHallazgo } from '@tipos/modelo';
import type { HallazgoRIC } from '../../../../tipos/ric/tipos.js';

interface Props {
  hallazgo: HallazgoRIC;
  anotacionesExistentes: AnotacionHallazgo[];
  onAgregar(anotacion: AnotacionHallazgo): void;
  onEliminar(anotacionId: string): void;
}

export function AccionesHallazgo({ hallazgo, anotacionesExistentes, onAgregar, onEliminar }: Props) {
  const [abierto, setAbierto] = useState<TipoAnotacionHallazgo | null>(null);
  const [texto, setTexto] = useState('');

  function confirmar(tipo: TipoAnotacionHallazgo) {
    if ((tipo === 'no-aplica' || tipo === 'levantamiento-terreno') && !texto.trim()) return;
    onAgregar({
      id: ulid(),
      reglaId: hallazgo.reglaId,
      ...(hallazgo.componenteId && { componenteId: hallazgo.componenteId }),
      ...(hallazgo.circuitoId && { circuitoId: hallazgo.circuitoId }),
      tipo,
      justificacion: texto.trim(),
      creadoEn: new Date().toISOString()
    });
    setTexto('');
    setAbierto(null);
  }

  if (abierto) {
    return (
      <div className="mt-2 p-2 bg-slate-50 border rounded space-y-2">
        <label className="text-xs text-slate-600 block">
          {abierto === 'no-aplica' && 'Justifica por qué no aplica esta regla:'}
          {abierto === 'levantamiento-terreno' && 'Describe la medición o verificación que se hará en terreno:'}
          {abierto === 'nota-libre' && 'Nota libre (opcional):'}
        </label>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={2}
          className="w-full border rounded p-1 text-sm"
        />
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => confirmar(abierto)}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >Guardar</button>
          <button
            onClick={() => { setAbierto(null); setTexto(''); }}
            className="px-2 py-1 border rounded hover:bg-slate-100"
          >Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      <button
        onClick={() => setAbierto('no-aplica')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >No aplica</button>
      <button
        onClick={() => setAbierto('levantamiento-terreno')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >→ Terreno</button>
      <button
        onClick={() => setAbierto('nota-libre')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >Nota</button>

      {anotacionesExistentes.length > 0 && (
        <div className="basis-full mt-1 space-y-1">
          {anotacionesExistentes.map(a => (
            <div key={a.id} className="flex items-start gap-2 text-slate-600">
              <span className="font-medium">[{a.tipo}]</span>
              <span className="flex-1">{a.justificacion || '(sin justificación)'}</span>
              <button
                onClick={() => onEliminar(a.id)}
                className="text-red-600 hover:underline"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
