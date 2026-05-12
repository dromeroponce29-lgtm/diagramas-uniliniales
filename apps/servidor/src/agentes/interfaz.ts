import type { ExtraccionAgente } from '../esquemas/extraccion.js';

// Abstracción sobre cualquier agente de visión.
// Permite inyectar stubs en tests sin pegarle a las APIs reales.
export interface ClienteAgenteIA {
  nombre: 'claude' | 'openai';
  extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente>;
}
