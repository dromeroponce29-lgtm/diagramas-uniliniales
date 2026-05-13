import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import { crearCliente } from '../src/almacen/cliente.js';
import { crearTablero, leerTablero } from '../src/almacen/tablero.js';
import { leerCatalogo } from '../src/almacen/catalogo.js';
import {
  crearPlan,
  actualizarPlan,
  eliminarPlan,
  listarPlanes
} from '../src/almacen/planes.js';

describe('almacén Planes de normalización', () => {
  let dir: string;
  let clienteSlug: string;
  let tableroSlug: string;

  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const c = await crearCliente({ nombre: 'Cliente' });
    clienteSlug = c.slug;
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'X', tipo: 'general' });
    tableroSlug = t.slug;
    await leerCatalogo(clienteSlug);
  });

  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('listarPlanes de tablero recién creado: []', async () => {
    expect(await listarPlanes(clienteSlug, tableroSlug)).toEqual([]);
  });

  it('crearPlan con autoSugerir=false crea un plan vacío', async () => {
    const p = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    expect(p.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(p.numero).toBe(1);
    expect(p.estado).toBe('borrador');
    expect(p.partidas).toEqual([]);
    expect(p.incluyeIVA).toBe(true);
    expect(p.ivaPct).toBe(19);
    expect(p.subtotalCLP).toBe(0);
  });

  it('crearPlan asigna numeros correlativos 1, 2, 3', async () => {
    const a = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const b = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const c = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    expect([a.numero, b.numero, c.numero]).toEqual([1, 2, 3]);
  });

  it('actualizarPlan reemplaza partidas y recalcula totales', async () => {
    const p = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const actualizado = await actualizarPlan(clienteSlug, tableroSlug, p.id, {
      partidas: [{
        itemCodigo: 'DPS-1P-T2', itemDescripcion: 'DPS',
        unidad: 'ud', precioUnitarioCLP: 35000, cantidad: 2
      }]
    });
    expect(actualizado.partidas).toHaveLength(1);
    expect(actualizado.partidas[0]!.totalCLP).toBe(70000);
    expect(actualizado.subtotalCLP).toBe(70000);
    expect(actualizado.ivaCLP).toBe(13300);
    expect(actualizado.totalCLP).toBe(83300);
  });

  it('actualizarPlan respeta toggle incluyeIVA=false', async () => {
    const p = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const upd = await actualizarPlan(clienteSlug, tableroSlug, p.id, {
      partidas: [{ itemCodigo: 'X', itemDescripcion: 'X', unidad: 'ud', precioUnitarioCLP: 100, cantidad: 1 }],
      incluyeIVA: false
    });
    expect(upd.ivaCLP).toBe(0);
    expect(upd.totalCLP).toBe(100);
  });

  it('actualizarPlan cambia estado', async () => {
    const p = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const upd = await actualizarPlan(clienteSlug, tableroSlug, p.id, { estado: 'enviado' });
    expect(upd.estado).toBe('enviado');
  });

  it('eliminarPlan saca el plan de la lista', async () => {
    const p = await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    await eliminarPlan(clienteSlug, tableroSlug, p.id);
    expect(await listarPlanes(clienteSlug, tableroSlug)).toHaveLength(0);
  });

  it('actualizarPlan de id inexistente arroja error', async () => {
    await expect(
      actualizarPlan(clienteSlug, tableroSlug, 'no-existe', { estado: 'enviado' })
    ).rejects.toThrow();
  });

  it('persistencia: planes se guardan en tablero.json', async () => {
    await crearPlan(clienteSlug, tableroSlug, { autoSugerir: false });
    const tablero = await leerTablero(clienteSlug, tableroSlug);
    expect(tablero.planesNormalizacion).toHaveLength(1);
  });
});
