import { describe, it, expect } from 'vitest';
import { reglaBarrasTierraNeutroSeparadas } from '../../../../tipos/ric/reglas/barras-tierra-neutro-separadas.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C',
    codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z',
    actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaBarrasTierraNeutroSeparadas', () => {
  it('pendiente-verificar si esquemaTierra es pendiente', () => {
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(tableroVacio());
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple si TT con barras separadas', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TT';
    t.componentes = [
      { id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bt', tipo: 'barra-tierra', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple si TT sin barra de tierra', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TT';
    t.componentes = [{ id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple por no aplicabilidad si esquema no es TT (TN-S)', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TN-S';
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
