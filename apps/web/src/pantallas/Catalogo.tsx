// Pantalla de catálogo de materiales y mano de obra de un cliente.
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ItemCatalogo, CategoriaCatalogo, UnidadCatalogo } from '@tipos/modelo';
import { apiCatalogo, type ItemCatalogoEntrada } from '../api/cliente.js';

const CATEGORIAS: CategoriaCatalogo[] = [
  'proteccion', 'conductor', 'ducteria', 'accesorio',
  'mano-de-obra', 'servicio', 'otro'
];

const UNIDADES: UnidadCatalogo[] = ['ud', 'm', 'kg', 'h', 'gl'];

function formatoCLP(n: number): string {
  return n.toLocaleString('es-CL');
}

export function Catalogo() {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<ItemCatalogo[] | null>(null);
  const [filtroCat, setFiltroCat] = useState<'todos' | CategoriaCatalogo>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiCatalogo.leer(slug).then(setItems).catch(e => setError(String(e)));
  }, [slug]);

  const filtrados = useMemo(() => {
    if (!items) return [];
    return items.filter(i => {
      if (filtroCat !== 'todos' && i.categoria !== filtroCat) return false;
      if (!busqueda) return true;
      const q = busqueda.toLowerCase();
      return i.codigo.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q);
    });
  }, [items, filtroCat, busqueda]);

  async function reemplazar(siguiente: ItemCatalogoEntrada[]) {
    if (!slug) return;
    try {
      const out = await apiCatalogo.reemplazar(slug, siguiente);
      setItems(out);
      setError(null);
    } catch (e) { setError(String(e)); }
  }

  async function restaurarSemilla() {
    if (!slug) return;
    if (!confirm('Esto sobrescribe TODOS los items del catálogo con la semilla. ¿Confirmar?')) return;
    try {
      const out = await apiCatalogo.restaurarSemilla(slug);
      setItems(out);
    } catch (e) { setError(String(e)); }
  }

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (items === null) return <div className="p-4">Cargando catálogo…</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Catálogo — cliente: {slug}</h1>
        <div className="flex gap-2">
          <Link to={`/clientes`} className="text-sm text-blue-600 hover:underline">← Volver</Link>
          <button onClick={restaurarSemilla} className="text-sm px-2 py-1 border rounded hover:bg-slate-100">Restaurar semilla</button>
        </div>
      </div>

      <div className="flex gap-3 mb-3 items-center text-sm">
        <label>Categoría:
          <select
            value={filtroCat}
            onChange={e => setFiltroCat(e.target.value as 'todos' | CategoriaCatalogo)}
            className="ml-2 border rounded px-1 py-0.5"
          >
            <option value="todos">todos</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Buscar:
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="código o descripción"
            className="ml-2 border rounded px-2 py-0.5"
          />
        </label>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-slate-500 italic">Sin items que coincidan con los filtros.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-600 border-b">
              <th className="py-1 pr-3">Código</th>
              <th className="py-1 pr-3">Descripción</th>
              <th className="py-1 pr-3">Categoría</th>
              <th className="py-1 pr-3">Unidad</th>
              <th className="py-1 pr-3 text-right">CLP</th>
              <th className="py-1 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(i => (
              <FilaCatalogo
                key={i.id}
                item={i}
                onGuardar={updated => {
                  const next = items.map(it => it.id === updated.id ? { ...updated } : it);
                  void reemplazar(next);
                }}
                onEliminar={() => {
                  const next = items.filter(it => it.id !== i.id);
                  void reemplazar(next);
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      <FormularioNuevoItem onCrear={entrada => void reemplazar([...items, entrada])} />
    </div>
  );
}

interface FilaProps {
  item: ItemCatalogo;
  onGuardar: (item: ItemCatalogo) => void;
  onEliminar: () => void;
}

