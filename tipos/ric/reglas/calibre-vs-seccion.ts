// tipos/ric/reglas/calibre-vs-seccion.ts
// Tabla referencial RIC N°02 — calibre máximo de protección por sección
// de conductor de cobre, instalación en ducto. Tomada de la versión
// vigente del RIC al 2026. Si la norma se actualiza, modificar acá.
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

const CALIBRE_MAX_POR_SECCION: Array<{ seccionMM2: number; calibreMaxA: number }> = [
  { seccionMM2: 1.5, calibreMaxA: 16 },
  { seccionMM2: 2.5, calibreMaxA: 20 },
  { seccionMM2: 4,   calibreMaxA: 25 },
  { seccionMM2: 6,   calibreMaxA: 40 },
  { seccionMM2: 10,  calibreMaxA: 63 },
  { seccionMM2: 16,  calibreMaxA: 80 },
  { seccionMM2: 25,  calibreMaxA: 100 }
];

function calibreMaxParaSeccion(seccion: number): number | undefined {
  const aplicable = [...CALIBRE_MAX_POR_SECCION]
    .reverse()
    .find(f => f.seccionMM2 <= seccion);
  return aplicable?.calibreMaxA;
}

export const reglaCalibreVsSeccion: ReglaRIC = {
  id: 'ric.tablero.calibre-vs-seccion',
  parteRIC: 'RIC N°02',
  descripcion: 'Calibre del automático coherente con la sección del conductor',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      const proteccion = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
      if (!proteccion || proteccion.calibreA === undefined || c.seccionConductorMM2 === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-vs-seccion',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Calibre vs sección',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero}: falta calibre del automático o sección del conductor.`,
          circuitoId: c.id,
          ...(proteccion && { componenteId: proteccion.id })
        });
        continue;
      }
      const max = calibreMaxParaSeccion(c.seccionConductorMM2);
      if (max === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-vs-seccion',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Calibre vs sección',
          resultado: 'pendiente-verificar',
          detalle: `Sección ${c.seccionConductorMM2}mm² fuera de tabla referencial.`,
          circuitoId: c.id
        });
        continue;
      }
      hallazgos.push({
        reglaId: 'ric.tablero.calibre-vs-seccion',
        parteRIC: 'RIC N°02',
        descripcionRegla: 'Calibre vs sección',
        resultado: proteccion.calibreA <= max ? 'cumple' : 'no-cumple',
        detalle: `Circuito #${c.numero}: ${proteccion.calibreA}A sobre ${c.seccionConductorMM2}mm² (máx ${max}A).`,
        circuitoId: c.id,
        componenteId: proteccion.id
      });
    }
    return hallazgos;
  }
};
