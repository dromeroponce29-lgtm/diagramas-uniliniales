// tipos/ric/reglas/reserva-minima.ts
// RIC N°04 — el tablero debe conservar al menos 20% de espacios libres.
import type { ReglaRIC } from '../tipos.js';

export const reglaReservaMinima: ReglaRIC = {
  id: 'ric.tablero.reserva-minima',
  parteRIC: 'RIC N°04',
  descripcion: 'Reserva ≥20% de espacios libres en el tablero',
  evaluar(tablero) {
    if (tablero.espaciosTotales === undefined) {
      return [{
        reglaId: 'ric.tablero.reserva-minima',
        parteRIC: 'RIC N°04',
        descripcionRegla: 'Reserva mínima 20%',
        resultado: 'pendiente-verificar',
        detalle: 'Falta declarar la cantidad total de espacios físicos del tablero.'
      }];
    }
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico').length;
    const ocupacion = automaticos / tablero.espaciosTotales;
    const reserva = 1 - ocupacion;
    return [{
      reglaId: 'ric.tablero.reserva-minima',
      parteRIC: 'RIC N°04',
      descripcionRegla: 'Reserva mínima 20%',
      resultado: reserva >= 0.20 ? 'cumple' : 'no-cumple',
      detalle: `${automaticos} automáticos sobre ${tablero.espaciosTotales} espacios → reserva ${(reserva * 100).toFixed(0)}%.`
    }];
  }
};
