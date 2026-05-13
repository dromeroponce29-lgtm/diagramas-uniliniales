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

export type OrigenLevantamiento = 'pendiente' | 'anotacion-usuario' | 'campo-diagrama';

export type CategoriaLevantamiento =
  | 'medicion'           // requiere instrumento
  | 'lectura-etiqueta'   // basta con leer la placa del equipo
  | 'inspeccion-visual'  // observación directa
  | 'consulta-cliente'   // pedir al cliente
  | 'prueba-funcional'   // accionar el componente y verificar
  | 'indagatorio';       // verificar si el elemento existe en el tablero

export interface LevantamientoTerreno {
  id: string;                          // estable, derivado de la fuente
  origen: OrigenLevantamiento;
  descripcion: string;
  ruta?: string;                       // ej. "tablero.alimentadorEntrada.longitudM" (solo para campo-diagrama)
  categoria?: CategoriaLevantamiento;
  instrumentoSugerido?: string;
  componenteId?: string;
  circuitoId?: string;
  prioridad: 'alta' | 'media' | 'baja';
}
