import type { PlanNormalizacion, PartidaPlan } from '../../../../tipos/modelo.js';
import type { PlanActualizacion, PlanCreacion } from '../esquemas/cotizacion.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { sugerirPartidasDesdeHallazgos } from '../../../../tipos/ric/recetas.js';
import { calcularTotalesPlan, totalDePartida } from '../../../../tipos/cotizacion/calcular.js';
import { leerTablero } from './tablero.js';
import { leerCatalogo } from './catalogo.js';
import { archivoTablero } from './rutas.js';
import { escribirJsonAtomico } from './escritura.js';
import { nuevoId } from '../util/ulid.js';

function nuevoPlan(numero: number): PlanNormalizacion {
  const ahora = new Date().toISOString();
  return {
    id: nuevoId(),
    numero,
    creadoEn: ahora,
    actualizadoEn: ahora,
    estado: 'borrador',
    partidas: [],
    incluyeIVA: true,
    ivaPct: 19,
    subtotalCLP: 0,
    ivaCLP: 0,
    totalCLP: 0
  };
}

export async function listarPlanes(slugCliente: string, slugTablero: string): Promise<PlanNormalizacion[]> {
  const t = await leerTablero(slugCliente, slugTablero);
  return t.planesNormalizacion ?? [];
}

export async function crearPlan(
  slugCliente: string,
  slugTablero: string,
  entrada: PlanCreacion
): Promise<PlanNormalizacion> {
  const tablero = await leerTablero(slugCliente, slugTablero);
  const existentes = tablero.planesNormalizacion ?? [];
  const numero = (existentes.at(-1)?.numero ?? 0) + 1;
  const plan = nuevoPlan(numero);

  if (entrada.autoSugerir) {
    const catalogo = await leerCatalogo(slugCliente);
    const hallazgos = evaluarRIC(tablero).filter(h => h.resultado === 'no-cumple');
    const sugeridas = sugerirPartidasDesdeHallazgos(hallazgos, catalogo);
    plan.partidas = sugeridas.map(s => {
      const part: PartidaPlan = {
        id: nuevoId(),
        itemCodigo: s.itemCatalogo.codigo,
        itemDescripcion: s.itemCatalogo.descripcion,
        unidad: s.itemCatalogo.unidad,
        precioUnitarioCLP: s.itemCatalogo.precioUnitarioCLP,
        cantidad: s.cantidad,
        totalCLP: totalDePartida(s.itemCatalogo.precioUnitarioCLP, s.cantidad),
        hallazgoReglaId: s.hallazgo.reglaId,
        ...(s.hallazgo.componenteId && { hallazgoComponenteId: s.hallazgo.componenteId }),
        ...(s.hallazgo.circuitoId && { hallazgoCircuitoId: s.hallazgo.circuitoId }),
        ...(s.notasReceta && { notas: s.notasReceta })
      };
      return part;
    });
    const tot = calcularTotalesPlan(plan);
    plan.subtotalCLP = tot.subtotalCLP;
    plan.ivaCLP = tot.ivaCLP;
    plan.totalCLP = tot.totalCLP;
  }

  const actualizado = {
    ...tablero,
    actualizadoEn: new Date().toISOString(),
    planesNormalizacion: [...existentes, plan]
  };
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  return plan;
}

export async function actualizarPlan(
  slugCliente: string,
  slugTablero: string,
  planId: string,
  parche: PlanActualizacion
): Promise<PlanNormalizacion> {
  const tablero = await leerTablero(slugCliente, slugTablero);
  const planes = tablero.planesNormalizacion ?? [];
  const idx = planes.findIndex(p => p.id === planId);
  if (idx === -1) {
    throw new Error(`Plan "${planId}" no existe en tablero "${slugTablero}"`);
  }
  const actual = planes[idx]!;

  const partidas: PartidaPlan[] = parche.partidas
    ? parche.partidas.map(p => ({
        id: p.id ?? nuevoId(),
        itemCodigo: p.itemCodigo!,
        itemDescripcion: p.itemDescripcion!,
        unidad: p.unidad!,
        precioUnitarioCLP: p.precioUnitarioCLP!,
        cantidad: p.cantidad!,
        totalCLP: totalDePartida(p.precioUnitarioCLP!, p.cantidad!),
        ...(p.hallazgoReglaId !== undefined && { hallazgoReglaId: p.hallazgoReglaId }),
        ...(p.hallazgoComponenteId !== undefined && { hallazgoComponenteId: p.hallazgoComponenteId }),
        ...(p.hallazgoCircuitoId !== undefined && { hallazgoCircuitoId: p.hallazgoCircuitoId }),
        ...(p.notas !== undefined && { notas: p.notas })
      }))
    : actual.partidas;

  const incluyeIVA = parche.incluyeIVA ?? actual.incluyeIVA;
  const ivaPct = parche.ivaPct ?? actual.ivaPct;
  const tot = calcularTotalesPlan({ partidas, incluyeIVA, ivaPct });

  const planActualizado: PlanNormalizacion = {
    ...actual,
    actualizadoEn: new Date().toISOString(),
    partidas,
    incluyeIVA,
    ivaPct,
    subtotalCLP: tot.subtotalCLP,
    ivaCLP: tot.ivaCLP,
    totalCLP: tot.totalCLP,
    ...(parche.estado !== undefined && { estado: parche.estado }),
    ...(parche.notas !== undefined && { notas: parche.notas })
  };

  const planesOut = [...planes];
  planesOut[idx] = planActualizado;
  const tableroOut = {
    ...tablero,
    actualizadoEn: new Date().toISOString(),
    planesNormalizacion: planesOut
  };
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), tableroOut);
  return planActualizado;
}

export async function eliminarPlan(
  slugCliente: string,
  slugTablero: string,
  planId: string
): Promise<void> {
  const tablero = await leerTablero(slugCliente, slugTablero);
  const planes = tablero.planesNormalizacion ?? [];
  const filtrado = planes.filter(p => p.id !== planId);
  if (filtrado.length === planes.length) {
    throw new Error(`Plan "${planId}" no existe en tablero "${slugTablero}"`);
  }
  const tableroOut = {
    ...tablero,
    actualizadoEn: new Date().toISOString(),
    planesNormalizacion: filtrado
  };
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), tableroOut);
}
