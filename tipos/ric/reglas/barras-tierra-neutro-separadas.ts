import type { ReglaRIC } from '../tipos.js';

export const reglaBarrasTierraNeutroSeparadas: ReglaRIC = {
  id: 'ric.tablero.barras-tierra-neutro-separadas',
  parteRIC: 'RIC N°08',
  descripcion: 'En esquema TT, barras de tierra y neutro separadas',
  evaluar(tablero) {
    if (tablero.esquemaTierra === 'pendiente') {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'pendiente-verificar',
        detalle: 'Falta definir el esquema de puesta a tierra del tablero.'
      }];
    }
    if (tablero.esquemaTierra !== 'TT') {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'cumple',
        detalle: `Regla no aplica para esquema ${tablero.esquemaTierra}.`
      }];
    }
    const tieneNeutro = tablero.componentes.some(c => c.tipo === 'barra-neutro');
    const tieneTierra = tablero.componentes.some(c => c.tipo === 'barra-tierra');
    if (tieneNeutro && tieneTierra) {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'cumple',
        detalle: 'Se detectan barras separadas de tierra y neutro.'
      }];
    }
    return [{
      reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
      parteRIC: 'RIC N°08',
      descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
      resultado: 'no-cumple',
      detalle: `Falta ${tieneNeutro ? 'barra de tierra' : tieneTierra ? 'barra de neutro' : 'barra de tierra y de neutro'}.`
    }];
  }
};
