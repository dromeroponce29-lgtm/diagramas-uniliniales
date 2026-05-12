import { describe, it, expect } from 'vitest';
import { calcularCompletitud } from '../src/completitud/calcular.js';
import type { Tablero } from '../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '1',
    slug: 't',
    clienteId: 'c',
    codigo: 'TG',
    nombre: 'TG',
    tipo: 'general',
    tensionSistema: 'pendiente',
    esquemaTierra: 'pendiente',
    fotos: [],
    componentes: [],
    pendientes: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-01-01',
    actualizadoEn: '2026-01-01'
  };
}

describe('calcularCompletitud', () => {
  it('un tablero vacío sin datos retorna 0', () => {
    expect(calcularCompletitud(tableroBase())).toBe(0);
  });

  it('un tablero con todos los datos de nivel tablero completos sin componentes retorna 100', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    expect(calcularCompletitud(t)).toBe(100);
  });

  it('un tablero con 50% de los datos de tablero retorna 50', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    expect(calcularCompletitud(t)).toBe(50);
  });

  it('un componente sin discrepancia con marca/modelo/calibre/polos cuenta sus 5 slots', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      marca: 'Schneider',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    }];
    expect(calcularCompletitud(t)).toBe(100);
  });

  it('un componente con discrepancia degrada la completitud', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      marca: 'Schneider',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-claude', confianza: 'discrepancia' }
    }];
    expect(calcularCompletitud(t)).toBe(Math.round((8 / 9) * 100));
  });

  it('un componente con marca ausente cuenta 4/5', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    }];
    expect(calcularCompletitud(t)).toBe(Math.round((8 / 9) * 100));
  });
});
