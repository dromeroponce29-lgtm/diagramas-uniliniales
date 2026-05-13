import { describe, it, expect } from 'vitest';
import { EsquemaItemCatalogo, EsquemaCatalogo } from '../src/esquemas/catalogo.js';
import { EsquemaPartidaPlan, EsquemaPlanNormalizacion } from '../src/esquemas/cotizacion.js';

describe('EsquemaItemCatalogo', () => {
  it('acepta un item válido', () => {
    const ok = EsquemaItemCatalogo.parse({
      id: '01J', codigo: 'AUT-1P-16A-C', descripcion: 'Automático 16A',
      tipo: 'material', unidad: 'ud', precioUnitarioCLP: 4500, categoria: 'proteccion'
    });
    expect(ok.codigo).toBe('AUT-1P-16A-C');
  });

  it('rechaza precio negativo', () => {
    expect(() => EsquemaItemCatalogo.parse({
      id: '01J', codigo: 'X', descripcion: 'X', tipo: 'material',
      unidad: 'ud', precioUnitarioCLP: -10, categoria: 'otro'
    })).toThrow();
  });

  it('rechaza unidad inválida', () => {
    expect(() => EsquemaItemCatalogo.parse({
      id: '01J', codigo: 'X', descripcion: 'X', tipo: 'material',
      unidad: 'km', precioUnitarioCLP: 10, categoria: 'otro'
    })).toThrow();
  });
});

describe('EsquemaCatalogo', () => {
  it('acepta un array vacío', () => {
    expect(EsquemaCatalogo.parse([])).toEqual([]);
  });
});

describe('EsquemaPartidaPlan', () => {
  it('acepta una partida válida', () => {
    const p = EsquemaPartidaPlan.parse({
      id: '01J', itemCodigo: 'DPS-1P-T2', itemDescripcion: 'DPS', unidad: 'ud',
      precioUnitarioCLP: 35000, cantidad: 1, totalCLP: 35000
    });
    expect(p.cantidad).toBe(1);
  });

  it('rechaza cantidad negativa', () => {
    expect(() => EsquemaPartidaPlan.parse({
      id: '01J', itemCodigo: 'X', itemDescripcion: 'X', unidad: 'ud',
      precioUnitarioCLP: 100, cantidad: -1, totalCLP: -100
    })).toThrow();
  });
});

describe('EsquemaPlanNormalizacion', () => {
  it('acepta un plan vacío', () => {
    const p = EsquemaPlanNormalizacion.parse({
      id: '01J', numero: 1,
      creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z',
      estado: 'borrador', partidas: [], incluyeIVA: true, ivaPct: 19,
      subtotalCLP: 0, ivaCLP: 0, totalCLP: 0
    });
    expect(p.estado).toBe('borrador');
  });

  it('rechaza estado inválido', () => {
    expect(() => EsquemaPlanNormalizacion.parse({
      id: '01J', numero: 1,
      creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z',
      estado: 'pagado', partidas: [], incluyeIVA: true, ivaPct: 19,
      subtotalCLP: 0, ivaCLP: 0, totalCLP: 0
    })).toThrow();
  });
});
