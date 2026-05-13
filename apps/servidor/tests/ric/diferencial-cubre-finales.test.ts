import { describe, it, expect } from 'vitest';
import { reglaDiferencialCubreFinales } from '../../../../tipos/ric/reglas/diferencial-cubre-finales.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C',
    codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z'
  };
}

describe('reglaDiferencialCubreFinales', () => {
  it('no emite hallazgos cuando no hay circuitos', () => {
    expect(reglaDiferencialCubreFinales.evaluar(tableroBase())).toEqual([]);
  });

  it('no-cumple para circuito de enchufes sin diferencial', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaDiferencialCubreFinales.evaluar(t);
    expect(hs).toHaveLength(1);
    expect(hs[0]!.resultado).toBe('no-cumple');
    expect(hs[0]!.detalle).toMatch(/30 mA/);
  });

  it('cumple para circuito de cocina con diferencial', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', diferencialComponenteId: 'd1',
      uso: 'cocina',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaDiferencialCubreFinales.evaluar(t);
    expect(hs[0]!.resultado).toBe('cumple');
  });

  it('ignora circuitos de iluminación (no exigen diferencial obligatorio)', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      uso: 'iluminacion',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaDiferencialCubreFinales.evaluar(t);
    expect(hs).toHaveLength(0);
  });

  it('pendiente-verificar para circuito con uso pendiente', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaDiferencialCubreFinales.evaluar(t);
    expect(hs[0]!.resultado).toBe('pendiente-verificar');
  });
});
