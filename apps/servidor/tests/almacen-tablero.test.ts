import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import { crearCliente, leerCliente } from '../src/almacen/cliente.js';
import {
  crearTablero,
  leerTablero,
  listarTableros,
  actualizarTablero,
  eliminarTablero,
  agregarComponentes,
  agregarFotoYComponentes,
  actualizarComponente
} from '../src/almacen/tablero.js';
import type { ComponenteReconciliado } from '../../../tipos/modelo.js';

describe('almacén Tablero', () => {
  let dir: string;
  let clienteSlug: string;

  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const c = await crearCliente({ nombre: 'Cliente Prueba' });
    clienteSlug = c.slug;
  });

  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('crea un tablero nuevo y lo agrega al resumen del cliente', async () => {
    const t = await crearTablero(clienteSlug, {
      codigo: 'TG',
      nombre: 'Tablero General',
      tipo: 'general'
    });
    expect(t.id).toBeDefined();
    expect(t.slug).toBe('tg');
    expect(t.tensionSistema).toBe('pendiente');
    expect(t.esquemaTierra).toBe('pendiente');
    expect(t.porcentajeCompletitud).toBe(0);

    const cliente = await leerCliente(clienteSlug);
    expect(cliente.tableros).toHaveLength(1);
    expect(cliente.tableros[0]!.codigo).toBe('TG');
  });

  it('lee un tablero existente', async () => {
    const creado = await crearTablero(clienteSlug, { codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const leido = await leerTablero(clienteSlug, creado.slug);
    expect(leido.id).toBe(creado.id);
  });

  it('lista todos los tableros del cliente', async () => {
    await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await crearTablero(clienteSlug, { codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const lista = await listarTableros(clienteSlug);
    expect(lista).toHaveLength(2);
  });

  it('actualiza campos del tablero y recalcula completitud y actualizadoEn', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const original = t.actualizadoEn;
    await new Promise(r => setTimeout(r, 5));
    const u = await actualizarTablero(clienteSlug, t.slug, {
      tensionSistema: '220V-mono',
      esquemaTierra: 'TT',
      potenciaContratadaKW: 5,
      corrienteNominalA: 25
    });
    expect(u.porcentajeCompletitud).toBe(100);
    expect(u.actualizadoEn).not.toBe(original);
  });

  it('agrega componentes al tablero (sin duplicar por id)', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const comp: ComponenteReconciliado = {
      id: 'comp-1',
      tipo: 'interruptor-general',
      calibreA: 63,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    };
    const t1 = await agregarComponentes(clienteSlug, t.slug, [comp]);
    expect(t1.componentes).toHaveLength(1);

    const t2 = await agregarComponentes(clienteSlug, t.slug, [comp]);
    expect(t2.componentes).toHaveLength(1);
  });

  it('agrega foto y componentes atómicamente', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const foto = {
      id: 'foto-1', nombreOriginal: 'a.jpg', mimeType: 'image/jpeg',
      calidadFoto: 'buena' as const, problemasFoto: [], subidaEn: '2026-01-01'
    };
    const comp: ComponenteReconciliado = {
      id: 'c1', tipo: 'interruptor-general', calibreA: 63,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    };
    const r = await agregarFotoYComponentes(clienteSlug, t.slug, foto, [comp]);
    expect(r.fotos).toHaveLength(1);
    expect(r.componentes).toHaveLength(1);
  });

  it('actualiza un componente individual (resolver discrepancia o entrada manual)', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const comp: ComponenteReconciliado = {
      id: 'comp-1',
      tipo: 'interruptor-automatico',
      calibreA: 16,
      procedencia: { fuente: 'foto-claude', confianza: 'discrepancia', notas: 'Claude 16, OpenAI 10' }
    };
    await agregarComponentes(clienteSlug, t.slug, [comp]);

    const u = await actualizarComponente(clienteSlug, t.slug, 'comp-1', {
      calibreA: 16,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    });
    expect(u.componentes.find(c => c.id === 'comp-1')!.procedencia.confianza).toBe('alta');
  });

  it('elimina un tablero y lo quita del resumen del cliente', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await eliminarTablero(clienteSlug, t.slug);
    const cliente = await leerCliente(clienteSlug);
    expect(cliente.tableros).toHaveLength(0);
    await expect(leerTablero(clienteSlug, t.slug)).rejects.toThrow();
  });

  it('permite guardar espaciosTotales vía actualizarTablero', async () => {
    const t = await crearTablero(clienteSlug, {
      codigo: 'TG', nombre: 'X', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    const actualizado = await actualizarTablero(clienteSlug, t.slug, { espaciosTotales: 24 });
    expect(actualizado.espaciosTotales).toBe(24);
    const releido = await leerTablero(clienteSlug, t.slug);
    expect(releido.espaciosTotales).toBe(24);
  });

  it('inicializa circuitos y anotacionesHallazgos como arrays vacíos', async () => {
    const tablero = await crearTablero(clienteSlug, {
      codigo: 'TG', nombre: 'Test', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    expect(tablero.circuitos).toEqual([]);
    expect(tablero.anotacionesHallazgos).toEqual([]);
    expect(tablero.espaciosTotales).toBeUndefined();
  });
});
