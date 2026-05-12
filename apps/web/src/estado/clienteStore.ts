import { create } from 'zustand';
import type { Cliente } from '@tipos/modelo';
import { apiClientes } from '../api/cliente.js';

interface ClienteStore {
  clientes: Cliente[];
  cargando: boolean;
  error: string | null;
  cargarTodos(): Promise<void>;
  crear(datos: { nombre: string; rut?: string; direccion?: string; contactoNombre?: string; contactoTelefono?: string; contactoEmail?: string }): Promise<Cliente>;
  actualizar(slug: string, datos: Partial<{ nombre: string; rut: string; direccion: string; contactoNombre: string; contactoTelefono: string; contactoEmail: string }>): Promise<void>;
  eliminar(slug: string): Promise<void>;
}

export const useClienteStore = create<ClienteStore>((set, get) => ({
  clientes: [],
  cargando: false,
  error: null,

  async cargarTodos() {
    set({ cargando: true, error: null });
    try {
      const clientes = await apiClientes.listar();
      set({ clientes, cargando: false });
    } catch (e) {
      set({ error: (e as Error).message, cargando: false });
    }
  },

  async crear(datos) {
    const nuevo = await apiClientes.crear(datos);
    set({ clientes: [...get().clientes, nuevo] });
    return nuevo;
  },

  async actualizar(slug, datos) {
    const actualizado = await apiClientes.actualizar(slug, datos);
    set({
      clientes: get().clientes.map(c => c.slug === slug ? actualizado : c)
    });
  },

  async eliminar(slug) {
    await apiClientes.eliminar(slug);
    set({ clientes: get().clientes.filter(c => c.slug !== slug) });
  }
}));
