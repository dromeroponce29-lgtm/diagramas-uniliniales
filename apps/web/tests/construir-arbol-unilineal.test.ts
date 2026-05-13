import { describe, it, expect } from 'vitest';
import { construirArbolUnilineal } from '../src/diagrama/unilineal/construir-arbol.js';
import type { Tablero } from '@tipos/modelo';

function base(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: '380V/220V-trif-n', esquemaTierra: 'TT',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('construirArbolUnilineal', () => {
  it('produce nodo raíz acometida con tensión y frecuencia', () => {
    const t = base();
    t.frecuenciaHz = 50;
    const arbol = construirArbolUnilineal(t);
    expect(arbol.acometida.tipo).toBe('pendiente');
    expect(arbol.tensionSistema).toBe('380V/220V-trif-n');
    expect(arbol.frecuenciaHz).toBe(50);
  });

  it('detecta medidor si existe componente tipo medidor', () => {
    const t = base();
    t.componentes = [{ id: 'm1', tipo: 'medidor', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.tieneMedidor).toBe(true);
  });

  it('detecta IG cuando hay componente interruptor-general', () => {
    const t = base();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', calibreA: 63, polos: 3, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.ig?.id).toBe('ig');
  });

  it('agrupa automáticos como ramales con su circuito asociado', () => {
    const t = base();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [
      { id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: 'Iluminación', uso: 'iluminacion', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.ramales).toHaveLength(1);
    expect(arbol.ramales[0]!.proteccion.id).toBe('a1');
    expect(arbol.ramales[0]!.circuito?.destino).toBe('Iluminación');
  });

  it('incluye DPS y diferenciales como elementos en paralelo a las barras', () => {
    const t = base();
    t.componentes = [
      { id: 'dps1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 30, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.protecciones.dps).toHaveLength(1);
    expect(arbol.protecciones.diferenciales).toHaveLength(1);
  });

  it('detecta barras separadas', () => {
    const t = base();
    t.componentes = [
      { id: 'bf', tipo: 'barra-fase', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bt', tipo: 'barra-tierra', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.barras.tieneFase).toBe(true);
    expect(arbol.barras.tieneNeutro).toBe(true);
    expect(arbol.barras.tieneTierra).toBe(true);
  });

  it('expone datos de puesta a tierra', () => {
    const t = base();
    t.puestaATierra = { resistenciaOhmMedida: 4.2, tipoElectrodo: 'jabalina' };
    const arbol = construirArbolUnilineal(t);
    expect(arbol.tierra.resistenciaOhmMedida).toBe(4.2);
    expect(arbol.tierra.tipoElectrodo).toBe('jabalina');
  });

  it('expone datos del alimentador de entrada', () => {
    const t = base();
    t.alimentadorEntrada = { seccionConductorMM2: 16, longitudM: 12, canalizacionTipo: 'EMT' };
    const arbol = construirArbolUnilineal(t);
    expect(arbol.alimentadorEntrada.seccionConductorMM2).toBe(16);
  });
});
