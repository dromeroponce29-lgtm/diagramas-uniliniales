import { describe, it, expect } from 'vitest';
import { tableroEstaVacio } from '../../../../tipos/ric/empty-state.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function vacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('tableroEstaVacio', () => {
  it('devuelve true para tablero recién creado', () => {
    expect(tableroEstaVacio(vacio())).toBe(true);
  });

  it('false si tiene componentes', () => {
    const t = vacio();
    t.componentes = [{ id: 'c1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tiene circuitos', () => {
    const t = vacio();
    t.circuitos = [{ id: 'c1', numero: 1, proteccionComponenteId: 'p1', destino: 'X', uso: 'iluminacion', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tensionSistema fue definido', () => {
    const t = vacio();
    t.tensionSistema = '220V-mono';
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si esquemaTierra fue definido', () => {
    const t = vacio();
    t.esquemaTierra = 'TT';
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si espaciosTotales fue definido', () => {
    const t = vacio();
    t.espaciosTotales = 24;
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tiene fotos', () => {
    const t = vacio();
    t.fotos = [{
      id: 'f1', nombreOriginal: 'a.jpg', mimeType: 'image/jpeg',
      calidadFoto: 'buena', problemasFoto: [], subidaEn: '2026-05-12T00:00:00Z'
    }];
    expect(tableroEstaVacio(t)).toBe(false);
  });
});
