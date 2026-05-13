// Recetas declarativas: cada reglaId mapea a una lista de partidas sugeridas
// (referencias a items del catálogo + cantidad). La sugerencia es solo una
// propuesta — el usuario puede aceptarla, modificarla o descartarla.
import type { HallazgoRIC, ResultadoRegla } from './tipos.js';
import type { ItemCatalogo } from '../modelo.js';

export interface PartidaSugerida {
  itemCodigo: string;
  cantidad: number;
  notas?: string;
}

export interface Receta {
  reglaId: string;
  aplicaA: ResultadoRegla[];
  partidas: PartidaSugerida[];
}

export const RECETAS: Receta[] = [
  {
    reglaId: 'ric.tablero.dps-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DPS-1P-T2', cantidad: 1, notas: 'Verificar si la instalación requiere DPS trifásico' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.diferencial-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DIF-2P-25A-30MA', cantidad: 1, notas: 'Ajustar polos/calibre según corriente nominal' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DIF-2P-25A-30MA', cantidad: 1, notas: 'Sustituir diferencial existente por uno 30mA' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'BARRA-T', cantidad: 1 },
      { itemCodigo: 'BARRA-N', cantidad: 1 },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  },
  {
    reglaId: 'ric.tablero.int-general-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-3P-63A-C', cantidad: 1, notas: 'Calibre según corriente nominal real' },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  },
  {
    reglaId: 'ric.tablero.calibre-vs-seccion',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-1P-16A-C', cantidad: 1, notas: 'Reemplazar automático por uno acorde a la sección, o aumentar sección' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.identificacion-circuitos',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'HH-ayudante', cantidad: 0.25, notas: 'Etiquetar circuitos según destino real' }
    ]
  },
  {
    reglaId: 'ric.tablero.reserva-minima',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'HH-electricista', cantidad: 2.0, notas: 'Ampliar gabinete o redistribuir' }
    ]
  },
  {
    reglaId: 'ric.tablero.selectividad',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-3P-63A-C', cantidad: 1, notas: 'Cambiar IG por uno con calibre adecuado a la cascada' },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  }
];

export interface PartidaSugeridaResuelta {
  itemCatalogo: ItemCatalogo;
  cantidad: number;
  hallazgo: HallazgoRIC;
  notasReceta?: string;
}

// Pura: recorre hallazgos, aplica receta, resuelve items contra el catálogo.
// Omite silenciosamente partidas cuyo itemCodigo no esté en el catálogo.
export function sugerirPartidasDesdeHallazgos(
  hallazgos: HallazgoRIC[],
  catalogo: ItemCatalogo[]
): PartidaSugeridaResuelta[] {
  const porCodigo = new Map(catalogo.map(i => [i.codigo, i]));
  const recetaPorId = new Map(RECETAS.map(r => [r.reglaId, r]));

  const out: PartidaSugeridaResuelta[] = [];
  for (const h of hallazgos) {
    const receta = recetaPorId.get(h.reglaId);
    if (!receta) continue;
    if (!receta.aplicaA.includes(h.resultado)) continue;

    for (const p of receta.partidas) {
      const item = porCodigo.get(p.itemCodigo);
      if (!item) continue;
      out.push({
        itemCatalogo: item,
        cantidad: p.cantidad,
        hallazgo: h,
        ...(p.notas !== undefined && { notasReceta: p.notas })
      });
    }
  }
  return out;
}
