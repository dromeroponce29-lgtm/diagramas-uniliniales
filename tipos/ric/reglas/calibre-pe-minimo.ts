// RIC Pliego Técnico N°6 (Sistemas de puesta a tierra).
// La sección del conductor PE de cada circuito debe ser ≥ la mínima
// requerida por tabla, en función de la sección de fase.
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';
import { calibrePEMinimo } from '../calculo.js';

export const reglaCalibrePeMinimo: ReglaRIC = {
  id: 'ric.tablero.calibre-pe-minimo',
  parteRIC: 'RIC N°06',
  descripcion: 'Sección del conductor PE ≥ valor mínimo según fase (Tabla RIC N°06)',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      if (c.seccionConductorMM2 === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-pe-minimo',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Calibre PE mínimo',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: sin sección de fase declarada, no se puede determinar la sección mínima del PE.`,
          circuitoId: c.id
        });
        continue;
      }
      if (c.seccionConductorPEMM2 === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-pe-minimo',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Calibre PE mínimo',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: sin sección del conductor PE declarada (debe medirse en terreno).`,
          circuitoId: c.id
        });
        continue;
      }
      const pemin = calibrePEMinimo(c.seccionConductorMM2);
      if (pemin === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-pe-minimo',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Calibre PE mínimo',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: sección de fase ${c.seccionConductorMM2} mm² fuera de tabla.`,
          circuitoId: c.id
        });
        continue;
      }
      if (c.seccionConductorPEMM2 < pemin) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-pe-minimo',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Calibre PE mínimo',
          resultado: 'no-cumple',
          detalle: `Circuito C${c.numero}: PE de ${c.seccionConductorPEMM2} mm² es menor al mínimo ${pemin} mm² requerido para fase ${c.seccionConductorMM2} mm².`,
          circuitoId: c.id
        });
      } else {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-pe-minimo',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Calibre PE mínimo',
          resultado: 'cumple',
          detalle: `Circuito C${c.numero}: PE ${c.seccionConductorPEMM2} mm² ≥ mínimo ${pemin} mm².`,
          circuitoId: c.id
        });
      }
    }
    return hallazgos;
  }
};
