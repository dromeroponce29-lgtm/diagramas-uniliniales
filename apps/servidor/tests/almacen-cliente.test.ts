import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import {
  crearCliente,
  leerCliente,
  listarClientes,
  actualizarCliente,
  eliminarCliente
} from '../src/almacen/cliente.js';

describe('almacén Cliente', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('crea un cliente nuevo con slug derivado del nombre', async () => {
    const c = await crearCliente({ nombre: 'Constructora Andes Ltda.' });
    expect(c.id).toBeDefined();
    expect(c.slug).toBe('constructora-andes-ltda');
    expect(c.nombre).toBe('Constructora Andes Ltda.');
    expect(c.tableros).toEqual([]);
    expect(c.creadoEn).toBeDefined();
  });

  it('lee un cliente que fue creado', async () => {
    const c = await crearCliente({ nombre: 'Empresa A' });
    const leido = await leerCliente(c.slug);
    expect(leido.id).toBe(c.id);
    expect(leido.nombre).toBe('Empresa A');
  });

  it('agrega sufijo numérico si el slug ya existe', async () => {
    const a = await crearCliente({ nombre: 'Empresa' });
    const b = await crearCliente({ nombre: 'Empresa' });
    expect(a.slug).toBe('empresa');
    expect(b.slug).toBe('empresa-2');
  });

  it('lista todos los clientes existentes', async () => {
    await crearCliente({ nombre: 'A' });
    await crearCliente({ nombre: 'B' });
    const lista = await listarClientes();
    expect(lista).toHaveLength(2);
    expect(lista.map(c => c.nombre).sort()).toEqual(['A', 'B']);
  });

  it('actualiza campos del cliente y actualiza actualizadoEn', async () => {
    const c = await crearCliente({ nombre: 'Empresa' });
    const original = c.actualizadoEn;
    await new Promise(r => setTimeout(r, 5));
    const u = await actualizarCliente(c.slug, { direccion: 'Av. Apoquindo 123' });
    expect(u.direccion).toBe('Av. Apoquindo 123');
    expect(u.actualizadoEn).not.toBe(original);
  });

  it('rechaza actualización si el cliente no existe', async () => {
    await expect(actualizarCliente('inexistente', { direccion: 'X' })).rejects.toThrow();
  });

  it('elimina un cliente y su carpeta', async () => {
    const c = await crearCliente({ nombre: 'A eliminar' });
    await eliminarCliente(c.slug);
    await expect(leerCliente(c.slug)).rejects.toThrow();
  });

  it('persiste instaladorPredeterminado* vía actualizarCliente', async () => {
    const c = await crearCliente({ nombre: 'Acme' });
    const actualizado = await actualizarCliente(c.slug, {
      instaladorPredeterminadoNombre: 'Daniel R.',
      instaladorPredeterminadoRUT: '12.345.678-9',
      instaladorPredeterminadoClaseSEC: 'A',
      proyectoNombrePredeterminado: 'Edificio Acme'
    });
    expect(actualizado.instaladorPredeterminadoClaseSEC).toBe('A');
    expect(actualizado.proyectoNombrePredeterminado).toBe('Edificio Acme');
  });

  it('lanza error claro si el JSON en disco no parsea contra el schema', async () => {
    const c = await crearCliente({ nombre: 'Empresa' });
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await writeFile(join(dir, c.slug, 'cliente.json'), '{ "nombre": 123 }', 'utf-8');
    await expect(leerCliente(c.slug)).rejects.toThrow();
  });
});
