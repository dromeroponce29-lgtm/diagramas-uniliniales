import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaDiferencialSensibilidadEnchufes: ReglaRIC = {
  id: 'ric.tablero.diferencial-sensibilidad-enchufes',
  parteRIC: 'RIC N°06',
  descripcion: 'Circuitos de enchufes con diferencial ≤ 30 mA',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      if (c.uso === 'pendiente') {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero} no tiene uso definido.`,
          circuitoId: c.id
        });
        continue;
      }
      if (c.uso !== 'enchufes') continue;
      if (!c.diferencialComponenteId) {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'no-cumple',
          detalle: `Circuito #${c.numero} (enchufes) no tiene diferencial asociado.`,
          circuitoId: c.id
        });
        continue;
      }
      const dif = tablero.componentes.find(co => co.id === c.diferencialComponenteId);
      if (!dif || dif.sensibilidadMA === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero}: diferencial sin sensibilidad reportada.`,
          circuitoId: c.id
        });
        continue;
      }
      hallazgos.push({
        reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
        resultado: dif.sensibilidadMA <= 30 ? 'cumple' : 'no-cumple',
        detalle: `Circuito #${c.numero}: diferencial ${dif.sensibilidadMA} mA.`,
        circuitoId: c.id,
        componenteId: dif.id
      });
    }
    return hallazgos;
  }
};
