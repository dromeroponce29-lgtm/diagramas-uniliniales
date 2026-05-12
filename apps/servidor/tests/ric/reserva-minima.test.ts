import { describe, it, expect } from 'vitest';
import { reglaReservaMinima } from '../../../../tipos/ric/reglas/reserva-minima.js';
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

describe('reglaReservaMinima', () => {
  it('pendiente-verificar si espaciosTotales no está definido', () => {
    const [h] = reglaReservaMinima.evaluar(tableroVacio());
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple con 24 espacios y 18 automáticos (reserva 25%)', () => {
    const t = tableroVacio();
    t.espaciosTotales = 24;
    t.componentes = Array.from({ length: 18 }, (_, i) => ({
      id: `a${i}`, tipo: 'interruptor-automatico' as const,
      procedencia: { fuente: 'manual' as const, confianza: 'alta' as const }
    }));
    const [h] = reglaReservaMinima.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple con 20 espacios y 18 automáticos (reserva 10%)', () => {
    const t = tableroVacio();
    t.espaciosTotales = 20;
    t.componentes = Array.from({ length: 18 }, (_, i) => ({
      id: `a${i}`, tipo: 'interruptor-automatico' as const,
      procedencia: { fuente: 'manual' as const, confianza: 'alta' as const }
    }));
    const [h] = reglaReservaMinima.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });
});
