// RIC Pliego Técnico N°2 (Conductores y canalizaciones).
// La caída de tensión por circuito final no debe exceder 3 % (RIC-CV-002),
// y el alimentador no debe exceder 3 % (RIC-CV-001). Total ≤ 5 % (RIC-CV-003).
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';
import type { Tablero } from '../../modelo.js';
import { caidaTensionPct } from '../calculo.js';

function tensionLineaV(t: Tablero): number {
  switch (t.tensionSistema) {
    case '220V-mono': return 220;
    case '380V-trif': return 380;
    case '380V/220V-trif-n': return 380;
    default: return 0;
  }
}

function esTrifasico(t: Tablero): boolean {
  return t.tensionSistema === '380V-trif' || t.tensionSistema === '380V/220V-trif-n';
}

export const reglaCaidaTensionCircuito: ReglaRIC = {
  id: 'ric.tablero.caida-tension-circuito',
  parteRIC: 'RIC N°02',
  descripcion: 'Caída de tensión por circuito final ≤ 3 %',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    const tenV = tensionLineaV(tablero);
    if (tenV === 0) {
      // Sin tensión definida, no se puede calcular para ningún circuito.
      hallazgos.push({
        reglaId: 'ric.tablero.caida-tension-circuito',
        parteRIC: 'RIC N°02',
        descripcionRegla: 'Caída tensión circuito',
        resultado: 'pendiente-verificar',
        detalle: 'Tensión del sistema sin definir; no se puede calcular caída de tensión.'
      });
      return hallazgos;
    }
    const trifasico = esTrifasico(tablero);

    for (const c of tablero.circuitos) {
      const faltan: string[] = [];
      if (c.corrienteA === undefined) faltan.push('corriente A');
      if (c.longitudM === undefined) faltan.push('longitud m');
      if (c.seccionConductorMM2 === undefined) faltan.push('sección mm²');
      if (faltan.length > 0) {
        hallazgos.push({
          reglaId: 'ric.tablero.caida-tension-circuito',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Caída tensión circuito',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: faltan datos para calcular caída de tensión (${faltan.join(', ')}).`,
          circuitoId: c.id
        });
        continue;
      }
      const pct = caidaTensionPct({
        corrienteA: c.corrienteA!,
        longitudM: c.longitudM!,
        seccionMM2: c.seccionConductorMM2!,
        tensionLineaV: tenV,
        esTrifasico: trifasico,
        material: c.materialConductor ?? 'Cu'
      });
      if (pct === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.caida-tension-circuito',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Caída tensión circuito',
          resultado: 'pendiente-verificar',
          detalle: `Circuito C${c.numero}: sección ${c.seccionConductorMM2} mm² fuera de la tabla de impedancia.`,
          circuitoId: c.id
        });
        continue;
      }
      const pctRedondeado = Math.round(pct * 100) / 100;
      if (pct > 3) {
        hallazgos.push({
          reglaId: 'ric.tablero.caida-tension-circuito',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Caída tensión circuito',
          resultado: 'no-cumple',
          detalle: `Circuito C${c.numero}: caída de tensión calculada ${pctRedondeado} % excede el 3 % máximo. Aumentar sección o reducir longitud.`,
          circuitoId: c.id
        });
      } else {
        hallazgos.push({
          reglaId: 'ric.tablero.caida-tension-circuito',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Caída tensión circuito',
          resultado: 'cumple',
          detalle: `Circuito C${c.numero}: caída de tensión ${pctRedondeado} % ≤ 3 %.`,
          circuitoId: c.id
        });
      }
    }
    return hallazgos;
  }
};
