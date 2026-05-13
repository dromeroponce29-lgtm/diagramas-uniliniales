import type { Tablero } from '../modelo.js';

// Devuelve true si el tablero no tiene ningún dato ingresado todavía.
// Se usa para mostrar el empty-state en la UI en lugar del análisis RIC.
export function tableroEstaVacio(t: Tablero): boolean {
  return (
    t.componentes.length === 0 &&
    t.circuitos.length === 0 &&
    t.fotos.length === 0 &&
    t.tensionSistema === 'pendiente' &&
    t.esquemaTierra === 'pendiente' &&
    t.espaciosTotales === undefined
  );
}
