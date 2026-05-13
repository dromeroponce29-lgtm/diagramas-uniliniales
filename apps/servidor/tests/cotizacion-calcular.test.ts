import { describe, it, expect } from 'vitest';
import { calcularTotalesPlan } from '../../../tipos/cotizacion/calcular.js';
import type { PartidaPlan } from '../../../tipos/modelo.js';

function partida(precio: number, cantidad: number): PartidaPlan {
  return {
    id: '01J', itemCodigo: 'X', itemDescripcion: 'X', unidad: 'ud',
    precioUnitarioCLP: precio, cantidad, totalCLP: precio * cantidad
  };
}

describe('calcularTotalesPlan', () => {
  it('plan vacío: totales 0', () => {
    const r = calcularTotalesPlan({ partidas: [], incluyeIVA: true, ivaPct: 19 });
    expect(r).toEqual({ subtotalCLP: 0, ivaCLP: 0, totalCLP: 0 });
  });

  it('suma las partidas y aplica IVA 19', () => {
    const r = calcularTotalesPlan({
      partidas: [partida(1000, 2), partida(500, 3)],
      incluyeIVA: true,
      ivaPct: 19
    });
    expect(r.subtotalCLP).toBe(3500);
    expect(r.ivaCLP).toBe(665);
    expect(r.totalCLP).toBe(4165);
  });

  it('respeta incluyeIVA=false (IVA 0)', () => {
    const r = calcularTotalesPlan({
      partidas: [partida(1000, 1)],
      incluyeIVA: false,
      ivaPct: 19
    });
    expect(r.subtotalCLP).toBe(1000);
    expect(r.ivaCLP).toBe(0);
    expect(r.totalCLP).toBe(1000);
  });

  it('redondea IVA al entero (CLP no tiene decimales)', () => {
    const r = calcularTotalesPlan({
      partidas: [partida(123, 1)],
      incluyeIVA: true,
      ivaPct: 19
    });
    // 123 * 0.19 = 23.37 → 23
    expect(r.ivaCLP).toBe(23);
    expect(r.totalCLP).toBe(146);
  });

  it('suma lo que dice partida.totalCLP', () => {
    const r = calcularTotalesPlan({
      partidas: [{ ...partida(100, 1), totalCLP: 200 }],
      incluyeIVA: false,
      ivaPct: 19
    });
    expect(r.subtotalCLP).toBe(200);
  });
});
