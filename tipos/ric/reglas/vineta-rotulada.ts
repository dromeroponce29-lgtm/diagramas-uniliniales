// RIC Pliego Técnico N°5 (Tableros): identificación.
// El tablero (lámina del diagrama unilineal) debe estar rotulado con
// proyecto, propietario, instalador y número de lámina/revisión.
import type { ReglaRIC } from '../tipos.js';

export const reglaVinetaRotulada: ReglaRIC = {
  id: 'ric.tablero.vineta-rotulada',
  parteRIC: 'RIC N°05',
  descripcion: 'Viñeta de la lámina rotulada (proyecto, instalador, número de lámina)',
  evaluar(tablero) {
    const v = tablero.vineta ?? {};
    const faltantes: string[] = [];
    if (!v.proyectoNombre || v.proyectoNombre.trim() === '') faltantes.push('proyecto');
    if (!v.instaladorNombre || v.instaladorNombre.trim() === '') faltantes.push('instalador');
    if (!v.numeroLamina || v.numeroLamina.trim() === '') faltantes.push('número de lámina');

    if (faltantes.length === 0) {
      return [{
        reglaId: 'ric.tablero.vineta-rotulada',
        parteRIC: 'RIC N°05',
        descripcionRegla: 'Viñeta rotulada',
        resultado: 'cumple',
        detalle: 'Viñeta completa con proyecto, instalador y número de lámina.'
      }];
    }
    return [{
      reglaId: 'ric.tablero.vineta-rotulada',
      parteRIC: 'RIC N°05',
      descripcionRegla: 'Viñeta rotulada',
      resultado: 'no-cumple',
      detalle: `Faltan en la viñeta: ${faltantes.join(', ')}. La lámina del unilineal debe identificar proyecto, instalador SEC y número/revisión de lámina.`
    }];
  }
};
