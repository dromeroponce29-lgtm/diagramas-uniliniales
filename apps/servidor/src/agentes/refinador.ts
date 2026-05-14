// Agente de refinamiento conversacional del diagrama unilineal.
// El usuario describe discrepancias entre el diagrama generado y la realidad
// (foto del tablero) y el agente sugiere ajustes concretos a aplicar.
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import type { Tablero } from '../../../../tipos/modelo.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { archivoFoto } from '../almacen/rutas.js';

const MODELO_DEFECTO = 'claude-opus-4-7';

const SISTEMA = `Eres un asistente experto en diagramas unilineales eléctricos chilenos (RIC SEC) que ayuda al usuario a refinar el diagrama generado automáticamente contra la realidad observada en la foto del tablero.

Tu trabajo:
1. Mirá la foto del tablero adjunta y los datos estructurados del tablero (componentes, circuitos, sistema, etc.).
2. Escuchá la descripción del usuario sobre qué no coincide entre el diagrama y la foto.
3. Sugerí ajustes ESPECÍFICOS y CONCRETOS al modelo del tablero. Por ejemplo:
   - "El sistema es 380V/220V-trif-n (trifásico con neutro), no monofásico. Ajustá tensionSistema."
   - "El IG es de 3 polos, no 1. Ajustá polos=3 en el componente."
   - "Veo 3 luces piloto rojas en la barra fase (una por cada fase R/S/T). Agregalas como componentes."
   - "El circuito 5 tiene un contactor + relé térmico aguas abajo del automático, indicando que es un motor. Agregá esos componentes."

Reglas:
- Sé breve (3-6 oraciones por respuesta, con bullets si listas varios cambios).
- Si la información que ves NO es clara en la foto, decilo y pedí más info.
- NO inventes valores que no se ven claramente.
- Hablá en español de Chile, técnico pero accesible.
- Si el usuario te pide específicamente leer algo de la foto, focalizate en eso.

Formato de respuesta:
- Texto plano, no JSON.
- Si sugerís cambios concretos, listalos como bullets con la ruta del campo afectado y el valor sugerido. Ej.:
  • tablero.tensionSistema = "380V/220V-trif-n"
  • componente <id IG>.polos = 3`;

function resumirTablero(t: Tablero): string {
  const ig = t.componentes.find(c => c.tipo === 'interruptor-general');
  const automaticos = t.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const dif = t.componentes.filter(c => c.tipo === 'diferencial');
  const dps = t.componentes.filter(c => c.tipo === 'dps');

  const lineas: string[] = [];
  lineas.push(`Tablero: ${t.codigo} (${t.tipo})`);
  lineas.push(`Sistema: ${t.tensionSistema} · esquema tierra ${t.esquemaTierra}${t.frecuenciaHz ? ` · ${t.frecuenciaHz} Hz` : ''}`);
  if (ig) lineas.push(`IG (id=${ig.id}): ${ig.calibreA ?? '?'}A ${ig.polos ?? '?'}P${ig.curva ? ` ${ig.curva}` : ''} ${ig.marca ?? ''}`);
  lineas.push(`Componentes: ${automaticos.length} automáticos, ${dif.length} diferenciales, ${dps.length} DPS`);
  for (const a of automaticos.slice(0, 20)) {
    lineas.push(`  Aut (id=${a.id}): ${a.calibreA ?? '?'}A ${a.polos ?? '?'}P${a.curva ? ` ${a.curva}` : ''}`);
  }
  lineas.push(`Circuitos (${t.circuitos.length}):`);
  for (const c of t.circuitos.slice(0, 30)) {
    lineas.push(`  C${c.numero} (id=${c.id}) ${c.uso} "${c.destino}" — ${c.seccionConductorMM2 ?? '?'} mm²`);
  }
  return lineas.join('\n');
}

function mediaType(mime: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (mime.includes('png')) return 'image/png';
  if (mime.includes('webp')) return 'image/webp';
  if (mime.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}

export interface MensajeHistorial {
  rol: 'usuario' | 'agente';
  texto: string;
}

export interface DepsRefinador {
  apiKey: string;
  modelo?: string;
}

export async function refinarConversacion(
  tablero: Tablero,
  slugCliente: string,
  slugTablero: string,
  mensajeUsuario: string,
  historial: MensajeHistorial[],
  deps: DepsRefinador
): Promise<{ respuesta: string }> {
  const modelo = deps.modelo ?? MODELO_DEFECTO;
  const cliente = new Anthropic({ apiKey: deps.apiKey });

  // Solo la primera foto (típicamente la interior completa) para no inflar costos.
  const foto = tablero.fotos[0];
  const imagenes = foto
    ? [{
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType(foto.mimeType),
          data: await readFile(
            archivoFoto(slugCliente, slugTablero, foto.id, foto.mimeType.split('/')[1]?.split('+')[0] ?? 'jpg'),
            'base64'
          )
        }
      }]
    : [];

  // Historial → mensajes Anthropic. Solo los últimos 10 para acotar contexto.
  const historialAcotado = historial.slice(-10);
  const mensajesHistorial = historialAcotado.map(m => ({
    role: (m.rol === 'usuario' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.texto
  }));

  const hallazgos = evaluarRIC(tablero).filter(h => h.resultado === 'no-cumple');
  const contextoHallazgos = hallazgos.length > 0
    ? `\n\nHallazgos no-cumple actuales:\n${hallazgos.map(h => `- ${h.parteRIC} ${h.descripcionRegla}: ${h.detalle}`).join('\n')}`
    : '';

  const contenidoUltimo: Array<{ type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } } | { type: 'text'; text: string }> = [
    ...imagenes,
    {
      type: 'text',
      text: `Datos del tablero:\n\n${resumirTablero(tablero)}${contextoHallazgos}\n\nPregunta del usuario:\n${mensajeUsuario}`
    }
  ];

  const respuesta = await cliente.messages.create({
    model: modelo,
    max_tokens: 1024,
    system: SISTEMA,
    messages: [
      ...mensajesHistorial,
      { role: 'user', content: contenidoUltimo }
    ]
  });

  const bloqueTexto = respuesta.content.find(b => b.type === 'text');
  const texto = bloqueTexto && bloqueTexto.type === 'text'
    ? bloqueTexto.text.trim()
    : '(El agente no devolvió texto)';

  return { respuesta: texto };
}
