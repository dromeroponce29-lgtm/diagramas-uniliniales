// Agente de auditoría normativa: un inspector SEC virtual que evalúa el
// tablero contra el RIC vigente combinando las fotos + datos estructurados +
// el resultado de las 14 reglas determinísticas. Emite hallazgos cualitativos
// que las reglas no detectan: estado del gabinete, cables sueltos, glándulas
// ausentes, rotulado deteriorado, etc.
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import type { Tablero, Foto } from '../../../../tipos/modelo.js';
import type { ResultadoAuditoria, HallazgoAuditoria } from '../../../../tipos/ric/auditoria.js';
import { EsquemaResultadoAuditoria } from '../esquemas/auditoria.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { archivoFoto } from '../almacen/rutas.js';
import { nuevoId } from '../util/ulid.js';

const MODELO_DEFECTO = 'claude-opus-4-7';

const SISTEMA = `Eres un inspector eléctrico autorizado clase A de la Superintendencia de Electricidad y Combustibles (SEC) de Chile, con experiencia en auditoría de tableros eléctricos de baja tensión.

Normativa de referencia:
- RIC Pliego Técnico N°02 (Conductores y canalizaciones)
- RIC Pliego Técnico N°04 (Instalaciones de consumo BT)
- RIC Pliego Técnico N°05 (Tableros eléctricos): identificación, reserva, cuadro de carga, distancias, accesibilidad.
- RIC Pliego Técnico N°06 (Sistemas de puesta a tierra)
- IEC 60617 (simbología) · IEC 61008 / 61009 (diferenciales) · RGSSO DS 594 (paradas emergencia)

NOTA: la NCh Elec. 4/2003 fue reemplazada por los Pliegos RIC. No la cites.

Áreas a revisar (no exhaustivo):
1. IDENTIFICACIÓN — rótulo proyecto/cliente, código tablero, cuadro de cargas en tapa interior, circuitos identificados.
2. PROTECCIÓN — termomagnéticos por fase, In coherente con carga y alimentador, diferenciales 30 mA en circuitos finales, reserva ≥ 25%.
3. AISLACIÓN Y PE — bornera neutro azul separada de bornera PE verde-amarilla; conexiones apretadas; cables sin daño visible.
4. CONTROL Y SEÑALIZACIÓN — luces piloto, paradas de emergencia tipo seta accesibles y rotuladas.
5. SEGURIDAD — tapa con tornillos o llave, ausencia de tensión accesible, advertencia "PELIGRO", pintura sin óxido, sin condensación.
6. INSTALACIÓN — glándulas/prensa-cables en cada entrada, conductores ordenados, separación potencia/control, soporte mecánico firme.
7. DOCUMENTACIÓN — cuadro de cargas actualizado, diagrama unilineal, certificado instalador SEC.

REGLAS DE SALIDA:
- Reporta SOLO lo que evidencias visualmente o se deriva de los datos. NO inventes.
- Cita pliego específico cuando puedas ("RIC Pliego N°5 art. 7.3"); si no estás 100% seguro, usa "Buena práctica" o vacío.
- Severidad: critica (riesgo inmediato), mayor (incumplimiento RIC sin riesgo), menor (detalle), observacion (sugerencia).
- estadoGlobal: "no-apto" si hay al menos 1 "critica"; "apto-con-observaciones" si hay "mayor"/"menor"/"observacion"; "apto" sin hallazgos.

PLAN DE NORMALIZACIÓN por hallazgo:
- materialesRequeridos: lista detallada (descripción técnica, cantidad, unidad). [] si solo es reapriete/reordenar.
- pasosEjecucion: 3-8 pasos cortos imperativos, empezando por desenergización si es sobre partes vivas, terminando con verificación final.
- tiempoEstimadoHoras: HH realistas (0.5 reapriete; 1 cambio protección; 4 recableado).
- costoEstimadoCLP: materiales (mercado nacional) + HH ($25.000/h SEC clase A), redondeado a centena.
- prioridadEjecucion: inmediata (crítica), corto-plazo (mayor, ≤30 días), mediano-plazo (menor/observación, ≤90 días).
- circuitosAfectados: lista de N° de circuitos; 0 = alimentador/IG; [] = global.
- esquemaAntes/Despues: notación TAG IEC 81346 corta. Ej. "C5: PB-L1 -> QF5 (C16A) -> toma".

Devuelve EXCLUSIVAMENTE un JSON válido con esta forma (sin texto antes ni después):

{
  "estadoGlobal": "apto" | "apto-con-observaciones" | "no-apto",
  "resumenEjecutivo": "string (2-4 oraciones)",
  "hallazgos": [
    {
      "codigo": "AUDIT-001",
      "referenciaNormativa": "RIC Pliego N°5 art. ...",
      "categoria": "identificacion" | "proteccion" | "aislacion-pe" | "control-senalizacion" | "seguridad" | "instalacion" | "documentacion" | "mantenimiento" | "otros",
      "severidad": "critica" | "mayor" | "menor" | "observacion",
      "titulo": "<80 chars",
      "descripcion": "qué se observa y por qué incumple",
      "fotoId": "<id de la foto que evidencia, o vacío>",
      "accionCorrectiva": "1-2 oraciones imperativo",
      "materialesRequeridos": [{ "descripcion": "...", "cantidad": 1, "unidad": "un" }],
      "pasosEjecucion": ["paso 1", "paso 2"],
      "tiempoEstimadoHoras": 0.5,
      "costoEstimadoCLP": 25000,
      "prioridadEjecucion": "inmediata" | "corto-plazo" | "mediano-plazo",
      "circuitosAfectados": [],
      "esquemaAntes": "",
      "esquemaDespues": ""
    }
  ]
}`;

