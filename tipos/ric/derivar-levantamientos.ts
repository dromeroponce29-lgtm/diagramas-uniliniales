// tipos/ric/derivar-levantamientos.ts
//
// Levantamientos en terreno: estrictamente datos que el técnico debe medir,
// leer o consultar para poder armar el diagrama unilineal completo.
//
// NO se incluyen hallazgos normativos (cumplimiento RIC). Esos viven en
// `evaluarRIC()` y se muestran en una vista aparte.
import type { Tablero } from '../modelo.js';
import type { LevantamientoTerreno } from './tipos.js';
import { levantamientosParaDiagrama } from './levantamientos-diagrama.js';

export function derivarLevantamientosTerreno(tablero: Tablero): LevantamientoTerreno[] {
  const items: LevantamientoTerreno[] = [];

  // 1. Pendientes explícitos del tablero con resoluble = medicion-terreno.
  //    Son cosas registradas a mano (por el usuario o el reconciliador) que
  //    deben verificarse en campo.
  for (const p of tablero.pendientes) {
    if (p.resoluble === 'medicion-terreno' && !p.resueltoEn) {
      items.push({
        id: `pendiente:${p.id}`,
        origen: 'pendiente',
        descripcion: p.descripcion,
        ...(p.componenteId && { componenteId: p.componenteId }),
        prioridad: 'media'
      });
    }
  }

  // 2. Anotaciones del usuario marcadas como "levantamiento-terreno".
  //    Refieren a una regla RIC pero el usuario las convirtió en una tarea
  //    concreta para ir a medir/observar in-situ.
  for (const a of tablero.anotacionesHallazgos) {
    if (a.tipo === 'levantamiento-terreno') {
      items.push({
        id: `anotacion:${a.id}`,
        origen: 'anotacion-usuario',
        descripcion: a.justificacion || `Verificar regla ${a.reglaId}`,
        ...(a.componenteId && { componenteId: a.componenteId }),
        ...(a.circuitoId && { circuitoId: a.circuitoId }),
        prioridad: 'alta'
      });
    }
  }

  // 3. Campos del diagrama unilineal que faltan completar — la fuente
  //    principal. Cubre tablero, componentes, circuitos, acometida,
  //    alimentador de entrada y puesta a tierra.
  for (const ld of levantamientosParaDiagrama(tablero)) {
    items.push({
      id: `diagrama:${ld.id}`,
      origen: 'campo-diagrama',
      descripcion: ld.descripcion,
      ruta: ld.ruta,
      categoria: ld.categoria,
      ...(ld.instrumentoSugerido && { instrumentoSugerido: ld.instrumentoSugerido }),
      ...(ld.componenteId && { componenteId: ld.componenteId }),
      ...(ld.circuitoId && { circuitoId: ld.circuitoId }),
      prioridad: ld.prioridad
    });
  }

  return items;
}
