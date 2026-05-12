import Anthropic from '@anthropic-ai/sdk';
import { EsquemaExtraccionAgente, type ExtraccionAgente } from '../esquemas/extraccion.js';
import { PROMPT_EXTRACCION } from './prompts.js';
import type { ClienteAgenteIA } from './interfaz.js';

const MODELO_DEFECTO = 'claude-opus-4-7';

export class AgenteClaude implements ClienteAgenteIA {
  readonly nombre = 'claude' as const;
  private cliente: Anthropic;
  private modelo: string;

  constructor(claveApi: string, modelo: string = MODELO_DEFECTO) {
    if (!claveApi) {
      throw new Error('ANTHROPIC_API_KEY no definida');
    }
    this.cliente = new Anthropic({ apiKey: claveApi });
    this.modelo = modelo;
  }

  async extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente> {
    const respuesta = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: fotoBase64
              }
            },
            { type: 'text', text: PROMPT_EXTRACCION }
          ]
        }
      ]
    });

    const bloqueTexto = respuesta.content.find(b => b.type === 'text');
    if (!bloqueTexto || bloqueTexto.type !== 'text') {
      throw new Error('Claude no devolvió contenido de texto');
    }

    const textoCrudo = bloqueTexto.text.trim();
    const json = extraerJSON(textoCrudo);
    return EsquemaExtraccionAgente.parse(json);
  }
}

// Algunos modelos a veces envuelven el JSON en ```json ... ``` aunque se les
// pida explícitamente que no. Esta función pela esos envoltorios si aparecen.
function extraerJSON(texto: string): unknown {
  let limpio = texto;
  if (limpio.startsWith('```')) {
    limpio = limpio.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  return JSON.parse(limpio);
}
