import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai') {}
  async extraer(): Promise<ExtraccionAgente> {
    return {
      calidadFoto: 'buena', problemasFoto: [],
      componentesDetectados: [], rotulacionCircuitosLeida: []
    };
  }
}

function app() {
  return crearApp({
    agenteClaude: new AgenteStub('claude'),
    agenteOpenai: new AgenteStub('openai')
  });
}

describe('API /api/clientes', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('POST crea un cliente', async () => {
    const r = await request(app()).post('/api/clientes').send({ nombre: 'Cliente Uno' });
    expect(r.status).toBe(201);
    expect(r.body.slug).toBe('cliente-uno');
  });

  it('POST rechaza body sin nombre con 400', async () => {
    const r = await request(app()).post('/api/clientes').send({ direccion: 'X' });
    expect(r.status).toBe(400);
  });

  it('GET lista clientes', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'A' });
    await request(app()).post('/api/clientes').send({ nombre: 'B' });
    const r = await request(app()).get('/api/clientes');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  it('GET por slug retorna el cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'Empresa' });
    const r = await request(app()).get('/api/clientes/empresa');
    expect(r.status).toBe(200);
    expect(r.body.nombre).toBe('Empresa');
  });

  it('GET por slug 404 si no existe', async () => {
    const r = await request(app()).get('/api/clientes/inexistente');
    expect(r.status).toBe(404);
  });

  it('PUT actualiza un cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'Empresa' });
    const r = await request(app()).put('/api/clientes/empresa').send({ direccion: 'Av. X' });
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBe('Av. X');
  });

  it('DELETE elimina un cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'A eliminar' });
    const r = await request(app()).delete('/api/clientes/a-eliminar');
    expect(r.status).toBe(204);
    const post = await request(app()).get('/api/clientes/a-eliminar');
    expect(post.status).toBe(404);
  });
});
