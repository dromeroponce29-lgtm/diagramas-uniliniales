import { create } from 'zustand';
import type { Tablero } from '@tipos/modelo';
import { apiTableros } from '../api/cliente.js';

interface TableroStore {
  tablero: Tablero | null;
  cargando: boolean;
  subiendoFoto: boolean;
  error: string | null;

  cargar(clienteSlug: string, tableroSlug: string): Promise<void>;
  actualizarDatos(clienteSlug: string, tableroSlug: string, datos: Parameters<typeof apiTableros.actualizar>[2]): Promise<void>;
  subirFoto(clienteSlug: string, tableroSlug: string, archivo: File): Promise<void>;
  actualizarComponente(clienteSlug: string, tableroSlug: string, componenteId: string, datos: unknown): Promise<void>;
  limpiar(): void;
}

export const useTableroStore = create<TableroStore>(set => ({
  tablero: null,
  cargando: false,
  subiendoFoto: false,
  error: null,

  async cargar(clienteSlug, tableroSlug) {
    set({ cargando: true, error: null });
    try {
      const tablero = await apiTableros.leer(clienteSlug, tableroSlug);
      set({ tablero, cargando: false });
    } catch (e) {
      set({ error: (e as Error).message, cargando: false });
    }
  },

  async actualizarDatos(clienteSlug, tableroSlug, datos) {
    const tablero = await apiTableros.actualizar(clienteSlug, tableroSlug, datos);
    set({ tablero });
  },

  async subirFoto(clienteSlug, tableroSlug, archivo) {
    set({ subiendoFoto: true, error: null });
    try {
      const tablero = await apiTableros.subirFoto(clienteSlug, tableroSlug, archivo);
      set({ tablero, subiendoFoto: false });
    } catch (e) {
      set({ error: (e as Error).message, subiendoFoto: false });
    }
  },

  async actualizarComponente(clienteSlug, tableroSlug, componenteId, datos) {
    const tablero = await apiTableros.actualizarComponente(clienteSlug, tableroSlug, componenteId, datos);
    set({ tablero });
  },

  limpiar() {
    set({ tablero: null, cargando: false, subiendoFoto: false, error: null });
  }
}));
