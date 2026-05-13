import { describe, it, expect } from 'vitest';
import { reglaVinetaRotulada } from '../../../../tipos/ric/reglas/vineta-rotulada.js';
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

describe('reglaVinetaRotulada', () => {
  it('no-cumple cuando no hay viñeta', () => {
    const [h] = reglaVinetaRotulada.evaluar(tableroVacio());
    expect(h!.resultado).toBe('no-cumple');
    expect(h!.detalle).toMatch(/proyecto/i);
    expect(h!.detalle).toMatch(/instalador/i);
  });

  it('no-cumple cuando viñeta incompleta', () => {
    const t = tableroVacio();
    t.vineta = { proyectoNombre: 'Casa Pérez' }; // falta instalador y lámina
    const [h] = reglaVinetaRotulada.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple cuando viñeta tiene proyecto, instalador y número de lámina', () => {
    const t = tableroVacio();
    t.vineta = {
      proyectoNombre: 'Casa Pérez',
      instaladorNombre: 'Daniel Romero',
      numeroLamina: 'UL-01'
    };
    const [h] = reglaVinetaRotulada.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
