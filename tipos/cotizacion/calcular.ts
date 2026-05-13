// Función pura: suma partidas, aplica IVA, redondea a CLP entero.
// Compartida entre backend (al persistir un plan) y frontend (preview en vivo).
import type { PartidaPlan } from '../modelo.js';

export interface EntradaCalculo {
  partidas: PartidaPlan[];
  incluyeIVA: boolean;
  ivaPct: number;
}

export interface TotalesPlan {
  subtotalCLP: number;
  ivaCLP: number;
  totalCLP: number;
}

export function calcularTotalesPlan(input: EntradaCalculo): TotalesPlan {
  const subtotalCLP = input.partidas.reduce((acc, p) => acc + p.totalCLP, 0);
  const ivaCLP = input.incluyeIVA
    ? Math.round((subtotalCLP * input.ivaPct) / 100)
    : 0;
  const totalCLP = subtotalCLP + ivaCLP;
  return { subtotalCLP, ivaCLP, totalCLP };
}

// Helper: dada una partida con cantidad y precioUnitarioCLP, devuelve totalCLP
// redondeado a entero.
export function totalDePartida(precioUnitarioCLP: number, cantidad: number): number {
  return Math.round(precioUnitarioCLP * cantidad);
}
