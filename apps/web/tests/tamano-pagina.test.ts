import { describe, it, expect } from 'vitest';
import { sugerirTamanoPagina } from '../src/diagrama/layout/tamanoPagina.js';

describe('sugerirTamanoPagina', () => {
  it('sugiere A4 cuando hay pocos circuitos (≤12 ramas)', () => {
    expect(sugerirTamanoPagina(0)).toBe('A4');
    expect(sugerirTamanoPagina(8)).toBe('A4');
    expect(sugerirTamanoPagina(12)).toBe('A4');
  });

  it('sugiere A3 cuando hay 13 o más ramas', () => {
    expect(sugerirTamanoPagina(13)).toBe('A3');
    expect(sugerirTamanoPagina(20)).toBe('A3');
  });
});
