// RIC Pliego Técnico N°5 (Tableros) + N°2 (Conductores).
// El interruptor general debe tener calibre ≤ capacidad de transporte del
// alimentador de entrada — si no, el conductor puede quedar sobrecargado
// antes de que la protección dispare.
import type { ReglaRIC } from '../tipos.js';

export const reglaCalibreIgVsAlimentador: ReglaRIC = {
  id: 'ric.tablero.calibre-ig-vs-alimentador',
  parteRIC: 'RIC N°02 / N°05',
  descripcion: 'Calibre del IG ≤ capacidad de transporte del alimentador',
  evaluar(tablero) {
    const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');
    const capAlim = tablero.alimentadorEntrada?.capacidadCorrienteA;

    if (!ig) {
      return [{
        reglaId: 'ric.tablero.calibre-ig-vs-alimentador',
        parteRIC: 'RIC N°02 / N°05',
        descripcionRegla: 'Calibre IG vs. capacidad alimentador',
        resultado: 'pendiente-verificar',
        detalle: 'No hay interruptor general detectado para evaluar el calibre frente al alimentador.'
      }];
    }
    if (ig.calibreA === undefined || capAlim === undefined) {
      return [{
        reglaId: 'ric.tablero.calibre-ig-vs-alimentador',
        parteRIC: 'RIC N°02 / N°05',
        descripcionRegla: 'Calibre IG vs. capacidad alimentador',
        resultado: 'pendiente-verificar',
        detalle: `Faltan datos: ${ig.calibreA === undefined ? 'calibre del IG' : ''}${ig.calibreA === undefined && capAlim === undefined ? ' y ' : ''}${capAlim === undefined ? 'capacidad de corriente del alimentador (A)' : ''}.`,
        componenteId: ig.id
      }];
    }

    if (ig.calibreA > capAlim) {
      return [{
        reglaId: 'ric.tablero.calibre-ig-vs-alimentador',
        parteRIC: 'RIC N°02 / N°05',
        descripcionRegla: 'Calibre IG vs. capacidad alimentador',
        resultado: 'no-cumple',
        detalle: `IG calibrado en ${ig.calibreA} A pero el alimentador solo soporta ${capAlim} A. El conductor puede sobrecargarse antes de que dispare la protección. Reducir el IG o aumentar la sección del alimentador.`,
        componenteId: ig.id
      }];
    }
    return [{
      reglaId: 'ric.tablero.calibre-ig-vs-alimentador',
      parteRIC: 'RIC N°02 / N°05',
      descripcionRegla: 'Calibre IG vs. capacidad alimentador',
      resultado: 'cumple',
      detalle: `IG ${ig.calibreA} A ≤ capacidad alimentador ${capAlim} A.`,
      componenteId: ig.id
    }];
  }
};
