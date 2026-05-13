import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClienteStore } from '../estado/clienteStore.js';
import { DialogoCliente } from '../componentes/DialogoCliente.js';
import type { Cliente } from '@tipos/modelo';

export function ListaClientes() {
  const { clientes, cargando, error, cargarTodos, crear, actualizar, eliminar } = useClienteStore();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | undefined>();

  useEffect(() => {
    cargarTodos();
  }, [cargarTodos]);

  function alAbrirNuevo() {
    setEditando(undefined);
    setDialogoAbierto(true);
  }

  function alAbrirEditar(c: Cliente) {
    setEditando(c);
    setDialogoAbierto(true);
  }

  async function alGuardar(datos: Parameters<typeof crear>[0]) {
    if (editando) {
      await actualizar(editando.slug, datos);
    } else {
      await crear(datos);
    }
  }

  async function alEliminar(c: Cliente) {
    if (!confirm(`¿Eliminar cliente "${c.nombre}"? Esta acción borra también todos sus tableros.`)) return;
    try {
      await eliminar(c.slug);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button onClick={alAbrirNuevo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          + Nuevo cliente
        </button>
      </header>

      {cargando && <div className="text-slate-500">Cargando...</div>}
      {error && <div className="bg-red-50 border border-red-200 p-4 rounded text-red-900 mb-4">{error}</div>}

      {!cargando && clientes.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded p-8 text-center text-slate-600">
          No hay clientes todavía. Crea el primero con "Nuevo cliente".
        </div>
      )}

      <div className="space-y-3">
        {clientes.map(c => (
          <article key={c.id} className="bg-white rounded-lg shadow p-5">
            <header className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{c.nombre}</h2>
                {c.direccion && <p className="text-sm text-slate-600">{c.direccion}</p>}
                <p className="text-sm text-slate-500 mt-1">
                  {c.tableros.length} tablero{c.tableros.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => alAbrirEditar(c)} className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => alEliminar(c)} className="text-red-600 hover:underline text-sm">Eliminar</button>
              </div>
            </header>

            {c.tableros.length > 0 && (
              <ul className="mt-3 space-y-1">
                {c.tableros.map(t => (
                  <li key={t.id} className="flex items-center justify-between border-t pt-2">
                    <Link to={`/clientes/${c.slug}/tableros/${t.codigo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      className="text-blue-700 hover:underline">
                      {t.codigo}
                    </Link>
                    <span className="text-sm text-slate-600">
                      Completitud: {t.porcentajeCompletitud}%
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-3">
              <Link to={`/clientes/${c.slug}/nuevo-tablero`} className="text-sm text-blue-600 hover:underline">
                + Agregar tablero
              </Link>
              <Link to={`/clientes/${c.slug}/catalogo`} className="text-sm text-blue-600 hover:underline">
                Catálogo →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <DialogoCliente
        abierto={dialogoAbierto}
        clienteExistente={editando}
        onCerrar={() => setDialogoAbierto(false)}
        onGuardar={alGuardar}
      />
    </div>
  );
}
