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

describe('API /api/clientes/:c/catalogo', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  async function nuevoCliente() {
    const r = await request(app()).post('/api/clientes').send({ nombre: 'X' });
    return r.body.slug as string;
  }

  it('GET catálogo de cliente nuevo retorna la semilla', async () => {
    const slug = await nuevoCliente();
    const r = await request(app()).get(`/api/clientes/${slug}/catalogo`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThanOrEqual(20);
  });

  it('GET catálogo de cliente inexistente retorna 404', async () => {
    const r = await request(app()).get('/api/clientes/no-existe/catalogo');
    expect(r.status).toBe(404);
  });

  it('PUT reemplaza el catálogo completo', async () => {
    const slug = await nuevoCliente();
    await request(app()).get(`/api/clientes/${slug}/catalogo`);
    const nuevo = [{
      codigo: 'NEW', descripcion: 'Nuevo item', tipo: 'material',
      unidad: 'ud', precioUnitarioCLP: 1000, categoria: 'otro'
    }];
    const r = await request(app()).put(`/api/clientes/${slug}/catalogo`).send(nuevo);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].id).toBeDefined();
  });

  it('PUT rechaza body inválido con 400', async () => {
    const slug = await nuevoCliente();
    const r = await request(app()).put(`/api/clientes/${slug}/catalogo`).send([{ codigo: 'X' }]);
    expect(r.status).toBe(400);
  });

  it('PUT rechaza códigos duplicados con 400', async () => {
    const slug = await nuevoCliente();
    const dupl = [
      { codigo: 'X', descripcion: 'A', tipo: 'material', unidad: 'ud', precioUnitarioCLP: 1, categoria: 'otro' },
      { codigo: 'X', descripcion: 'B', tipo: 'material', unidad: 'ud', precioUnitarioCLP: 2, categoria: 'otro' }
    ];
    const r = await request(app()).put(`/api/clientes/${slug}/catalogo`).send(dupl);
    expect(r.status).toBe(400);
  });

  it('POST /semilla restaura el catálogo desde la semilla', async () => {
    const slug = await nuevoCliente();
    await request(app()).put(`/api/clientes/${slug}/catalogo`).send([]);
    const r = await request(app()).post(`/api/clientes/${slug}/catalogo/semilla`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(20);
  });
});
