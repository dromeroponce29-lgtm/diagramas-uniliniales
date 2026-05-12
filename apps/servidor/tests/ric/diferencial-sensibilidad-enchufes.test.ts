import { describe, it, expect } from 'vitest';
import { reglaDiferencialSensibilidadEnchufes } from '../../../../tipos/ric/reglas/diferencial-sensibilidad-enchufes.js';
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

describe('reglaDiferencialSensibilidadEnchufes', () => {
  it('no emite hallazgos si no hay circuitos de enchufes', () => {
    expect(reglaDiferencialSensibilidadEnchufes.evaluar(tableroVacio())).toEqual([]);
  });

  it('no-cumple si circuito enchufes no tiene diferencial asociado', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('no-cumple si diferencial asociado tiene sensibilidad > 30 mA', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 300, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', diferencialComponenteId: 'd1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si diferencial asociado tiene sensibilidad ≤ 30 mA', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 30, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', diferencialComponenteId: 'd1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('pendiente-verificar si uso del circuito es pendiente', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: '', uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
