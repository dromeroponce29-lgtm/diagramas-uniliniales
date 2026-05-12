import type {
  ResultadoExtraccion,
  ComponenteReconciliado,
  RotulacionCircuito,
  CalidadFoto,
  Procedencia
} from '../../../../tipos/modelo.js';
import type { ExtraccionAgente } from '../esquemas/extraccion.js';
import { nuevoId } from '../util/ulid.js';

interface EntradaReconciliacion {
  fotoId: string;
  extraccionClaude: ExtraccionAgente;
  extraccionOpenai: ExtraccionAgente;
}

type ComponenteAgente = ExtraccionAgente['componentesDetectados'][number];

// Compara dos valores tolerando variantes equivalentes obvias (case-insensitive,
// trimming, y "Schneider" ≈ "Schneider Electric").
function valoresCoinciden(a: unknown, b: unknown): boolean {
  if (a === null || b === null) return false;
  if (typeof a === 'string' && typeof b === 'string') {
    const na = a.trim().toLowerCase();
    const nb = b.trim().toLowerCase();
    return na === nb || na.includes(nb) || nb.includes(na);
  }
  return a === b;
}

function emparejar(
  componentesClaude: ComponenteAgente[],
  componentesOpenai: ComponenteAgente[]
): Array<{ c: ComponenteAgente | null; o: ComponenteAgente | null }> {
  // Empareja por (tipo + posicion). Los que no encuentran par quedan solos.
  const pares: Array<{ c: ComponenteAgente | null; o: ComponenteAgente | null }> = [];
  const openaiUsados = new Set<number>();

  for (const c of componentesClaude) {
    const idxMatch = componentesOpenai.findIndex((o, i) => {
      if (openaiUsados.has(i)) return false;
      if (o.tipoSugerido !== c.tipoSugerido) return false;
      const posC = c.posicion;
      const posO = o.posicion;
      if (posC && posO) {
        return posC.fila === posO.fila && posC.columna === posO.columna;
      }
      return false;
    });

    if (idxMatch >= 0) {
      openaiUsados.add(idxMatch);
      pares.push({ c, o: componentesOpenai[idxMatch]! });
    } else {
      pares.push({ c, o: null });
    }
  }

  // OpenAI sin par
  componentesOpenai.forEach((o, i) => {
    if (!openaiUsados.has(i)) {
      pares.push({ c: null, o });
    }
  });

  return pares;
}

function resolverCampo<T>(
  campo: string,
  valClaude: T | null | undefined,
  valOpenai: T | null | undefined
): { valor?: T; fuente: Procedencia['fuente']; confianza: Procedencia['confianza']; nota?: string } {
  const cVacio = valClaude === null || valClaude === undefined;
  const oVacio = valOpenai === null || valOpenai === undefined;

  if (cVacio && oVacio) {
    return { fuente: 'pendiente', confianza: 'baja' };
  }
  if (!cVacio && oVacio) {
    return {
      valor: valClaude as T,
      fuente: 'foto-claude',
      confianza: 'media',
      nota: `OpenAI no reportó ${campo}`
    };
  }
  if (cVacio && !oVacio) {
    return {
      valor: valOpenai as T,
      fuente: 'foto-openai',
      confianza: 'media',
      nota: `Claude no reportó ${campo}`
    };
  }
  if (valoresCoinciden(valClaude, valOpenai)) {
    return { valor: valClaude as T, fuente: 'foto-ambos', confianza: 'alta' };
  }
  return {
    valor: valClaude as T,
    fuente: 'foto-claude',
    confianza: 'discrepancia',
    nota: `Claude leyó ${JSON.stringify(valClaude)}, OpenAI leyó ${JSON.stringify(valOpenai)}`
  };
}

