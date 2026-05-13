import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';
import type { Tablero } from '../../../tipos/modelo.js';
import type { ResultadoAuditoria } from '../../../tipos/ric/auditoria.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { archivoFoto, dirFotos, archivoTablero, dirTablero } from '../src/almacen/rutas.js';

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai') {}
  async extraer(): Promise<ExtraccionAgente> {
    return { calidadFoto: 'buena', problemasFoto: [], componentesDetectados: [], rotulacionCircuitosLeida: [], datosGeneralesObservados: null };
  }
}

const auditoriaStub = (): ResultadoAuditoria => ({
  generadoEn: '2026-05-13T00:00:00Z',
  modelo: 'stub-model',
  estadoGlobal: 'apto-con-observaciones',
  resumenEjecutivo: 'Tablero en buen estado con observaciones menores.',
  hallazgos: [{
    id: 'h1', codigo: 'AUDIT-001',
    referenciaNormativa: 'RIC Pliego N°5',
    categoria: 'identificacion',
    severidad: 'menor',
    titulo: 'Etiqueta circuito C3 borrosa',
    descripcion: 'La etiqueta del circuito C3 está parcialmente borrada.',
    accionCorrectiva: 'Re-etiquetar.',
    materialesRequeridos: [{ descripcion: 'Etiqueta autoadhesiva', cantidad: 1, unidad: 'un' }],
    pasosEjecucion: ['Limpiar superficie', 'Pegar etiqueta'],
    tiempoEstimadoHoras: 0.25,
    costoEstimadoCLP: 6500,
    prioridadEjecucion: 'mediano-plazo',
    circuitosAfectados: [3]
  }]
});

function app(ejecutarAuditoria = async () => auditoriaStub()) {
  return crearApp({
    agenteClaude: new AgenteStub('claude'),
    agenteOpenai: new AgenteStub('openai'),
    ejecutarAuditoria
  });
}

describe('API /api/clientes/:c/tableros/:t/auditoria', () => {
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
  });

  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  async function inyectarFoto() {
    // Para evitar pegarle al pipeline de IA, agregamos una foto directo al tablero.
    const t = JSON.parse(await (await import('node:fs/promises')).readFile(archivoTablero(cSlug, tSlug), 'utf-8')) as Tablero;
    t.fotos.push({
      id: 'foto1', nombreOriginal: 'a.jpg', mimeType: 'image/jpeg',
      calidadFoto: 'buena', problemasFoto: [], subidaEn: '2026-05-13T00:00:00Z'
    });
    await mkdir(dirTablero(cSlug, tSlug), { recursive: true });
    await writeFile(archivoTablero(cSlug, tSlug), JSON.stringify(t, null, 2));
    await mkdir(dirFotos(cSlug, tSlug), { recursive: true });
    await writeFile(archivoFoto(cSlug, tSlug, 'foto1', 'jpg'), Buffer.from('fakejpg'));
  }

  it('POST devuelve 400 si no hay fotos', async () => {
    const r = await request(app()).post(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/foto/i);
  });

  it('POST ejecuta auditoría y persiste el resultado', async () => {
    await inyectarFoto();
    const r = await request(app()).post(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    expect(r.status).toBe(200);
    expect(r.body.estadoGlobal).toBe('apto-con-observaciones');
    expect(r.body.hallazgos).toHaveLength(1);
    expect(r.body.hallazgos[0].codigo).toBe('AUDIT-001');
  });

  it('GET 404 si no se ejecutó auditoría', async () => {
    const r = await request(app()).get(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    expect(r.status).toBe(404);
  });

  it('GET devuelve la auditoría persistida tras un POST', async () => {
    await inyectarFoto();
    await request(app()).post(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    const r = await request(app()).get(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    expect(r.status).toBe(200);
    expect(r.body.estadoGlobal).toBe('apto-con-observaciones');
  });

  it('si no se inyecta ejecutarAuditoria, la ruta no se monta (404)', async () => {
    const sinAuditoria = crearApp({
      agenteClaude: new AgenteStub('claude'),
      agenteOpenai: new AgenteStub('openai')
      // sin ejecutarAuditoria
    });
    const r = await request(sinAuditoria).post(`/api/clientes/${cSlug}/tableros/${tSlug}/auditoria`);
    expect(r.status).toBe(404);
  });
});
