import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA } from '../../../tipos/catalogo/semilla.js';
import { EsquemaItemCatalogo } from '../src/esquemas/catalogo.js';
import { nuevoId } from '../src/util/ulid.js';

describe('CATALOGO_SEMILLA', () => {
  it('contiene al menos 20 items', () => {
    expect(CATALOGO_SEMILLA.length).toBeGreaterThanOrEqual(20);
  });

  it('todos los items son válidos según EsquemaItemCatalogo (con id sintético)', () => {
    for (const item of CATALOGO_SEMILLA) {
      const parsed = EsquemaItemCatalogo.parse({ ...item, id: nuevoId() });
      expect(parsed.codigo).toBe(item.codigo);
    }
  });

  it('todos los códigos son únicos', () => {
    const codigos = CATALOGO_SEMILLA.map(i => i.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('contiene items con itemCodigo usados en recetas', () => {
    const codigos = new Set(CATALOGO_SEMILLA.map(i => i.codigo));
    for (const cod of ['DPS-1P-T2', 'DIF-2P-25A-30MA', 'BARRA-T', 'BARRA-N', 'AUT-3P-63A-C', 'AUT-1P-16A-C', 'HH-electricista', 'HH-ayudante']) {
      expect(codigos.has(cod)).toBe(true);
    }
  });
});
