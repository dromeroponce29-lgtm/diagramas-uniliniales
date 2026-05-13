import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import { crearCliente } from '../src/almacen/cliente.js';
import {
  leerCatalogo,
  reemplazarCatalogo,
  restaurarSemillaCatalogo
} from '../src/almacen/catalogo.js';

describe('almacén Catálogo', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('cliente sin catálogo: leerCatalogo lo crea desde la semilla y persiste', async () => {
    const c = await crearCliente({ nombre: 'A' });
    const cat = await leerCatalogo(c.slug);
    expect(cat.length).toBeGreaterThanOrEqual(20);
    const cat2 = await leerCatalogo(c.slug);
    expect(cat2.map(i => i.id).sort()).toEqual(cat.map(i => i.id).sort());
  });

  it('cada item del catálogo semilla recibe un id ULID al persistirse', async () => {
    const c = await crearCliente({ nombre: 'A' });
    const cat = await leerCatalogo(c.slug);
    for (const item of cat) {
      expect(item.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    }
  });

  it('reemplazarCatalogo persiste un catálogo dado', async () => {
    const c = await crearCliente({ nombre: 'A' });
    await leerCatalogo(c.slug);
    const nuevo = [{
      id: '01J', codigo: 'NUEVO', descripcion: 'Item de prueba',
      tipo: 'material' as const, unidad: 'ud' as const,
      precioUnitarioCLP: 1000, categoria: 'otro' as const
    }];
    await reemplazarCatalogo(c.slug, nuevo);
    const releido = await leerCatalogo(c.slug);
    expect(releido).toHaveLength(1);
    expect(releido[0]!.codigo).toBe('NUEVO');
  });

  it('reemplazarCatalogo asigna ULID si el item entra sin id', async () => {
    const c = await crearCliente({ nombre: 'A' });
    await leerCatalogo(c.slug);
    const nuevo = [{
      codigo: 'X', descripcion: 'X',
      tipo: 'material' as const, unidad: 'ud' as const,
      precioUnitarioCLP: 100, categoria: 'otro' as const
    }];
    const guardado = await reemplazarCatalogo(c.slug, nuevo);
    expect(guardado[0]!.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('reemplazarCatalogo rechaza códigos duplicados', async () => {
    const c = await crearCliente({ nombre: 'A' });
    await leerCatalogo(c.slug);
    const nuevo = [
      { codigo: 'X', descripcion: 'X1', tipo: 'material' as const, unidad: 'ud' as const, precioUnitarioCLP: 100, categoria: 'otro' as const },
      { codigo: 'X', descripcion: 'X2', tipo: 'material' as const, unidad: 'ud' as const, precioUnitarioCLP: 200, categoria: 'otro' as const }
    ];
    await expect(reemplazarCatalogo(c.slug, nuevo)).rejects.toThrow(/duplicad/i);
  });

  it('restaurarSemillaCatalogo sobrescribe con la semilla', async () => {
    const c = await crearCliente({ nombre: 'A' });
    await reemplazarCatalogo(c.slug, [{
      codigo: 'X', descripcion: 'X', tipo: 'material' as const, unidad: 'ud' as const,
      precioUnitarioCLP: 100, categoria: 'otro' as const
    }]);
    const restaurado = await restaurarSemillaCatalogo(c.slug);
    expect(restaurado.length).toBeGreaterThanOrEqual(20);
    expect(restaurado.find(i => i.codigo === 'X')).toBeUndefined();
  });

  it('leerCatalogo de un cliente inexistente arroja error', async () => {
    await expect(leerCatalogo('cliente-no-existe')).rejects.toThrow();
  });
});
