// tipos/ric/motor.ts
import type { Tablero } from '../modelo.js';
import type { HallazgoRIC } from './tipos.js';
import { TODAS_LAS_REGLAS } from './reglas/index.js';

export function evaluarRIC(tablero: Tablero): HallazgoRIC[] {
  return TODAS_LAS_REGLAS.flatMap(r => r.evaluar(tablero));
}
