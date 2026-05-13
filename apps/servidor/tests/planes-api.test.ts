import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai') {}
  async extraer(): Promise<ExtraccionAgente> {
    return { calidadFoto: 'buena', problemasFoto: [], componentesDetectados: [], rotulacionCircuitosLeida: [] };
  }
}

function app() {
  return crearApp({
    agenteClaude: new AgenteStub('claude'),
    agenteOpenai: new AgenteStub('openai')
  });
}

describe('API /api/clientes/:c/tableros/:t/planes', () => {
  let dir: string;
  let cSlug: string;
  let tSlug: string;

  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const a = app();
    const rc = await request(a).post('/api/clientes').send({ nombre: 'X' });
    cSlug = rc.body.slug;
    const rt = await request(a).post(`/api/clientes/${cSlug}/tableros`)
      .send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    tSlug = rt.body.slug;
    await request(a).get(`/api/clientes/${cSlug}/catalogo`);
  });

  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('GET lista vacía cuando no hay planes', async () => {
    const r = await request(app()).get(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });

  it('POST crea un plan vacío con autoSugerir=false', async () => {
    const r = await request(app())
      .post(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`)
      .send({ autoSugerir: false });
    expect(r.status).toBe(201);
    expect(r.body.numero).toBe(1);
    expect(r.body.partidas).toEqual([]);
    expect(r.body.estado).toBe('borrador');
  });

  it('POST sin body usa autoSugerir=true por default', async () => {
    const r = await request(app())
      .post(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`)
      .send({});
    expect(r.status).toBe(201);
    expect(Array.isArray(r.body.partidas)).toBe(true);
  });

  it('PUT actualiza un plan', async () => {
    const a = app();
    const cr = await request(a).post(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`).send({ autoSugerir: false });
    const id = cr.body.id;
    const r = await request(a).put(`/api/clientes/${cSlug}/tableros/${tSlug}/planes/${id}`).send({
      partidas: [{ itemCodigo: 'X', itemDescripcion: 'X', unidad: 'ud', precioUnitarioCLP: 100, cantidad: 2 }],
      estado: 'enviado'
    });
    expect(r.status).toBe(200);
    expect(r.body.partidas).toHaveLength(1);
    expect(r.body.partidas[0].totalCLP).toBe(200);
    expect(r.body.subtotalCLP).toBe(200);
    expect(r.body.estado).toBe('enviado');
  });

  it('PUT con cuerpo inválido retorna 400', async () => {
    const cr = await request(app()).post(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`).send({ autoSugerir: false });
    const r = await request(app())
      .put(`/api/clientes/${cSlug}/tableros/${tSlug}/planes/${cr.body.id}`)
      .send({ estado: 'estado-invalido' });
    expect(r.status).toBe(400);
  });

  it('PUT a plan inexistente retorna 404', async () => {
    const r = await request(app())
      .put(`/api/clientes/${cSlug}/tableros/${tSlug}/planes/no-existe`)
      .send({ estado: 'enviado' });
    expect(r.status).toBe(404);
  });

  it('DELETE elimina un plan', async () => {
    const a = app();
    const cr = await request(a).post(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`).send({ autoSugerir: false });
    const del = await request(a).delete(`/api/clientes/${cSlug}/tableros/${tSlug}/planes/${cr.body.id}`);
    expect(del.status).toBe(204);
    const lst = await request(a).get(`/api/clientes/${cSlug}/tableros/${tSlug}/planes`);
    expect(lst.body).toEqual([]);
  });

  it('DELETE a plan inexistente retorna 404', async () => {
    const r = await request(app()).delete(`/api/clientes/${cSlug}/tableros/${tSlug}/planes/no-existe`);
    expect(r.status).toBe(404);
  });
});
