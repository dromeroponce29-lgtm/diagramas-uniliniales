// tipos/ric/derivar-levantamientos.ts
import type { Tablero } from '../modelo.js';
import type { LevantamientoTerreno } from './tipos.js';
import { evaluarRIC } from './motor.js';
import { levantamientosParaDiagrama } from './levantamientos-diagrama.js';

export function derivarLevantamientosTerreno(tablero: Tablero): LevantamientoTerreno[] {
  const items: LevantamientoTerreno[] = [];

  // 1. Pendientes con resoluble = medicion-terreno
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

  // 2. Hallazgos RIC con resultado = pendiente-verificar
  for (const h of evaluarRIC(tablero)) {
    if (h.resultado === 'pendiente-verificar') {
      items.push({
        id: `regla:${h.reglaId}:${h.componenteId ?? ''}:${h.circuitoId ?? ''}`,
        origen: 'regla-ric',
        descripcion: h.detalle,
        ...(h.componenteId && { componenteId: h.componenteId }),
        ...(h.circuitoId && { circuitoId: h.circuitoId }),
        parteRIC: h.parteRIC,
        prioridad: 'baja'
      });
    }
  }

  // 3. Anotaciones tipo levantamiento-terreno
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

  // 4. Campos del diagrama RIC N°18 que faltan completar
  for (const ld of levantamientosParaDiagrama(tablero)) {
    items.push({
      id: `diagrama:${ld.id}`,
      origen: 'campo-diagrama',
      descripcion: ld.instrumentoSugerido
        ? `${ld.descripcion} — ${ld.instrumentoSugerido}`
        : ld.descripcion,
      ...(ld.componenteId && { componenteId: ld.componenteId }),
      ...(ld.circuitoId && { circuitoId: ld.circuitoId }),
      prioridad: ld.prioridad
    });
  }

  return items;
}
