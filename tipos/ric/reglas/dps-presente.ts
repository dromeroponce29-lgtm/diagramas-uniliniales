import type { ReglaRIC } from '../tipos.js';

export const reglaDpsPresente: ReglaRIC = {
  id: 'ric.tablero.dps-presente',
  parteRIC: 'RIC N°09',
  descripcion: 'DPS (descargador de sobretensiones) presente donde RIC lo exige',
  evaluar(tablero) {
    const tiene = tablero.componentes.some(c => c.tipo === 'dps');
    return [{
      reglaId: 'ric.tablero.dps-presente',
      parteRIC: 'RIC N°09',
      descripcionRegla: 'DPS presente',
      resultado: tiene ? 'cumple' : 'no-cumple',
      detalle: tiene
        ? 'DPS detectado en el tablero.'
        : 'No se detectó componente DPS. Si la instalación no requiere DPS, marca el hallazgo como "no aplica".'
    }];
  }
};
