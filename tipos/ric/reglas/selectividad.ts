// tipos/ric/reglas/selectividad.ts
// RIC N°06 — selectividad: el calibre del IG debe ser ≥ al máximo ramal.
import type { ReglaRIC } from '../tipos.js';

export const reglaSelectividad: ReglaRIC = {
  id: 'ric.tablero.selectividad',
  parteRIC: 'RIC N°06',
  descripcion: 'Calibres en cascada coherentes (IG ≥ máx ramal)',
  evaluar(tablero) {
    const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');
    if (!ig || ig.calibreA === undefined) {
      return [{
        reglaId: 'ric.tablero.selectividad',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
        resultado: 'pendiente-verificar',
        detalle: ig ? 'IG sin calibre declarado.' : 'No hay interruptor general declarado.'
      }];
    }
    const calibresRamales = tablero.componentes
      .filter(c => c.tipo === 'interruptor-automatico' && c.calibreA !== undefined)
      .map(c => c.calibreA as number);
    if (calibresRamales.length === 0) {
      return [{
        reglaId: 'ric.tablero.selectividad',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
        resultado: 'pendiente-verificar',
        detalle: 'No hay automáticos ramales con calibre declarado.',
        componenteId: ig.id
      }];
    }
    const max = Math.max(...calibresRamales);
    return [{
      reglaId: 'ric.tablero.selectividad',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
      resultado: ig.calibreA >= max ? 'cumple' : 'no-cumple',
      detalle: `IG ${ig.calibreA}A vs máx ramal ${max}A.`,
      componenteId: ig.id
    }];
  }
};
