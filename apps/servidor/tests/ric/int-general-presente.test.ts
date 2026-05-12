import { describe, it, expect } from 'vitest';
import { reglaIntGeneralPresente } from '../../../../tipos/ric/reglas/int-general-presente.js';
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

describe('reglaIntGeneralPresente', () => {
  it('no-cumple cuando no hay interruptor general', () => {
    const t = tableroVacio();
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar cuando hay IG sin calibre o sin corriente nominal', () => {
    const t = tableroVacio();
    t.componentes = [{ id: '01C1', tipo: 'interruptor-general', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple cuando IG calibre ≥ corrienteNominal', () => {
    const t = tableroVacio();
    t.corrienteNominalA = 40;
    t.componentes = [{ id: '01C1', tipo: 'interruptor-general', calibreA: 63, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple cuando calibre < corrienteNominal', () => {
    const t = tableroVacio();
    t.corrienteNominalA = 40;
    t.componentes = [{ id: '01C1', tipo: 'interruptor-general', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });
});
