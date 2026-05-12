import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaIntGeneralPresente: ReglaRIC = {
  id: 'ric.tablero.int-general-presente',
  parteRIC: 'RIC N°06',
  descripcion: 'Interruptor general presente y dimensionado a la corriente nominal',
  evaluar(tablero) {
    const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');
    if (!ig) {
      return [{
        reglaId: 'ric.tablero.int-general-presente',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Interruptor general presente',
        resultado: 'no-cumple',
        detalle: 'No se encontró un componente tipo "interruptor-general" en el tablero.'
      }];
    }
    if (ig.calibreA === undefined || tablero.corrienteNominalA === undefined) {
      return [{
        reglaId: 'ric.tablero.int-general-presente',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Interruptor general dimensionado',
        resultado: 'pendiente-verificar',
        detalle: 'Falta calibre del IG o corriente nominal del tablero.',
        componenteId: ig.id
      }];
    }
    const cumple = ig.calibreA >= tablero.corrienteNominalA;
    const h: HallazgoRIC = {
      reglaId: 'ric.tablero.int-general-presente',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Interruptor general dimensionado',
      resultado: cumple ? 'cumple' : 'no-cumple',
      detalle: cumple
        ? `IG ${ig.calibreA}A ≥ corriente nominal ${tablero.corrienteNominalA}A.`
        : `IG ${ig.calibreA}A < corriente nominal ${tablero.corrienteNominalA}A.`,
      componenteId: ig.id
    };
    return [h];
  }
};