function resumirTablero(t: Tablero): string {
  const ig = t.componentes.find(c => c.tipo === 'interruptor-general');
  const automaticos = t.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const dif = t.componentes.filter(c => c.tipo === 'diferencial');
  const dps = t.componentes.filter(c => c.tipo === 'dps');

  const lineas: string[] = [];
  lineas.push(`Tablero: ${t.codigo} (${t.tipo})${t.ubicacion ? ` en ${t.ubicacion}` : ''}`);
  lineas.push(`Sistema: ${t.tensionSistema} · esquema tierra ${t.esquemaTierra}${t.frecuenciaHz ? ` · ${t.frecuenciaHz} Hz` : ''}`);
  if (ig) lineas.push(`IG: ${ig.calibreA ?? '?'}A ${ig.polos ?? '?'}P${ig.curva ? ` ${ig.curva}` : ''}${ig.capacidadCortocircuitoKA ? ` · ${ig.capacidadCortocircuitoKA}kA` : ''} ${ig.marca ?? ''}`);
  lineas.push(`Componentes: ${automaticos.length} automáticos, ${dif.length} diferenciales, ${dps.length} DPS`);
  if (t.alimentadorEntrada?.seccionConductorMM2) {
    lineas.push(`Alimentador: ${t.alimentadorEntrada.seccionConductorMM2} mm² · ${t.alimentadorEntrada.longitudM ?? '?'} m · ${t.alimentadorEntrada.canalizacionTipo ?? '?'}`);
  }
  if (t.puestaATierra?.resistenciaOhmMedida !== undefined) {
    lineas.push(`Puesta a tierra: R = ${t.puestaATierra.resistenciaOhmMedida} Ω (${t.puestaATierra.tipoElectrodo ?? '?'})`);
  }
  lineas.push(`Circuitos (${t.circuitos.length}):`);
  for (const c of t.circuitos.slice(0, 30)) {
    const prot = t.componentes.find(co => co.id === c.proteccionComponenteId);
    const protTxt = prot ? `${prot.calibreA ?? '?'}A ${prot.polos ?? '?'}P${prot.curva ? ` ${prot.curva}` : ''}` : '?';
    lineas.push(`  C${c.numero} ${c.uso} "${c.destino}" — ${c.seccionConductorMM2 ?? '?'} mm² · ${protTxt}`);
  }
  return lineas.join('\n');
}

function resumirReglasDeterministicas(t: Tablero): string {
  const hallazgos = evaluarRIC(t);
  const noCumple = hallazgos.filter(h => h.resultado === 'no-cumple');
  const pendiente = hallazgos.filter(h => h.resultado === 'pendiente-verificar');
  if (noCumple.length === 0 && pendiente.length === 0) return 'Reglas determinísticas: todas cumplen.';
  const lineas = [`Reglas determinísticas (${noCumple.length} no-cumple, ${pendiente.length} pendiente-verificar):`];
  for (const h of noCumple) lineas.push(`  [NO-CUMPLE] ${h.parteRIC} ${h.descripcionRegla}: ${h.detalle}`);
  for (const h of pendiente.slice(0, 10)) lineas.push(`  [PEND] ${h.parteRIC} ${h.descripcionRegla}: ${h.detalle}`);
  return lineas.join('\n');
}

