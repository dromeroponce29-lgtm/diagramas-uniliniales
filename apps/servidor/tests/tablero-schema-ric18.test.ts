import { describe, it, expect } from 'vitest';
import { EsquemaTablero } from '../src/esquemas/tablero.js';

const tableroBase = {
  id: '01J', slug: 'tg', clienteId: '01C',
  codigo: 'TG', nombre: 'X', tipo: 'general',
  tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
  fotos: [], componentes: [], pendientes: [],
  circuitos: [], anotacionesHallazgos: [],
  porcentajeCompletitud: 0,
  creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
};

describe('EsquemaTablero — campos RIC N°18 (Plan 5)', () => {
  it('acepta tablero con frecuenciaHz, capacidadNominalA y notasGenerales', () => {
    const t = { ...tableroBase, frecuenciaHz: 50, capacidadNominalA: 100, notasGenerales: 'X' };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.frecuenciaHz).toBe(50);
    expect(parsed.capacidadNominalA).toBe(100);
  });

  it('acepta DatosAcometida con tipo aerea', () => {
    const t = { ...tableroBase, acometida: { tipo: 'aerea', ubicacion: 'Frontis edificio' } };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.acometida?.tipo).toBe('aerea');
  });

  it('acepta DatosAlimentadorEntrada con sección y canalización', () => {
    const t = {
      ...tableroBase,
      alimentadorEntrada: {
        seccionConductorMM2: 16, longitudM: 12,
        canalizacionTipo: 'EMT', canalizacionDiametroMM: 25, canalizacionMaterial: 'acero',
        capacidadCorrienteA: 80, conductoresPorFase: 1
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.alimentadorEntrada?.seccionConductorMM2).toBe(16);
  });

  it('acepta DatosPuestaATierra con resistencia y electrodo', () => {
    const t = {
      ...tableroBase,
      puestaATierra: {
        resistenciaOhmMedida: 4.2,
        instrumentoMedicion: 'Telurímetro Fluke 1623-2',
        tipoElectrodo: 'jabalina'
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.puestaATierra?.resistenciaOhmMedida).toBe(4.2);
  });

  it('acepta DatosVineta con instalador y lámina', () => {
    const t = {
      ...tableroBase,
      vineta: {
        numeroLamina: 'E-01', revision: 'Rev 0',
        instaladorNombre: 'Daniel Romero', instaladorRUT: '12.345.678-9',
        instaladorClaseSEC: 'A'
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.vineta?.instaladorClaseSEC).toBe('A');
  });

  it('acepta Circuito con datos de canalización y corriente', () => {
    const t = {
      ...tableroBase,
      circuitos: [{
        id: '01C1', numero: 1, proteccionComponenteId: '01CC',
        destino: 'Living', uso: 'iluminacion',
        seccionConductorMM2: 2.5, longitudM: 8,
        canalizacionTipo: 'EMT', canalizacionDiametroMM: 20, canalizacionMaterial: 'PVC',
        capacidadCorrienteA: 25, corrienteA: 2.7,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.circuitos[0]!.canalizacionTipo).toBe('EMT');
  });

  it('acepta Componente con capacidadCortocircuitoKA', () => {
    const t = {
      ...tableroBase,
      componentes: [{
        id: 'c1', tipo: 'interruptor-general', calibreA: 63,
        capacidadCortocircuitoKA: 10,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.componentes[0]!.capacidadCortocircuitoKA).toBe(10);
  });

  it('rechaza tipoElectrodo inválido', () => {
    const t = {
      ...tableroBase,
      puestaATierra: { tipoElectrodo: 'inexistente' }
    };
    expect(() => EsquemaTablero.parse(t)).toThrow();
  });
});
