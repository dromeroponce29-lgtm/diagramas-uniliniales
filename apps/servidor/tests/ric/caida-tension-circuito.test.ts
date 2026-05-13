import { describe, it, expect } from 'vitest';
import { reglaCaidaTensionCircuito } from '../../../../tipos/ric/reglas/caida-tension-circuito.js';
import { caidaTensionPct } from '../../../../tipos/ric/calculo.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: '220V-mono', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z'
  };
}

describe('caidaTensionPct (cálculo puro)', () => {
  it('mono 220V, 16A, 20m, 2.5 mm² Cu → caída ≈ 2.5 %', () => {
    const pct = caidaTensionPct({
      corrienteA: 16, longitudM: 20, seccionMM2: 2.5,
      tensionLineaV: 220, esTrifasico: false, material: 'Cu'
    });
    expect(pct).toBeDefined();
    expect(pct!).toBeGreaterThan(2);
    expect(pct!).toBeLessThan(4);
  });

  it('mono 220V, 16A, 50m, 2.5 mm² Cu → excede 3 %', () => {
    const pct = caidaTensionPct({
      corrienteA: 16, longitudM: 50, seccionMM2: 2.5,
      tensionLineaV: 220, esTrifasico: false, material: 'Cu'
    });
    expect(pct!).toBeGreaterThan(3);
  });
});

describe('reglaCaidaTensionCircuito', () => {
  it('cumple para circuito mono corto con sección adecuada', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'iluminacion', destino: 'test',
      corrienteA: 10, longitudM: 15, seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCaidaTensionCircuito.evaluar(t);
    expect(hs[0]!.resultado).toBe('cumple');
  });

  it('no-cumple cuando excede 3 %', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'enchufes', destino: 'test',
      corrienteA: 20, longitudM: 60, seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCaidaTensionCircuito.evaluar(t);
    expect(hs[0]!.resultado).toBe('no-cumple');
    expect(hs[0]!.detalle).toMatch(/3 %/);
  });

  it('pendiente-verificar cuando faltan datos del circuito', () => {
    const t = tableroBase();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'enchufes', destino: 'test',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCaidaTensionCircuito.evaluar(t);
    expect(hs[0]!.resultado).toBe('pendiente-verificar');
  });

  it('pendiente-verificar global si no hay tensión sistema definida', () => {
    const t = tableroBase();
    t.tensionSistema = 'pendiente';
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', uso: 'enchufes', destino: 'test',
      corrienteA: 10, longitudM: 15, seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const hs = reglaCaidaTensionCircuito.evaluar(t);
    expect(hs[0]!.resultado).toBe('pendiente-verificar');
    expect(hs[0]!.detalle).toMatch(/Tensi/);
  });
});
