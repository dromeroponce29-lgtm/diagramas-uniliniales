import type { Tablero, ComponenteReconciliado } from '../../../../tipos/modelo.js';

export function calcularCompletitud(t: Tablero): number {
  let slotsCompletos = 0;
  let slotsTotales = 0;

  // Nivel tablero (4 slots fijos)
  slotsTotales += 4;
  if (t.tensionSistema && t.tensionSistema !== 'pendiente') slotsCompletos += 1;
  if (t.esquemaTierra && t.esquemaTierra !== 'pendiente') slotsCompletos += 1;
  if (t.potenciaContratadaKW !== undefined) slotsCompletos += 1;
  if (t.corrienteNominalA !== undefined) slotsCompletos += 1;

  // Por cada componente: marca, modelo, calibreA, polos, y confianza no-discrepancia
  for (const c of t.componentes) {
    slotsTotales += 5;
    slotsCompletos += contarSlotsComponente(c);
  }

  if (slotsTotales === 0) return 0;
  return Math.round((slotsCompletos / slotsTotales) * 100);
}

function contarSlotsComponente(c: ComponenteReconciliado): number {
  let n = 0;
  if (c.marca !== undefined) n += 1;
  if (c.modelo !== undefined) n += 1;
  if (c.calibreA !== undefined) n += 1;
  if (c.polos !== undefined) n += 1;
  if (c.procedencia.confianza !== 'discrepancia') n += 1;
  return n;
}
