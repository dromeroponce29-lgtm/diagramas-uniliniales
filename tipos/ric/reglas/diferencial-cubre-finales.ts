// RIC Pliego Técnico N°5 + IEC 61008/61009.
// Cada circuito final residencial de enchufes, cocina o climatización
// debe estar protegido por un diferencial (típicamente 30 mA).
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

const USOS_EXIGEN_DIFERENCIAL = new Set(['enchufes', 'cocina', 'climatizacion', 'calefaccion']);

export const reglaDiferencialCubreFinales: ReglaRIC = {
  id: 'ric.tablero.diferencial-cubre-finales',
  parteRIC: 'RIC N°05',
  descripcion: 'Circuitos finales de enchufes, cocina, climatización y calefacción tienen diferencial',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      if (c.uso === 'pendiente') {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-cubre-finales',
          parteRIC: 'RIC N°05',
          descripcionRegla: 'Diferencial en circuitos finales',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: uso pendiente, no se puede determinar si requiere diferencial.`,
          circuitoId: c.id
        });
        continue;
      }
      if (!USOS_EXIGEN_DIFERENCIAL.has(c.uso)) continue;

      if (!c.diferencialComponenteId) {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-cubre-finales',
          parteRIC: 'RIC N°05',
          descripcionRegla: 'Diferencial en circuitos finales',
          resultado: 'no-cumple',
          detalle: `Circuito C${c.numero} (${c.uso}) no tiene diferencial asociado. Los circuitos de ${c.uso} requieren diferencial de 30 mA por RIC N°05.`,
          circuitoId: c.id
        });
      } else {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-cubre-finales',
          parteRIC: 'RIC N°05',
          descripcionRegla: 'Diferencial en circuitos finales',
          resultado: 'cumple',
          detalle: `Circuito C${c.numero} (${c.uso}) tiene diferencial asociado.`,
          circuitoId: c.id
        });
      }
    }
    return hallazgos;
  }
};
