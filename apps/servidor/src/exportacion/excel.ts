// Exportación del tablero a Excel: 4 hojas con cuadro de cargas, hallazgos
// RIC, datos faltantes y levantamientos de terreno.
import ExcelJS from 'exceljs';
import type { Tablero, ComponenteReconciliado, Circuito } from '../../../../tipos/modelo.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';

// Lo que cuenta como "dato faltante" en cada nivel.
function componenteTieneFaltantes(c: ComponenteReconciliado): string[] {
  const out: string[] = [];
  if (!c.calibreA && c.tipo === 'interruptor-automatico') out.push('calibre A');
  if (!c.polos && (c.tipo === 'interruptor-automatico' || c.tipo === 'diferencial' || c.tipo === 'interruptor-general')) out.push('polos');
  if (!c.curva && c.tipo === 'interruptor-automatico') out.push('curva');
  if (!c.sensibilidadMA && c.tipo === 'diferencial') out.push('sensibilidad mA');
  if (!c.marca) out.push('marca');
  if (!c.modelo) out.push('modelo');
  if (!c.capacidadCortocircuitoKA && (c.tipo === 'interruptor-general' || c.tipo === 'interruptor-automatico')) out.push('Icu (kA)');
  return out;
}

function circuitoTieneFaltantes(c: Circuito): string[] {
  const out: string[] = [];
  if (!c.destino || c.destino === 'pendiente') out.push('destino');
  if (!c.uso || c.uso === 'pendiente') out.push('uso');
  if (!c.cargaW) out.push('potencia W');
  if (!c.corrienteA) out.push('corriente A');
  if (!c.seccionConductorMM2) out.push('sección mm²');
  if (!c.longitudM) out.push('longitud m');
  if (!c.canalizacionTipo) out.push('canalización');
  return out;
}

function nombreCorto(c: ComponenteReconciliado): string {
  const partes = [c.tipo];
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
  // Hoja 3: Datos faltantes (qué información no se pudo extraer)
  // =========================================================================
  const hojaFaltantes = wb.addWorksheet('Datos faltantes');
  hojaFaltantes.columns = [
    { header: 'Nivel', key: 'nivel', width: 16 },
    { header: 'Identificación', key: 'id', width: 28 },
    { header: 'Confianza', key: 'confianza', width: 14 },
    { header: 'Campos faltantes', key: 'faltantes', width: 60 },
    { header: 'Origen', key: 'origen', width: 16 }
  ];
  hojaFaltantes.getRow(1).font = { bold: true };

  // 3.1: Datos generales del tablero
  const faltanGenerales: string[] = [];
  if (tablero.tensionSistema === 'pendiente') faltanGenerales.push('tensión sistema');
  if (tablero.esquemaTierra === 'pendiente') faltanGenerales.push('esquema tierra');
  if (!tablero.frecuenciaHz) faltanGenerales.push('frecuencia Hz');
  if (!tablero.capacidadNominalA) faltanGenerales.push('capacidad nominal A');
  if (!tablero.potenciaContratadaKW) faltanGenerales.push('potencia contratada kW');
  if (!tablero.acometida || tablero.acometida.tipo === 'pendiente') faltanGenerales.push('acometida');
  if (!tablero.alimentadorEntrada || !tablero.alimentadorEntrada.seccionConductorMM2) faltanGenerales.push('alimentador (sección)');
  if (!tablero.puestaATierra || tablero.puestaATierra.resistenciaOhmMedida === undefined) faltanGenerales.push('puesta a tierra (R medida)');
  if (faltanGenerales.length > 0) {
    hojaFaltantes.addRow({
      nivel: 'Datos generales',
      id: tablero.codigo,
      confianza: '—',
      faltantes: faltanGenerales.join(', '),
      origen: 'tablero'
    });
  }

  // 3.2: Componentes con confianza baja o datos faltantes
  for (const c of tablero.componentes) {
    const fc = componenteTieneFaltantes(c);
    if (fc.length === 0 && c.procedencia.confianza !== 'baja' && c.procedencia.confianza !== 'discrepancia') continue;
    hojaFaltantes.addRow({
      nivel: 'Componente',
      id: nombreCorto(c),
      confianza: c.procedencia.confianza,
      faltantes: fc.join(', ') || '(confianza baja)',
      origen: c.procedencia.fuente
    });
  }

  // 3.3: Circuitos incompletos
  for (const c of tablero.circuitos) {
    const fc = circuitoTieneFaltantes(c);
    if (fc.length === 0) continue;
    hojaFaltantes.addRow({
      nivel: 'Circuito',
      id: `C${c.numero}`,
      confianza: c.procedencia.confianza,
      faltantes: fc.join(', '),
      origen: c.procedencia.fuente
    });
  }

  // 3.4: Pendientes explícitos
  for (const p of tablero.pendientes) {
    if (p.resueltoEn) continue;
    hojaFaltantes.addRow({
      nivel: 'Pendiente',
      id: p.componenteId ?? p.id.slice(0, 12),
      confianza: '—',
      faltantes: p.descripcion,
      origen: p.categoria
    });
  }

  // =========================================================================
  // Hoja 4: Levantamientos en terreno
  // =========================================================================
  const hojaTerreno = wb.addWorksheet('Levantamientos terreno');
  hojaTerreno.columns = [
    { header: 'Prioridad', key: 'prioridad', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 60 },
    { header: 'Parte RIC', key: 'parteRIC', width: 14 },
    { header: 'Origen', key: 'origen', width: 22 },
    { header: 'Componente', key: 'componente', width: 24 },
    { header: 'Circuito', key: 'circuito', width: 12 }
  ];
  hojaTerreno.getRow(1).font = { bold: true };
  for (const l of derivarLevantamientosTerreno(tablero)) {
    const comp = l.componenteId ? tablero.componentes.find(c => c.id === l.componenteId) : undefined;
    const circ = l.circuitoId ? tablero.circuitos.find(c => c.id === l.circuitoId) : undefined;
    hojaTerreno.addRow({
      prioridad: l.prioridad,
      descripcion: l.descripcion,
      parteRIC: l.parteRIC ?? '',
      origen: l.origen,
      componente: comp ? nombreCorto(comp) : '',
      circuito: circ ? `C${circ.numero}` : ''
    });
  }

  // ExcelJS.writeBuffer devuelve ArrayBuffer | Buffer según contexto; en Node es Buffer.
  return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
}
