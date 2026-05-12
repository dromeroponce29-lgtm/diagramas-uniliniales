import OpenAI from 'openai';
import { EsquemaExtraccionAgente, type ExtraccionAgente } from '../esquemas/extraccion.js';
import { PROMPT_EXTRACCION } from './prompts.js';
import type { ClienteAgenteIA } from './interfaz.js';

const MODELO_DEFECTO = 'gpt-4o';

export class AgenteOpenAI implements ClienteAgenteIA {
  readonly nombre = 'openai' as const;
  private cliente: OpenAI;
  private modelo: string;

  constructor(claveApi: string, modelo: string = MODELO_DEFECTO) {
    if (!claveApi) {
      throw new Error('OPENAI_API_KEY no definida');
    }
    this.cliente = new OpenAI({ apiKey: claveApi });
    this.modelo = modelo;
  }

  async extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente> {
    const respuesta = await this.cliente.chat.completions.create({
      model: this.modelo,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_EXTRACCION },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${fotoBase64}` }
            }
          ]
        }
      ]
    });

    const contenido = respuesta.choices[0]?.message?.content;
    if (!contenido) {
      throw new Error('OpenAI no devolvió contenido');
    }
    const json = JSON.parse(contenido);
    return EsquemaExtraccionAgente.parse(json);
  }
}
