import { describe, it, expect } from 'vitest';
import { reglaCalibreVsSeccion } from '../../../../tipos/ric/reglas/calibre-vs-seccion.js';
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

describe('reglaCalibreVsSeccion', () => {
  it('no emite hallazgos si no hay circuitos', () => {
    expect(reglaCalibreVsSeccion.evaluar(tableroVacio())).toEqual([]);
  });

  it('cumple con C16 sobre 2.5mm²', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes', seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple con C25 sobre 2.5mm²', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes', seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar si falta sección', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
