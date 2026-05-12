import { describe, it, expect } from 'vitest';
import { calcularLayout } from '../src/diagrama/layout/calcular.js';
import type { Tablero, ComponenteReconciliado } from '@tipos/modelo';

function tableroBase(): Tablero {
  return {
    id: 't1', slug: 't1', clienteId: 'c1',
    codigo: 'TG', nombre: 'TG', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    porcentajeCompletitud: 0,
    creadoEn: '', actualizadoEn: ''
  };
}

function comp(id: string, tipo: ComponenteReconciliado['tipo'], extras: Partial<ComponenteReconciliado> = {}): ComponenteReconciliado {
  return {
    id, tipo,
    procedencia: { fuente: 'foto-ambos', confianza: 'alta' },
    ...extras
  };
}

describe('calcularLayout', () => {
  it('un tablero vacío produce layout vacío con dimensiones >= 0', () => {
    const l = calcularLayout(tableroBase());
    expect(l.nodos).toEqual([]);
    expect(l.enlaces).toEqual([]);
    expect(l.ancho).toBeGreaterThanOrEqual(0);
    expect(l.alto).toBeGreaterThanOrEqual(0);
  });

  it('clasifica un interruptor general en la capa principal', () => {
    const t = tableroBase();
    t.componentes = [comp('1', 'interruptor-general', { calibreA: 63 })];
    const l = calcularLayout(t);
    expect(l.nodos).toHaveLength(1);
    expect(l.nodos[0]!.capa).toBe('principal');
  });

  it('clasifica automáticos en la capa rama, uno por columna', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-automatico', { calibreA: 16 }),
      comp('2', 'interruptor-automatico', { calibreA: 10 }),
      comp('3', 'interruptor-automatico', { calibreA: 25 })
    ];
    const l = calcularLayout(t);
    expect(l.nodos.filter(n => n.capa === 'rama')).toHaveLength(3);
    const xs = l.nodos.filter(n => n.capa === 'rama').map(n => n.x);
    expect(new Set(xs).size).toBe(3);
  });

  it('apila componentes principales verticalmente (mismo x, distinto y)', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-general', { calibreA: 63 }),
      comp('2', 'diferencial', { calibreA: 63, sensibilidadMA: 30 })
    ];
    const l = calcularLayout(t);
    const principales = l.nodos.filter(n => n.capa === 'principal');
    expect(principales).toHaveLength(2);
    expect(principales[0]!.x).toBe(principales[1]!.x);
    expect(principales[0]!.y).not.toBe(principales[1]!.y);
  });

  it('DPS se coloca en la capa lateral-izq', () => {
    const t = tableroBase();
    t.componentes = [comp('1', 'dps')];
    const l = calcularLayout(t);
    expect(l.nodos[0]!.capa).toBe('lateral-izq');
  });

  it('barra-tierra y barra-neutro van a lateral-der', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'barra-tierra'),
      comp('2', 'barra-neutro')
    ];
    const l = calcularLayout(t);
    expect(l.nodos.every(n => n.capa === 'lateral-der')).toBe(true);
  });

  it('genera enlaces desde principal a barra y desde barra a cada rama', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-general', { calibreA: 63 }),
      comp('2', 'interruptor-automatico', { calibreA: 16 }),
      comp('3', 'interruptor-automatico', { calibreA: 10 })
    ];
    const l = calcularLayout(t);
    expect(l.enlaces.length).toBeGreaterThanOrEqual(3);
  });

  it('el ancho total crece con el número de ramas', () => {
    const t1 = tableroBase();
    t1.componentes = [comp('1', 'interruptor-automatico', { calibreA: 16 })];
    const t2 = tableroBase();
    t2.componentes = [
      comp('1', 'interruptor-automatico', { calibreA: 16 }),
      comp('2', 'interruptor-automatico', { calibreA: 10 }),
      comp('3', 'interruptor-automatico', { calibreA: 25 }),
      comp('4', 'interruptor-automatico', { calibreA: 16 }),
      comp('5', 'interruptor-automatico', { calibreA: 10 })
    ];
    expect(calcularLayout(t2).ancho).toBeGreaterThan(calcularLayout(t1).ancho);
  });

  it('el orden de las ramas es estable (por id, no aleatorio)', () => {
    const t = tableroBase();
    t.componentes = [
      comp('zzz', 'interruptor-automatico', { calibreA: 16 }),
      comp('aaa', 'interruptor-automatico', { calibreA: 10 }),
      comp('mmm', 'interruptor-automatico', { calibreA: 25 })
    ];
    const l1 = calcularLayout(t);
    const l2 = calcularLayout(t);
    expect(l1.nodos.map(n => n.id)).toEqual(l2.nodos.map(n => n.id));
  });
});
