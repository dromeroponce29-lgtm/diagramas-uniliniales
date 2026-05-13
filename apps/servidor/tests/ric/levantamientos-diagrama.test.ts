// apps/servidor/tests/ric/levantamientos-diagrama.test.ts
import { describe, it, expect } from 'vitest';
import { levantamientosParaDiagrama } from '../../../../tipos/ric/levantamientos-diagrama.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z'
  };
}

describe('levantamientosParaDiagrama', () => {
  it('genera levantamientos para los campos críticos del tablero vacío', () => {
    const items = levantamientosParaDiagrama(tableroVacio());
    const rutas = items.map(i => i.ruta);
    expect(rutas).toContain('tablero.tensionSistema');
    expect(rutas).toContain('tablero.esquemaTierra');
    expect(rutas).toContain('tablero.acometida.tipo');
    expect(rutas).toContain('tablero.alimentadorEntrada.seccionConductorMM2');
    expect(rutas).toContain('tablero.alimentadorEntrada.longitudM');
    expect(rutas).toContain('tablero.puestaATierra.resistenciaOhmMedida');
  });

  it('no genera levantamientos para campos ya completados', () => {
    const t = tableroVacio();
    t.tensionSistema = '380V/220V-trif-n';
    t.alimentadorEntrada = { seccionConductorMM2: 16, longitudM: 12 };
    const items = levantamientosParaDiagrama(t);
    const rutas = items.map(i => i.ruta);
    expect(rutas).not.toContain('tablero.tensionSistema');
    expect(rutas).not.toContain('tablero.alimentadorEntrada.seccionConductorMM2');
    expect(rutas).not.toContain('tablero.alimentadorEntrada.longitudM');
  });

  it('genera levantamiento por automático sin calibre/curva/Icu', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const items = levantamientosParaDiagrama(t);
    const conComp = items.filter(i => i.componenteId === 'a1');
    expect(conComp.length).toBeGreaterThanOrEqual(3);  // al menos calibre, curva, Icu
    const rutas = conComp.map(i => i.ruta);
    expect(rutas.some(r => r.includes('calibreA'))).toBe(true);
    expect(rutas.some(r => r.includes('curva'))).toBe(true);
    expect(rutas.some(r => r.includes('capacidadCortocircuitoKA'))).toBe(true);
  });

  it('genera levantamiento por circuito sin destino/sección/longitud', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, polos: 1, curva: 'C', capacidadCortocircuitoKA: 6, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'pendiente', uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const items = levantamientosParaDiagrama(t);
    const conCirc = items.filter(i => i.circuitoId === 'c1');
    const rutas = conCirc.map(i => i.ruta);
    expect(rutas.some(r => r.includes('seccionConductorMM2'))).toBe(true);
    expect(rutas.some(r => r.includes('longitudM'))).toBe(true);
    expect(rutas.some(r => r.includes('destino'))).toBe(true);
  });

  it('cada item incluye descripción, categoría, prioridad', () => {
    const items = levantamientosParaDiagrama(tableroVacio());
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.descripcion).toBeTruthy();
      expect(['medicion', 'lectura-etiqueta', 'inspeccion-visual', 'consulta-cliente', 'prueba-funcional', 'indagatorio']).toContain(i.categoria);
      expect(['alta', 'media', 'baja']).toContain(i.prioridad);
    }
  });

  it('items críticos (tensión, tierra, alimentador, R tierra) tienen prioridad alta', () => {
    const items = levantamientosParaDiagrama(tableroVacio());
    const tension = items.find(i => i.ruta === 'tablero.tensionSistema');
    const rTierra = items.find(i => i.ruta === 'tablero.puestaATierra.resistenciaOhmMedida');
    expect(tension?.prioridad).toBe('alta');
    expect(rTierra?.prioridad).toBe('alta');
  });

  it('sugiere instrumento cuando aplica', () => {
    const items = levantamientosParaDiagrama(tableroVacio());
    const rTierra = items.find(i => i.ruta === 'tablero.puestaATierra.resistenciaOhmMedida');
    expect(rTierra?.instrumentoSugerido).toMatch(/telur/i);
  });

  it('emite ítems indagatorios para elementos generales del tablero (luces piloto, paradas emergencia, borneras)', () => {
    const items = levantamientosParaDiagrama(tableroVacio());
    const rutas = items.map(i => i.ruta);
    expect(rutas).toContain('tablero.lucesPiloto');
    expect(rutas).toContain('tablero.paradasEmergencia');
    expect(rutas).toContain('tablero.borneras');
    expect(rutas).toContain('tablero.transformadorControl');
    // Todos esos son categoría 'indagatorio'
    expect(items.find(i => i.ruta === 'tablero.lucesPiloto')?.categoria).toBe('indagatorio');
  });

  it('emite pruebas funcionales por cada diferencial (botón TEST, corriente y tiempos de disparo)', () => {
    const t = tableroVacio();
    t.componentes = [{
      id: 'd1', tipo: 'diferencial', polos: 2, sensibilidadMA: 30,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const items = levantamientosParaDiagrama(t);
    const rutasDifer = items.filter(i => i.componenteId === 'd1').map(i => i.ruta);
    expect(rutasDifer).toContain('componente.d1.pruebaBotonTest');
    expect(rutasDifer).toContain('componente.d1.corrienteDisparoMA');
    expect(rutasDifer).toContain('componente.d1.tiempoDisparoIDnMs');
    // Botón TEST es prueba-funcional
    expect(items.find(i => i.ruta === 'componente.d1.pruebaBotonTest')?.categoria).toBe('prueba-funcional');
  });

  it('emite parámetros específicos por DPS (tipo, In max kA, Up kV)', () => {
    const t = tableroVacio();
    t.componentes = [{
      id: 'dps1', tipo: 'dps',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const items = levantamientosParaDiagrama(t);
    const rutasDps = items.filter(i => i.componenteId === 'dps1').map(i => i.ruta);
    expect(rutasDps).toContain('componente.dps1.tipoDPS');
    expect(rutasDps).toContain('componente.dps1.inMaxKA');
    expect(rutasDps).toContain('componente.dps1.upKV');
  });

  it('emite pruebas eléctricas por cada circuito (megger MΩ y continuidad PE)', () => {
    const t = tableroVacio();
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      uso: 'iluminacion',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const items = levantamientosParaDiagrama(t);
    const rutasC1 = items.filter(i => i.circuitoId === 'c1').map(i => i.ruta);
    expect(rutasC1).toContain('circuito.c1.aislamientoMOhm');
    expect(rutasC1).toContain('circuito.c1.continuidadPEOhm');
  });

  it('emite datos de placa de motor + contactor + relé térmico para circuitos de fuerza', () => {
    const t = tableroVacio();
    t.circuitos = [{
      id: 'cF', numero: 5, proteccionComponenteId: 'a5',
      uso: 'fuerza',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const items = levantamientosParaDiagrama(t);
    const rutasFuerza = items.filter(i => i.circuitoId === 'cF').map(i => i.ruta);
    expect(rutasFuerza).toContain('circuito.cF.motor.hp');
    expect(rutasFuerza).toContain('circuito.cF.motor.kw');
    expect(rutasFuerza).toContain('circuito.cF.contactor');
    expect(rutasFuerza).toContain('circuito.cF.releTermico');
  });
});
