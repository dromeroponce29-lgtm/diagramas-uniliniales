import { create } from 'zustand';
import type { ResultadoExtraccion } from '@tipos/modelo';
import { extraerFoto } from '../api/cliente.js';

type EstadoCarga = 'inactivo' | 'procesando' | 'completado' | 'error';

interface ExtraccionStore {
  estadoCarga: EstadoCarga;
  resultado: ResultadoExtraccion | null;
  error: string | null;
  procesar(archivo: File): Promise<void>;
  reset(): void;
}

export const useExtraccionStore = create<ExtraccionStore>(set => ({
  estadoCarga: 'inactivo',
  resultado: null,
  error: null,

  async procesar(archivo) {
    set({ estadoCarga: 'procesando', error: null, resultado: null });
    try {
      const resultado = await extraerFoto(archivo);
      set({ estadoCarga: 'completado', resultado });
    } catch (e) {
      set({ estadoCarga: 'error', error: (e as Error).message });
    }
  },

  reset() {
    set({ estadoCarga: 'inactivo', resultado: null, error: null });
  }
}));
