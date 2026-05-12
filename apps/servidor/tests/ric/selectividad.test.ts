import { describe, it, expect } from 'vitest';
import { reglaSelectividad } from '../../../../tipos/ric/reglas/selectividad.js';
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

describe('reglaSelectividad', () => {
  it('pendiente-verificar si IG no tiene calibre', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple si IG ≥ max ramal', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'ig', tipo: 'interruptor-general', calibreA: 63, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a2', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple si IG < max ramal', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'ig', tipo: 'interruptor-general', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 40, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar si no hay automáticos con calibre conocido', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', calibreA: 40, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
