import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import { crearCliente } from '../src/almacen/cliente.js';
import { crearTablero, leerTablero } from '../src/almacen/tablero.js';

describe('almacén Tablero: planesNormalizacion default', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('tablero creado nuevo tiene planesNormalizacion: []', async () => {
    const c = await crearCliente({ nombre: 'Cliente' });
    const t = await crearTablero(c.slug, { codigo: 'TG', nombre: 'X', tipo: 'general' });
    expect(t.planesNormalizacion).toEqual([]);
  });

  it('tablero leído desde JSON viejo (sin planesNormalizacion) hidrata a []', async () => {
    const c = await crearCliente({ nombre: 'Cliente' });
    const t = await crearTablero(c.slug, { codigo: 'TG', nombre: 'X', tipo: 'general' });

    const archivo = join(dir, c.slug, 'tableros', t.slug, 'tablero.json');
    const sinPlanes = { ...t };
    delete (sinPlanes as Record<string, unknown>).planesNormalizacion;
    await mkdir(join(dir, c.slug, 'tableros', t.slug), { recursive: true });
    await writeFile(archivo, JSON.stringify(sinPlanes, null, 2));

    const leido = await leerTablero(c.slug, t.slug);
    expect(leido.planesNormalizacion).toEqual([]);
  });
});
