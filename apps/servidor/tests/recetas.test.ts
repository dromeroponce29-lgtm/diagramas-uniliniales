import { describe, it, expect } from 'vitest';
import { RECETAS, sugerirPartidasDesdeHallazgos } from '../../../tipos/ric/recetas.js';
import { TODAS_LAS_REGLAS } from '../../../tipos/ric/reglas/index.js';
import { CATALOGO_SEMILLA } from '../../../tipos/catalogo/semilla.js';
import type { HallazgoRIC } from '../../../tipos/ric/tipos.js';
import type { ItemCatalogo } from '../../../tipos/modelo.js';

function catalogo(): ItemCatalogo[] {
  return CATALOGO_SEMILLA.map((it, i) => ({ ...it, id: `01J${i}` }));
}

describe('RECETAS', () => {
  it('tiene una receta por cada regla RIC existente', () => {
    const reglasConReceta = new Set(RECETAS.map(r => r.reglaId));
    for (const rid of TODAS_LAS_REGLAS.map(r => r.id)) {
      expect(reglasConReceta.has(rid)).toBe(true);
    }
  });

  it('cada receta apunta a items que existen en el catálogo semilla', () => {
    const codigos = new Set(CATALOGO_SEMILLA.map(i => i.codigo));
    for (const receta of RECETAS) {
      for (const partida of receta.partidas) {
        expect(codigos.has(partida.itemCodigo)).toBe(true);
      }
    }
  });
});

describe('sugerirPartidasDesdeHallazgos', () => {
  function hallazgo(reglaId: string, resultado: 'no-cumple' | 'pendiente-verificar' | 'cumple' = 'no-cumple'): HallazgoRIC {
    return { reglaId, parteRIC: 'RIC N°XX', descripcionRegla: 'X', resultado, detalle: 'X' };
  }

  it('hallazgos cumple no producen partidas', () => {
    const r = sugerirPartidasDesdeHallazgos([hallazgo('ric.tablero.dps-presente', 'cumple')], catalogo());
    expect(r).toHaveLength(0);
  });

  it('hallazgos pendiente-verificar no producen partidas por default', () => {
    const r = sugerirPartidasDesdeHallazgos([hallazgo('ric.tablero.dps-presente', 'pendiente-verificar')], catalogo());
    expect(r).toHaveLength(0);
  });

  it('hallazgo no-cumple de DPS produce partidas DPS + HH', () => {
    const r = sugerirPartidasDesdeHallazgos([hallazgo('ric.tablero.dps-presente')], catalogo());
    expect(r.length).toBeGreaterThan(0);
    expect(r.find(p => p.itemCatalogo.codigo === 'DPS-1P-T2')).toBeDefined();
    expect(r.find(p => p.itemCatalogo.codigo === 'HH-electricista')).toBeDefined();
  });

  it('omite silenciosamente partidas cuyo itemCodigo no está en el catálogo', () => {
    const catSinDps = catalogo().filter(i => i.codigo !== 'DPS-1P-T2');
    const r = sugerirPartidasDesdeHallazgos([hallazgo('ric.tablero.dps-presente')], catSinDps);
    expect(r.find(p => p.itemCatalogo.codigo === 'DPS-1P-T2')).toBeUndefined();
    expect(r.find(p => p.itemCatalogo.codigo === 'HH-electricista')).toBeDefined();
  });

  it('hallazgo sin receta registrada no produce partidas', () => {
    const r = sugerirPartidasDesdeHallazgos([hallazgo('regla.que.no.existe')], catalogo());
    expect(r).toHaveLength(0);
  });
});