function mediaType(mime: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (mime.includes('png')) return 'image/png';
  if (mime.includes('webp')) return 'image/webp';
  if (mime.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}

export interface DepsAuditoria {
  apiKey: string;
  modelo?: string;
  // Para tests: leer fotos sin pegarle a disco.
  leerFotoBase64?(foto: Foto, slugCliente: string, slugTablero: string): Promise<string>;
}

export async function auditarTablero(
  tablero: Tablero,
  slugCliente: string,
  slugTablero: string,
  deps: DepsAuditoria
): Promise<ResultadoAuditoria> {
  const modelo = deps.modelo ?? MODELO_DEFECTO;
  const cliente = new Anthropic({ apiKey: deps.apiKey });

  // Tomar hasta 5 fotos para no sobrecargar al modelo.
  const fotos = tablero.fotos.slice(0, 5);
  const imagenes = await Promise.all(
    fotos.map(async f => {
      const ext = f.mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
      const base64 = deps.leerFotoBase64
        ? await deps.leerFotoBase64(f, slugCliente, slugTablero)
        : await readFile(archivoFoto(slugCliente, slugTablero, f.id, ext), 'base64');
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType(f.mimeType),
          data: base64
        }
      };
    })
  );

  const contexto = `${resumirTablero(tablero)}\n\n${resumirReglasDeterministicas(tablero)}\n\nFotos disponibles: ${fotos.map(f => f.id).join(', ')}.`;

  const respuesta = await cliente.messages.create({
    model: modelo,
    max_tokens: 8192,
    system: SISTEMA,
    messages: [
      {
        role: 'user',
        content: [
          ...imagenes,
          { type: 'text', text: `Datos estructurados del tablero:\n\n${contexto}\n\nEmite la auditoría como JSON.` }
        ]
      }
    ]
  });

  const bloqueTexto = respuesta.content.find(b => b.type === 'text');
  if (!bloqueTexto || bloqueTexto.type !== 'text') {
    throw new Error('Claude no devolvió texto en la auditoría.');
  }

  let textoCrudo = bloqueTexto.text.trim();
  if (textoCrudo.startsWith('```')) {
    textoCrudo = textoCrudo.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const json = JSON.parse(textoCrudo);

  // Inyectar IDs y validar
  const hallazgosConId: HallazgoAuditoria[] = (json.hallazgos ?? []).map((h: Record<string, unknown>) => ({
    id: nuevoId(),
    codigo: (h.codigo as string) ?? 'AUDIT-?',
    ...(typeof h.referenciaNormativa === 'string' && h.referenciaNormativa && { referenciaNormativa: h.referenciaNormativa }),
    categoria: h.categoria as HallazgoAuditoria['categoria'],
    severidad: h.severidad as HallazgoAuditoria['severidad'],
    titulo: h.titulo as string,
    descripcion: h.descripcion as string,
    ...(typeof h.fotoId === 'string' && h.fotoId && { fotoId: h.fotoId }),
    accionCorrectiva: (h.accionCorrectiva as string) ?? '',
    materialesRequeridos: (h.materialesRequeridos as HallazgoAuditoria['materialesRequeridos']) ?? [],
    pasosEjecucion: (h.pasosEjecucion as string[]) ?? [],
    tiempoEstimadoHoras: (h.tiempoEstimadoHoras as number) ?? 0,
    costoEstimadoCLP: (h.costoEstimadoCLP as number) ?? 0,
    prioridadEjecucion: (h.prioridadEjecucion as HallazgoAuditoria['prioridadEjecucion']) ?? 'mediano-plazo',
    circuitosAfectados: (h.circuitosAfectados as number[]) ?? [],
    ...(typeof h.esquemaAntes === 'string' && h.esquemaAntes && { esquemaAntes: h.esquemaAntes }),
    ...(typeof h.esquemaDespues === 'string' && h.esquemaDespues && { esquemaDespues: h.esquemaDespues })
  }));

  const resultado: ResultadoAuditoria = {
    generadoEn: new Date().toISOString(),
    modelo: respuesta.model,
    estadoGlobal: json.estadoGlobal,
    resumenEjecutivo: json.resumenEjecutivo ?? '',
    hallazgos: hallazgosConId,
    tokensInput: respuesta.usage.input_tokens,
    tokensOutput: respuesta.usage.output_tokens
  };

  return EsquemaResultadoAuditoria.parse(resultado);
}
