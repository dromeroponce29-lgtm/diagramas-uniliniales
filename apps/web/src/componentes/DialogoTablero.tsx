import { useState } from 'react';
import type { TipoTablero } from '@tipos/modelo';

interface Props {
  onGuardar(datos: { codigo: string; nombre: string; tipo: TipoTablero; ubicacion?: string }): Promise<void>;
  onCancelar(): void;
}

const TIPOS: { valor: TipoTablero; etiqueta: string }[] = [
  { valor: 'general', etiqueta: 'Tablero general (TG)' },
  { valor: 'distribucion', etiqueta: 'Tablero de distribución (TD)' },
  { valor: 'comando', etiqueta: 'Tablero de comando' },
  { valor: 'otro', etiqueta: 'Otro' }
];

export function DialogoTablero({ onGuardar, onCancelar }: Props) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoTablero>('general');
  const [ubicacion, setUbicacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alGuardar() {
    if (!codigo.trim() || !nombre.trim()) {
      setError('Código y nombre son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo,
        ...(ubicacion.trim() && { ubicacion: ubicacion.trim() })
      });
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl">
      <h3 className="text-xl font-semibold mb-4">Nuevo tablero</h3>

      <div className="space-y-3">
        <Campo etiqueta="Código *  (ej: TG, TD-1, TD-Cocina)" valor={codigo} alCambiar={setCodigo} />
        <Campo etiqueta="Nombre / descripción *" valor={nombre} alCambiar={setNombre} />
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoTablero)}
            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </label>
        <Campo etiqueta="Ubicación (opcional)" valor={ubicacion} alCambiar={setUbicacion} />
      </div>

      {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancelar} disabled={guardando}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cancelar</button>
        <button onClick={alGuardar} disabled={guardando}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
          {guardando ? 'Creando...' : 'Crear tablero'}
        </button>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{etiqueta}</span>
      <input value={valor} onChange={e => alCambiar(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}
