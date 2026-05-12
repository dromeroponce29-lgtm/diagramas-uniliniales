import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8'));
}

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai', private respuesta: ExtraccionAgente) {}
  async extraer(): Promise<ExtraccionAgente> { return this.respuesta; }
}

function app() {
  return crearApp({
    agenteClaude: new AgenteStub('claude', cargarFixture('claude-foto-01.json')),
    agenteOpenai: new AgenteStub('openai', cargarFixture('openai-foto-01.json'))
  });
}

describe('API /api/clientes/:c/tableros', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    await request(app()).post('/api/clientes').send({ nombre: 'Cliente Uno' });
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('POST crea un tablero del cliente', async () => {
    const r = await request(app())
      .post('/api/clientes/cliente-uno/tableros')
      .send({ codigo: 'TG', nombre: 'Tablero General', tipo: 'general' });
    expect(r.status).toBe(201);
    expect(r.body.slug).toBe('tg');
  });

  it('GET lista tableros del cliente', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const r = await request(app()).get('/api/clientes/cliente-uno/tableros');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  it('POST foto procesa con agentes y persiste componentes en el tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const r = await request(app())
      .post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'tablero.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(200);
    expect(r.body.fotos).toHaveLength(1);
    expect(r.body.componentes.length).toBeGreaterThan(0);
  });

  it('POST foto rechaza si excede 20 fotos', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    for (let i = 0; i < 20; i++) {
      await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
        .attach('foto', buffer, { filename: `f${i}.jpg`, contentType: 'image/jpeg' });
    }
    const r = await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'extra.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(409);
  });

  it('PUT actualiza datos del tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const r = await request(app()).put('/api/clientes/cliente-uno/tableros/tg')
      .send({ tensionSistema: '220V-mono', esquemaTierra: 'TT' });
    expect(r.status).toBe(200);
    expect(r.body.tensionSistema).toBe('220V-mono');
  });

  it('PATCH actualiza un componente individual', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const r1 = await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'f.jpg', contentType: 'image/jpeg' });
    const componenteId = r1.body.componentes[0].id;

    const r2 = await request(app())
      .patch(`/api/clientes/cliente-uno/tableros/tg/componentes/${componenteId}`)
      .send({ calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } });
    expect(r2.status).toBe(200);
    const comp = r2.body.componentes.find((c: { id: string }) => c.id === componenteId);
    expect(comp.calibreA).toBe(25);
    expect(comp.procedencia.fuente).toBe('manual');
  });

  it('DELETE elimina un tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const r = await request(app()).delete('/api/clientes/cliente-uno/tableros/tg');
    expect(r.status).toBe(204);
  });
});
