import { describe, it, expect } from 'vitest';
import { reglaCalibrePeMinimo } from '../../../../tipos/ric/reglas/calibre-pe-minimo.js';
import { calibrePEMinimo } from '../../../../tipos/ric/calculo.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z'
  };
}

describe('calibrePEMinimo (tabla)', () => {
  it('fase ≤ 16 mm² → PE = fase', () => {
    expect(calibrePEMinimo(2.5)).toBe(2.5);
    expect(calibrePEMinimo(16)).toBe(16);
  });
  it('fase 25 mm² → PE 16 mm² (regla escalonada)', () => {
    expect(calibrePEMinimo(25)).toBe(16);
  });
  it('fase 50 mm² → PE 25 mm² (fase/2 redondeado)', () => {
    expect(calibrePEMinimo(50)).toBe(25);
  });
  it('fase 95 mm² → PE 50 mm²', () => {
    expect(calibrePEMinimo(95)).toBe(50);
  });
});

describe('reglaCalibrePeMinimo', () => {
  it('pendiente-verificar si circuito no tiene sección de fase', () => {
    const t = tableroBase();
    t.circuitos = [{ id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'iluminacion', destino: 'test', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const hs = reglaCalibrePeMinimo.evaluar(t);
    expect(hs[0]!.resultado).toBe('pendiente-verificar');
  });

  it('no-cumple cuando PE menor al mínimo', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'enchufes', destino: 'test',
      seccionConductorMM2: 50, seccionConductorPEMM2: 16, // mínimo 25
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCalibrePeMinimo.evaluar(t);
    expect(hs[0]!.resultado).toBe('no-cumple');
    expect(hs[0]!.detalle).toMatch(/25 mm²/);
  });

  it('cumple cuando PE igual al mínimo', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'enchufes', destino: 'test',
      seccionConductorMM2: 50, seccionConductorPEMM2: 25,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCalibrePeMinimo.evaluar(t);
    expect(hs[0]!.resultado).toBe('cumple');
  });
});
