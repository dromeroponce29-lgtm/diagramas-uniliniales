// Exportación del tablero a Excel: 3 hojas — cuadro de cargas, hallazgos
// RIC (cumplimiento normativo) y levantamientos en terreno (datos faltantes
// para el diagrama unilineal). Estos dos últimos son conceptualmente
// disjuntos: hallazgos = desviaciones técnicas vs. normas; levantamientos =
// info que falta para armar el diagrama.
import ExcelJS from 'exceljs';
import type { Tablero, ComponenteReconciliado } from '../../../../tipos/modelo.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';

function nombreCorto(c: ComponenteReconciliado): string {
  const partes: string[] = [c.tipo];
  if (c.calibreA) partes.push(`${c.calibreA}A`);
  if (c.polos) partes.push(`${c.polos}P`);
  if (c.curva) partes.push(c.curva);
  return partes.join(' ');
}

export async function construirExportXLSX(tablero: Tablero): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Diagramas Uniliniales';
  wb.created = new Date();

  // =========================================================================
  // Hoja 1: Cuadro de cargas
  // =========================================================================
  const hojaCargas = wb.addWorksheet('Cuadro de cargas');
  hojaCargas.columns = [
    { header: 'Nº', key: 'numero', width: 6 },
    { header: 'Destino', key: 'destino', width: 30 },
    { header: 'Uso', key: 'uso', width: 14 },
    { header: 'Potencia (W)', key: 'cargaW', width: 14 },
    { header: 'Corriente (A)', key: 'corrienteA', width: 14 },
    { header: 'Sección (mm²)', key: 'seccion', width: 14 },
    { header: 'Longitud (m)', key: 'longitud', width: 14 },
    { header: 'Canalización', key: 'canalizacion', width: 20 },
    { header: 'Protección', key: 'proteccion', width: 24 },
    { header: 'Diferencial', key: 'diferencial', width: 18 }
  ];
  hojaCargas.getRow(1).font = { bold: true };
  for (const c of tablero.circuitos) {
    const prot = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
    const dif = c.diferencialComponenteId
      ? tablero.componentes.find(co => co.id === c.diferencialComponenteId)
      : undefined;
    hojaCargas.addRow({
      numero: c.numero,
      destino: c.destino === 'pendiente' || !c.destino ? '—' : c.destino,
      uso: c.uso === 'pendiente' ? '—' : c.uso,
      cargaW: c.cargaW ?? '—',
      corrienteA: c.corrienteA ?? '—',
      seccion: c.seccionConductorMM2 ?? '—',
      longitud: c.longitudM ?? '—',
      canalizacion: c.canalizacionTipo
        ? `${c.canalizacionTipo}${c.canalizacionDiametroMM ? ` Ø${c.canalizacionDiametroMM}` : ''}`
        : '—',
      proteccion: prot
        ? `${prot.calibreA ?? '?'}A ${prot.polos ?? '?'}P${prot.curva ? ` ${prot.curva}` : ''}${prot.capacidadCortocircuitoKA ? ` · ${prot.capacidadCortocircuitoKA}kA` : ''}`
        : '—',
      diferencial: dif
        ? `${dif.sensibilidadMA ?? '?'}mA${dif.polos ? ` · ${dif.polos}P` : ''}`
        : '—'
    });
  }

  // =========================================================================
  // Hoja 2: Hallazgos RIC (falencias normativas)
  // =========================================================================
  const hojaHallazgos = wb.addWorksheet('Hallazgos RIC');
  hojaHallazgos.columns = [
    { header: 'Parte RIC', key: 'parteRIC', width: 14 },
    { header: 'Regla', key: 'regla', width: 40 },
    { header: 'Resultado', key: 'resultado', width: 18 },
    { header: 'Detalle', key: 'detalle', width: 60 },
    { header: 'Componente', key: 'componente', width: 24 },
    { header: 'Circuito', key: 'circuito', width: 12 }
  ];
  hojaHallazgos.getRow(1).font = { bold: true };
  for (const h of evaluarRIC(tablero)) {
    // Solo no-cumple y pendiente-verificar — los cumple no son "falencias".
    if (h.resultado === 'cumple') continue;
    const comp = h.componenteId ? tablero.componentes.find(c => c.id === h.componenteId) : undefined;
    const circ = h.circuitoId ? tablero.circuitos.find(c => c.id === h.circuitoId) : undefined;
    hojaHallazgos.addRow({
      parteRIC: h.parteRIC,
      regla: h.descripcionRegla,
      resultado: h.resultado === 'no-cumple' ? 'NO CUMPLE' : 'pendiente verificar',
      detalle: h.detalle,
      componente: comp ? nombreCorto(comp) : '',
      circuito: circ ? `C${circ.numero}` : ''
    });
  }

  // =========================================================================
  // Hoja 3: Levantamientos en terreno
  // Datos faltantes necesarios para armar el diagrama unilineal:
  // qué medir/leer/observar de los componentes y conexiones del tablero,
  // entrada y salida. NO incluye cuestiones de cumplimiento normativo
  // (esas viven en la hoja "Hallazgos RIC").
  // =========================================================================
  const hojaTerreno = wb.addWorksheet('Levantamientos terreno');
  hojaTerreno.columns = [
    { header: 'Prioridad', key: 'prioridad', width: 10 },
    { header: 'Categoría', key: 'categoria', width: 16 },
    { header: 'Descripción del dato faltante', key: 'descripcion', width: 60 },
    { header: 'Instrumento sugerido', key: 'instrumento', width: 36 },
    { header: 'Componente', key: 'componente', width: 24 },
    { header: 'Circuito', key: 'circuito', width: 10 },
    { header: 'Ruta', key: 'ruta', width: 50 }
  ];
  hojaTerreno.getRow(1).font = { bold: true };
  // Orden: alta > media > baja
  const ordenPrioridad = { alta: 0, media: 1, baja: 2 };
  const levantamientos = derivarLevantamientosTerreno(tablero)
    .slice()
    .sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad]);
  for (const l of levantamientos) {
    const comp = l.componenteId ? tablero.componentes.find(c => c.id === l.componenteId) : undefined;
    const circ = l.circuitoId ? tablero.circuitos.find(c => c.id === l.circuitoId) : undefined;
    hojaTerreno.addRow({
      prioridad: l.prioridad,
      categoria: l.categoria ?? l.origen,
      descripcion: l.descripcion,
      instrumento: l.instrumentoSugerido ?? '',
      componente: comp ? nombreCorto(comp) : '',
      circuito: circ ? `C${circ.numero}` : '',
      ruta: l.ruta ?? ''
    });
  }

  // ExcelJS.writeBuffer devuelve ArrayBuffer | Buffer según contexto; en Node es Buffer.
  return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
}
