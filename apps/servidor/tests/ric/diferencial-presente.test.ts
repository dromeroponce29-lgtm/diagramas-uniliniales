import { describe, it, expect } from 'vitest';
import { reglaDiferencialPresente } from '../../../../tipos/ric/reglas/diferencial-presente.js';
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

describe('reglaDiferencialPresente', () => {
  it('no-cumple si no hay diferencial', () => {
    const [h] = reglaDiferencialPresente.evaluar(tableroVacio());
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si hay al menos uno', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'd1', tipo: 'diferencial', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaDiferencialPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
