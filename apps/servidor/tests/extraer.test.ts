import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from '../src/app.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8'));
}

class AgenteStub implements ClienteAgenteIA {
  constructor(
    public readonly nombre: 'claude' | 'openai',
    private respuesta: ExtraccionAgente
  ) {}
  async extraer(): Promise<ExtraccionAgente> {
    return this.respuesta;
  }
}

describe('POST /api/extract', () => {
  it('devuelve resultado reconciliado al recibir una foto', async () => {
    const claude = new AgenteStub('claude', cargarFixture('claude-foto-01.json'));
    const openai = new AgenteStub('openai', cargarFixture('openai-foto-01.json'));
    const app = crearApp({ agenteClaude: claude, agenteOpenai: openai });

    // Buffer mínimo simulando una foto JPEG válida (no se valida contenido real,
    // multer solo se preocupa del mime y el tamaño).
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    const r = await request(app)
      .post('/api/extract')
      .attach('foto', buffer, { filename: 'tablero.jpg', contentType: 'image/jpeg' });

    expect(r.status).toBe(200);
    expect(r.body.fotoId).toBeDefined();
    expect(Array.isArray(r.body.componentes)).toBe(true);
    expect(r.body.componentes.length).toBeGreaterThan(0);
    expect(r.body.componentes[0].procedencia).toBeDefined();
  });

  it('responde 400 si no hay archivo adjunto', async () => {
    const claude = new AgenteStub('claude', cargarFixture('claude-foto-01.json'));
    const openai = new AgenteStub('openai', cargarFixture('openai-foto-01.json'));
    const app = crearApp({ agenteClaude: claude, agenteOpenai: openai });
    const r = await request(app).post('/api/extract');
    expect(r.status).toBe(400);
  });
});