function consolidarComponente(
  c: ComponenteAgente | null,
  o: ComponenteAgente | null
): ComponenteReconciliado {
  // Si solo uno aportó el componente, se incluye con confianza media.
  if (c && !o) {
    return {
      id: nuevoId(),
      tipo: c.tipoSugerido,
      ...(c.marca !== null && { marca: c.marca }),
      ...(c.modelo !== null && { modelo: c.modelo }),
      ...(c.calibreA !== null && { calibreA: c.calibreA }),
      ...(c.polos !== null && { polos: c.polos }),
      ...(c.curva !== null && { curva: c.curva }),
      ...(c.sensibilidadMA !== null && { sensibilidadMA: c.sensibilidadMA }),
      ...(c.posicion !== null && { posicionEnTablero: c.posicion }),
      procedencia: {
        fuente: 'foto-claude',
        confianza: 'media',
        notas: 'OpenAI no detectó este componente'
      }
    };
  }
  if (!c && o) {
    return {
      id: nuevoId(),
      tipo: o.tipoSugerido,
      ...(o.marca !== null && { marca: o.marca }),
      ...(o.modelo !== null && { modelo: o.modelo }),
      ...(o.calibreA !== null && { calibreA: o.calibreA }),
      ...(o.polos !== null && { polos: o.polos }),
      ...(o.curva !== null && { curva: o.curva }),
      ...(o.sensibilidadMA !== null && { sensibilidadMA: o.sensibilidadMA }),
      ...(o.posicion !== null && { posicionEnTablero: o.posicion }),
      procedencia: {
        fuente: 'foto-openai',
        confianza: 'media',
        notas: 'Claude no detectó este componente'
      }
    };
  }

  // Ambos detectaron — campo por campo.
  const cn = c!;
  const on = o!;

  const marca = resolverCampo('marca', cn.marca, on.marca);
  const modelo = resolverCampo('modelo', cn.modelo, on.modelo);
  const calibreA = resolverCampo('calibreA', cn.calibreA, on.calibreA);
  const polos = resolverCampo('polos', cn.polos, on.polos);
  const curva = resolverCampo('curva', cn.curva, on.curva);
  const sensibilidadMA = resolverCampo('sensibilidadMA', cn.sensibilidadMA, on.sensibilidadMA);

  // La procedencia agregada toma el peor caso de confianza por campo
  // (discrepancia > media > alta), considerando solo los campos que efectivamente
  // tienen valor — un campo ausente en ambos agentes no debe degradar la confianza.
  const camposResueltos = [marca, modelo, calibreA, polos, curva, sensibilidadMA];
  const camposConValor = camposResueltos.filter(r => r.valor !== undefined);
  const rangoConfianza = ['alta', 'media', 'baja', 'discrepancia'] as const;
  const peor = camposConValor
    .map(r => r.confianza)
    .reduce<Procedencia['confianza']>((acc, val) => {
      return rangoConfianza.indexOf(val) > rangoConfianza.indexOf(acc) ? val : acc;
    }, 'alta');

  const notas = camposResueltos
    .map(r => r.nota)
    .filter((n): n is string => Boolean(n))
    .join(' · ');

  const fuenteAgregada: Procedencia['fuente'] = peor === 'alta' ? 'foto-ambos'
    : peor === 'discrepancia' ? 'foto-claude'
    : 'foto-claude';

  return {
    id: nuevoId(),
    tipo: cn.tipoSugerido,
    ...(marca.valor !== undefined && { marca: marca.valor as string }),
    ...(modelo.valor !== undefined && { modelo: modelo.valor as string }),
    ...(calibreA.valor !== undefined && { calibreA: calibreA.valor as number }),
    ...(polos.valor !== undefined && { polos: polos.valor as 1 | 2 | 3 | 4 }),
    ...(curva.valor !== undefined && { curva: curva.valor as 'B' | 'C' | 'D' | 'K' }),
    ...(sensibilidadMA.valor !== undefined && { sensibilidadMA: sensibilidadMA.valor as number }),
    ...(cn.posicion && { posicionEnTablero: cn.posicion }),
    procedencia: {
      fuente: fuenteAgregada,
      confianza: peor,
      ...(notas && { notas })
    }
  };
}

function peorCalidad(a: CalidadFoto, b: CalidadFoto): CalidadFoto {
  const orden: CalidadFoto[] = ['buena', 'aceptable', 'mala'];
  return orden.indexOf(a) > orden.indexOf(b) ? a : b;
}

function unirRotulaciones(
  a: RotulacionCircuito[],
  b: RotulacionCircuito[]
): RotulacionCircuito[] {
  const vistos = new Set<string>();
  const resultado: RotulacionCircuito[] = [];
  for (const r of [...a, ...b]) {
    const clave = `${r.numero ?? '?'}::${r.textoOriginal.trim().toLowerCase()}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      resultado.push(r);
    }
  }
  return resultado;
}

export function reconciliar(entrada: EntradaReconciliacion): ResultadoExtraccion {
  const { fotoId, extraccionClaude, extraccionOpenai } = entrada;

  const pares = emparejar(
    extraccionClaude.componentesDetectados,
    extraccionOpenai.componentesDetectados
  );

  const componentes = pares.map(({ c, o }) => consolidarComponente(c, o));

  return {
    fotoId,
    calidadFoto: peorCalidad(extraccionClaude.calidadFoto, extraccionOpenai.calidadFoto),
    problemasFoto: [
      ...new Set([...extraccionClaude.problemasFoto, ...extraccionOpenai.problemasFoto])
    ],
    componentes,
    rotulacionesLeidas: unirRotulaciones(
      extraccionClaude.rotulacionCircuitosLeida,
      extraccionOpenai.rotulacionCircuitosLeida
    )
  };
}
