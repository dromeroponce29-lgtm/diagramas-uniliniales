import { describe, it, expect } from 'vitest';
import { reglaCalibreIgVsAlimentador } from '../../../../tipos/ric/reglas/calibre-ig-vs-alimentador.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
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

describe('reglaCalibreIgVsAlimentador', () => {
  it('pendiente-verificar si no hay IG', () => {
    const [h] = reglaCalibreIgVsAlimentador.evaluar(tableroVacio());
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('pendiente-verificar si IG sin calibre o alimentador sin capacidad', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig1', tipo: 'interruptor-general', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaCalibreIgVsAlimentador.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple cuando IG <= capacidad alimentador', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig1', tipo: 'interruptor-general', calibreA: 40, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.alimentadorEntrada = { capacidadCorrienteA: 63 };
    const [h] = reglaCalibreIgVsAlimentador.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple cuando IG > capacidad alimentador', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig1', tipo: 'interruptor-general', calibreA: 100, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.alimentadorEntrada = { capacidadCorrienteA: 63 };
    const [h] = reglaCalibreIgVsAlimentador.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
    expect(h!.detalle).toMatch(/sobreca/i);
  });
});
