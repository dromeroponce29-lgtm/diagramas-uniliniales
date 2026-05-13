// tipos/ric/tipos.ts
// Tipos compartidos del motor de verificación RIC. Las reglas son funciones
// puras (sin React, sin Express) → se importan desde frontend y backend.

import type { Tablero } from '../modelo.js';

export type ResultadoRegla = 'cumple' | 'no-cumple' | 'pendiente-verificar';

export interface HallazgoRIC {
  reglaId: string;                     // 'ric.tablero.dps-presente'
  parteRIC: string;                    // 'RIC N°09'
  descripcionRegla: string;            // legible para humano
  resultado: ResultadoRegla;
  detalle: string;                     // por qué dio ese resultado
  componenteId?: string;
  circuitoId?: string;
}

export interface ReglaRIC {
  id: string;
  parteRIC: string;
  descripcion: string;
  evaluar: (tablero: Tablero) => HallazgoRIC[];
}

export type OrigenLevantamiento = 'pendiente' | 'regla-ric' | 'anotacion-usuario' | 'campo-diagrama';

export interface LevantamientoTerreno {
  id: string;                          // estable, derivado de la fuente
  origen: OrigenLevantamiento;
  descripcion: string;
  componenteId?: string;
  circuitoId?: string;
  parteRIC?: string;
  prioridad: 'alta' | 'media' | 'baja';
}
