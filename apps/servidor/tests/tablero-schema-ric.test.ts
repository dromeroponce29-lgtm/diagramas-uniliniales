import { describe, it, expect } from 'vitest';
import { EsquemaTablero } from '../src/esquemas/tablero.js';

const tableroBase = {
  id: '01J0000000000000000000000A',
  slug: 'tg',
  clienteId: '01J0000000000000000000000B',
  codigo: 'TG',
  nombre: 'Tablero General',
  tipo: 'general',
  tensionSistema: 'pendiente',
  esquemaTierra: 'pendiente',
  fotos: [],
  componentes: [],
  pendientes: [],
  porcentajeCompletitud: 0,
  creadoEn: '2026-05-12T00:00:00Z',
  actualizadoEn: '2026-05-12T00:00:00Z',
  circuitos: [],
  anotacionesHallazgos: []
};

describe('EsquemaTablero — campos de Plan 4', () => {
  it('acepta tablero con circuitos vacíos y anotacionesHallazgos vacías', () => {
    expect(() => EsquemaTablero.parse(tableroBase)).not.toThrow();
  });

  it('acepta espaciosTotales como número positivo', () => {
    const t = { ...tableroBase, espaciosTotales: 24 };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.espaciosTotales).toBe(24);
  });

  it('acepta un Circuito completo', () => {
    const t = {
      ...tableroBase,
      circuitos: [{
        id: '01J0000000000000000000000C',
        numero: 1,
        proteccionComponenteId: '01J0000000000000000000000D',
        destino: 'Iluminación living',
        uso: 'iluminacion',
        seccionConductorMM2: 2.5,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.circuitos).toHaveLength(1);
    expect(parsed.circuitos[0]!.uso).toBe('iluminacion');
  });

  it('acepta una AnotacionHallazgo tipo no-aplica', () => {
    const t = {
      ...tableroBase,
      anotacionesHallazgos: [{
        id: '01J0000000000000000000000E',
        reglaId: 'ric.tablero.dps-presente',
        tipo: 'no-aplica',
        justificacion: 'Instalación previa a la entrada en vigencia',
        creadoEn: '2026-05-12T00:00:00Z'
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.anotacionesHallazgos[0]!.tipo).toBe('no-aplica');
  });

  it('rechaza tipo de AnotacionHallazgo inválido', () => {
    const t = {
      ...tableroBase,
      anotacionesHallazgos: [{
        id: '01J',
        reglaId: 'x',
        tipo: 'inexistente',
        justificacion: '',
        creadoEn: '2026-05-12T00:00:00Z'
      }]
    };
    expect(() => EsquemaTablero.parse(t)).toThrow();
  });
});
