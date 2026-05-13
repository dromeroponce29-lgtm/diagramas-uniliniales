// apps/servidor/tests/ric/derivar-levantamientos.test.ts
import { describe, it, expect } from 'vitest';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';
import type { Tablero, ComponenteReconciliado } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

/** Tablero con todos los datos que las reglas necesitan para no generar pendiente-verificar. */
function tableroCompleto(): Tablero {
  const ig: ComponenteReconciliado = {
    id: 'ig1', tipo: 'interruptor-general', calibreA: 63,
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
  const dif: ComponenteReconciliado = {
    id: 'dif1', tipo: 'diferencial', sensibilidadMA: 30,
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
  const barraTierra: ComponenteReconciliado = {
    id: 'bt1', tipo: 'barra-tierra',
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
  const barraNeutro: ComponenteReconciliado = {
    id: 'bn1', tipo: 'barra-neutro',
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
  const ia: ComponenteReconciliado = {
    id: 'ia1', tipo: 'interruptor-automatico', calibreA: 16,
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: '380V/220V-trif-n', esquemaTierra: 'TT',
    corrienteNominalA: 63, espaciosTotales: 12,
    fotos: [], componentes: [ig, dif, barraTierra, barraNeutro, ia], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 100,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('derivarLevantamientosTerreno', () => {
  it('incluye pendientes con resoluble = medicion-terreno', () => {
    const t = tableroCompleto();
    t.pendientes = [
      { id: 'p1', categoria: 'dato-no-observable', descripcion: 'verificar tierra', resoluble: 'medicion-terreno' },
      { id: 'p2', categoria: 'dato-no-observable', descripcion: 'otro', resoluble: 'entrada-manual' }
    ];
    const ls = derivarLevantamientosTerreno(t);
    const pendienteItems = ls.filter(l => l.origen === 'pendiente');
    expect(pendienteItems).toHaveLength(1);
    expect(pendienteItems[0]!.origen).toBe('pendiente');
  });

  it('incluye anotaciones tipo levantamiento-terreno', () => {
    const t = tableroVacio();
    t.anotacionesHallazgos = [{
      id: 'a1', reglaId: 'ric.tablero.dps-presente', tipo: 'levantamiento-terreno',
      justificacion: 'medir con megger', creadoEn: '2026-05-12T00:00:00Z'
    }];
    const ls = derivarLevantamientosTerreno(t);
    // hay al menos el de la anotación; quizás más de pendiente-verificar de las reglas
    const anotacionItem = ls.find(l => l.origen === 'anotacion-usuario');
    expect(anotacionItem).toBeDefined();
  });

  it('NO incluye hallazgos normativos pendiente-verificar (esos son cumplimiento, no datos del diagrama)', () => {
    const t = tableroVacio();
    const ls = derivarLevantamientosTerreno(t);
    const algunoDeRegla = ls.some(l => l.origen === ('regla-ric' as unknown as string));
    expect(algunoDeRegla).toBe(false);
  });

  it('incluye campos del diagrama RIC N°18 que faltan completar', () => {
    const t = tableroVacio();   // del helper existente en el archivo
    const ls = derivarLevantamientosTerreno(t);
    const conOrigenDiagrama = ls.filter(l => l.origen === 'campo-diagrama');
    expect(conOrigenDiagrama.length).toBeGreaterThan(0);
    // Por ejemplo, la tensión debe aparecer
    expect(conOrigenDiagrama.some(l => l.descripcion.toLowerCase().includes('tensión'))).toBe(true);
  });
});
