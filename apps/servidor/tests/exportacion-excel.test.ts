import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { construirExportXLSX } from '../src/exportacion/excel.js';
import type { Tablero } from '../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z'
  };
}

async function abrirWb(buf: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

describe('construirExportXLSX', () => {
  it('genera 3 hojas con los nombres esperados', async () => {
    const buf = await construirExportXLSX(tableroBase());
    const wb = await abrirWb(buf);
    const nombres = wb.worksheets.map(w => w.name).sort();
    expect(nombres).toEqual([
      'Cuadro de cargas', 'Hallazgos RIC', 'Levantamientos terreno'
    ]);
  });

  function valoresDeColumna(hoja: ExcelJS.Worksheet, colIdx: number): string[] {
    const out: string[] = [];
    hoja.eachRow((row, idx) => {
      if (idx === 1) return;   // skip header
      const v = row.getCell(colIdx).value;
      if (v !== null && v !== undefined && v !== '') out.push(String(v));
    });
    return out;
  }

  it('cuadro de cargas tiene fila por circuito con destino y sección', async () => {
    const t = tableroBase();
    t.componentes = [{
      id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, polos: 1, curva: 'C',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'Iluminación living', uso: 'iluminacion',
      seccionConductorMM2: 2.5, longitudM: 8, cargaW: 600, corrienteA: 2.7,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const wb = await abrirWb(await construirExportXLSX(t));
    const hoja = wb.getWorksheet('Cuadro de cargas')!;
    // Columna 2 = destino. Debe contener "Iluminación living"
    expect(valoresDeColumna(hoja, 2)).toContain('Iluminación living');
    // Columna 6 = sección. Debe contener 2.5
    expect(valoresDeColumna(hoja, 6)).toContain('2.5');
  });

  it('hoja de hallazgos RIC tiene filas no-cumple (excluye cumple)', async () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';   // sale del empty-state
    const wb = await abrirWb(await construirExportXLSX(t));
    const hoja = wb.getWorksheet('Hallazgos RIC')!;
    // Columna 3 = resultado. Ninguna fila debe decir "cumple".
    const resultados = valoresDeColumna(hoja, 3);
    expect(resultados.length).toBeGreaterThan(0);
    for (const r of resultados) {
      expect(r.toLowerCase()).not.toBe('cumple');
    }
  });

  it('hoja de levantamientos lista los datos faltantes del diagrama (tensión, esquema tierra, etc.)', async () => {
    const t = tableroBase();   // tensión y esquema tierra son 'pendiente'
    const wb = await abrirWb(await construirExportXLSX(t));
    const hoja = wb.getWorksheet('Levantamientos terreno')!;
    // Columna 3 = descripción. Debe haber al menos una descripción que mencione "Tensión".
    const descripciones = valoresDeColumna(hoja, 3);
    expect(descripciones.some(d => d.toLowerCase().includes('tensión'))).toBe(true);
    expect(descripciones.some(d => d.toLowerCase().includes('tierra'))).toBe(true);
  });

  it('hoja de levantamientos incluye los pendientes de medición en terreno (anotaciones manuales)', async () => {
    const t = tableroBase();
    t.pendientes = [{
      id: 'p1',
      categoria: 'dato-no-observable',
      descripcion: 'Medir resistencia de puesta a tierra',
      resoluble: 'medicion-terreno'
    }];
    const wb = await abrirWb(await construirExportXLSX(t));
    const hoja = wb.getWorksheet('Levantamientos terreno')!;
    // Columna 3 = descripción.
    const descripciones = valoresDeColumna(hoja, 3);
    expect(descripciones).toContain('Medir resistencia de puesta a tierra');
  });
});
