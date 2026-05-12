import { describe, it, expect } from 'vitest';
import { reglaDpsPresente } from '../../../../tipos/ric/reglas/dps-presente.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C',
    codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z',
    actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaDpsPresente', () => {
  it('no-cumple si no hay DPS', () => {
    const [h] = reglaDpsPresente.evaluar(tableroVacio());
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si hay DPS', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'dps1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaDpsPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
