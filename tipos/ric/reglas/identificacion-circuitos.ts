// tipos/ric/reglas/identificacion-circuitos.ts
// RIC N°04 — cada circuito debe tener rótulo/destino declarado.
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaIdentificacionCircuitos: ReglaRIC = {
  id: 'ric.tablero.identificacion-circuitos',
  parteRIC: 'RIC N°04',
  descripcion: 'Cada circuito tiene rótulo/destino declarado',
  evaluar(tablero) {
    return tablero.circuitos.map((c): HallazgoRIC => {
      const destino = c.destino.trim().toLowerCase();
      const sinDestino = destino === '' || destino === 'pendiente';
      return {
        reglaId: 'ric.tablero.identificacion-circuitos',
        parteRIC: 'RIC N°04',
        descripcionRegla: 'Identificación de circuitos',
        resultado: sinDestino ? 'no-cumple' : 'cumple',
        detalle: sinDestino
          ? `Circuito #${c.numero} no tiene destino declarado.`
          : `Circuito #${c.numero}: "${c.destino}".`,
        circuitoId: c.id
      };
    });
  }
};
