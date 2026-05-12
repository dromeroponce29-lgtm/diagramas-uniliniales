import { describe, it, expect } from 'vitest';
import { EsquemaExtraccionAgente } from '../src/esquemas/extraccion.js';

// Reproduce el incidente del 502 (2026-05-12): los agentes a veces omiten o
// envían null en los campos array cuando no detectan nada. El schema debe
// tolerarlo coercionando a [] en vez de rechazar la respuesta completa.

describe('EsquemaExtraccionAgente — tolerancia a omisiones de los agentes', () => {
  it('acepta payload con componentesDetectados ausente (caso Claude observado)', () => {
    const payloadClaude = {
      calidadFoto: 'mala',
      problemasFoto: ['foto borrosa']
      // componentesDetectados omitido
      // rotulacionCircuitosLeida omitida
    };
    const parsed = EsquemaExtraccionAgente.parse(payloadClaude);
    expect(parsed.componentesDetectados).toEqual([]);
    expect(parsed.rotulacionCircuitosLeida).toEqual([]);
  });

  it('acepta payload con rotulacionCircuitosLeida = null (caso OpenAI observado)', () => {
    const payloadOpenai = {
      calidadFoto: 'aceptable',
      problemasFoto: [],
      componentesDetectados: [],
      rotulacionCircuitosLeida: null
    };
    const parsed = EsquemaExtraccionAgente.parse(payloadOpenai);
    expect(parsed.rotulacionCircuitosLeida).toEqual([]);
  });

  it('acepta problemasFoto null y lo convierte a []', () => {
    const payload = {
      calidadFoto: 'buena',
      problemasFoto: null,
      componentesDetectados: [],
      rotulacionCircuitosLeida: []
    };
    const parsed = EsquemaExtraccionAgente.parse(payload);
    expect(parsed.problemasFoto).toEqual([]);
  });

  it('sigue parseando correctamente un payload completo y válido', () => {
    const payload = {
      calidadFoto: 'buena',
      problemasFoto: [],
      componentesDetectados: [
        {
          tipoSugerido: 'interruptor-automatico',
          marca: 'Schneider',
          modelo: null,
          calibreA: 16,
          polos: 1,
          curva: 'C',
          sensibilidadMA: null,
          posicion: { fila: 0, columna: 0 },
          textoLeido: 'C16',
          confianzaAgente: 'alta',
          notas: null
        }
      ],
      rotulacionCircuitosLeida: [{ numero: 1, textoOriginal: 'Iluminación' }]
    };
    const parsed = EsquemaExtraccionAgente.parse(payload);
    expect(parsed.componentesDetectados).toHaveLength(1);
    expect(parsed.componentesDetectados[0]!.calibreA).toBe(16);
  });
});