function FilaCatalogo({ item, onGuardar, onEliminar }: FilaProps) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(item);

  if (!editando) {
    return (
      <tr className="border-b hover:bg-slate-50">
        <td className="py-1 pr-3 font-mono text-xs">{item.codigo}</td>
        <td className="py-1 pr-3">{item.descripcion}</td>
        <td className="py-1 pr-3 text-slate-500">{item.categoria}</td>
        <td className="py-1 pr-3">{item.unidad}</td>
        <td className="py-1 pr-3 text-right">{formatoCLP(item.precioUnitarioCLP)}</td>
        <td className="py-1 pr-3 text-right">
          <button onClick={() => setEditando(true)} aria-label="Editar" className="px-1">✎</button>
          <button onClick={() => { if (confirm(`Eliminar "${item.codigo}"?`)) onEliminar(); }} aria-label="Eliminar" className="px-1">✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b bg-amber-50">
      <td><input value={borrador.codigo} onChange={e => setBorrador({ ...borrador, codigo: e.target.value })} className="border rounded px-1 py-0.5 w-full font-mono text-xs" /></td>
      <td><input value={borrador.descripcion} onChange={e => setBorrador({ ...borrador, descripcion: e.target.value })} className="border rounded px-1 py-0.5 w-full" /></td>
      <td>
        <select value={borrador.categoria} onChange={e => setBorrador({ ...borrador, categoria: e.target.value as CategoriaCatalogo })} className="border rounded px-1 py-0.5">
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td>
        <select value={borrador.unidad} onChange={e => setBorrador({ ...borrador, unidad: e.target.value as UnidadCatalogo })} className="border rounded px-1 py-0.5">
          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td><input type="number" min={0} value={borrador.precioUnitarioCLP} onChange={e => setBorrador({ ...borrador, precioUnitarioCLP: Number(e.target.value) })} className="border rounded px-1 py-0.5 w-24 text-right" /></td>
      <td className="text-right">
        <button onClick={() => { onGuardar(borrador); setEditando(false); }} aria-label="Confirmar" className="px-1">✓</button>
        <button onClick={() => { setBorrador(item); setEditando(false); }} aria-label="Cancelar" className="px-1">↺</button>
      </td>
    </tr>
  );
}

interface NuevoProps {
  onCrear: (entrada: ItemCatalogoEntrada) => void;
}

function FormularioNuevoItem({ onCrear }: NuevoProps) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<ItemCatalogoEntrada>({
    codigo: '', descripcion: '', tipo: 'material', unidad: 'ud',
    precioUnitarioCLP: 0, categoria: 'otro'
  });

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="mt-4 px-3 py-1 border rounded hover:bg-slate-100">+ Agregar item</button>;
  }

  return (
    <div className="mt-4 p-3 border rounded bg-amber-50 space-y-2 text-sm">
      <div className="flex gap-2 flex-wrap">
        <input placeholder="código" value={borrador.codigo} onChange={e => setBorrador({ ...borrador, codigo: e.target.value })} className="border rounded px-1 py-0.5 font-mono" />
        <input placeholder="descripción" value={borrador.descripcion} onChange={e => setBorrador({ ...borrador, descripcion: e.target.value })} className="border rounded px-1 py-0.5 flex-1" />
        <select value={borrador.categoria} onChange={e => setBorrador({ ...borrador, categoria: e.target.value as CategoriaCatalogo })} className="border rounded px-1 py-0.5">
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={borrador.unidad} onChange={e => setBorrador({ ...borrador, unidad: e.target.value as UnidadCatalogo })} className="border rounded px-1 py-0.5">
          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" min={0} placeholder="CLP" value={borrador.precioUnitarioCLP} onChange={e => setBorrador({ ...borrador, precioUnitarioCLP: Number(e.target.value) })} className="border rounded px-1 py-0.5 w-24 text-right" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!borrador.codigo || !borrador.descripcion) { alert('código y descripción son obligatorios'); return; }
            onCrear(borrador);
            setBorrador({ codigo: '', descripcion: '', tipo: 'material', unidad: 'ud', precioUnitarioCLP: 0, categoria: 'otro' });
            setAbierto(false);
          }}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >Agregar</button>
        <button onClick={() => setAbierto(false)} className="px-3 py-1 border rounded text-sm">Cancelar</button>
      </div>
    </div>
  );
}
