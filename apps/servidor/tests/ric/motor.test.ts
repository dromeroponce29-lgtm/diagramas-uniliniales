// apps/servidor/tests/ric/motor.test.ts
import { describe, it, expect } from 'vitest';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { TODAS_LAS_REGLAS } from '../../../../tipos/ric/reglas/index.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('motor RIC', () => {
  it('lista de reglas tiene al menos 12 elementos (9 base + ampliaciones)', () => {
    expect(TODAS_LAS_REGLAS.length).toBeGreaterThanOrEqual(12);
  });

  it('cada regla tiene id único', () => {
    const ids = TODAS_LAS_REGLAS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('evaluarRIC sobre tablero vacío produce al menos un hallazgo por regla a nivel tablero', () => {
    const hallazgos = evaluarRIC(tableroVacio());
    const reglasUsadas = new Set(hallazgos.map(h => h.reglaId));
    expect(reglasUsadas.has('ric.tablero.int-general-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.diferencial-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.dps-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.barras-tierra-neutro-separadas')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.reserva-minima')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.selectividad')).toBe(true);
  });
});
