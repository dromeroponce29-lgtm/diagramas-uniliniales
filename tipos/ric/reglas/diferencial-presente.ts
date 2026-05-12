import type { ReglaRIC } from '../tipos.js';

export const reglaDiferencialPresente: ReglaRIC = {
  id: 'ric.tablero.diferencial-presente',
  parteRIC: 'RIC N°06',
  descripcion: 'Existe diferencial principal y/o por circuitos',
  evaluar(tablero) {
    const tieneAlguno = tablero.componentes.some(c => c.tipo === 'diferencial');
    return [{
      reglaId: 'ric.tablero.diferencial-presente',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Diferencial presente',
      resultado: tieneAlguno ? 'cumple' : 'no-cumple',
      detalle: tieneAlguno
        ? 'Al menos un diferencial detectado en el tablero.'
        : 'No se detectó ningún diferencial en el tablero.'
    }];
  }
};
