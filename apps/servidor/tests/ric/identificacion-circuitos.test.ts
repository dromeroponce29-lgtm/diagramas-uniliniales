import { describe, it, expect } from 'vitest';
import { reglaIdentificacionCircuitos } from '../../../../tipos/ric/reglas/identificacion-circuitos.js';
import type { Tablero } from '../../../../tipos/modelo.js';

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

describe('reglaIdentificacionCircuitos', () => {
  it('no emite hallazgos si no hay circuitos', () => {
    expect(reglaIdentificacionCircuitos.evaluar(tableroVacio())).toEqual([]);
  });

  it('no-cumple por cada circuito con destino vacío o pendiente', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [
      { id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: '', uso: 'pendiente', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'c2', numero: 2, proteccionComponenteId: 'a1', destino: 'pendiente', uso: 'pendiente', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const hs = reglaIdentificacionCircuitos.evaluar(t);
    expect(hs).toHaveLength(2);
    expect(hs.every(h => h.resultado === 'no-cumple')).toBe(true);
  });

  it('cumple para circuitos con destino real', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: 'Iluminación living', uso: 'iluminacion',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaIdentificacionCircuitos.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
