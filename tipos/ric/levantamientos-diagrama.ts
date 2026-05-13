// tipos/ric/levantamientos-diagrama.ts
// Detecta los campos requeridos por el diagrama unilineal RIC N°18 que están
// vacíos en el tablero y los emite como levantamientos para terreno.
// Aplica el principio "no asumir, no estimar".
import type { Tablero } from '../modelo.js';

export type CategoriaCampoDiagrama =
  | 'medicion'           // requiere instrumento
  | 'lectura-etiqueta'   // basta con leer la placa del equipo
  | 'inspeccion-visual'  // observación directa
  | 'consulta-cliente';  // pedir al cliente la info

export interface LevantamientoCampoDiagrama {
  id: string;                       // estable, derivado de la ruta + ids
  ruta: string;                     // ej. "tablero.alimentadorEntrada.longitudM"
  descripcion: string;
  categoria: CategoriaCampoDiagrama;
  instrumentoSugerido?: string;
  componenteId?: string;
  circuitoId?: string;
  prioridad: 'alta' | 'media' | 'baja';
}

function it(
  ruta: string,
  descripcion: string,
  categoria: CategoriaCampoDiagrama,
  prioridad: 'alta' | 'media' | 'baja',
  opts: { instrumento?: string; componenteId?: string; circuitoId?: string } = {}
): LevantamientoCampoDiagrama {
  const id = `${ruta}:${opts.componenteId ?? ''}:${opts.circuitoId ?? ''}`;
  return {
    id,
    ruta,
    descripcion,
    categoria,
    prioridad,
    ...(opts.instrumento && { instrumentoSugerido: opts.instrumento }),
    ...(opts.componenteId && { componenteId: opts.componenteId }),
    ...(opts.circuitoId && { circuitoId: opts.circuitoId })
  };
}

export function levantamientosParaDiagrama(t: Tablero): LevantamientoCampoDiagrama[] {
  const items: LevantamientoCampoDiagrama[] = [];

  // Datos eléctricos básicos del tablero
  if (t.tensionSistema === 'pendiente') {
    items.push(it('tablero.tensionSistema', 'Tensión del sistema (220V / 380V / 380V+N)', 'consulta-cliente', 'alta'));
  }
  if (t.esquemaTierra === 'pendiente') {
    items.push(it('tablero.esquemaTierra', 'Esquema de puesta a tierra (TT / TN-S / TN-C-S / IT)', 'inspeccion-visual', 'alta'));
  }
  if (t.frecuenciaHz === undefined) {
    items.push(it('tablero.frecuenciaHz', 'Frecuencia del sistema en Hz (típicamente 50)', 'consulta-cliente', 'baja'));
  }
  if (t.corrienteNominalA === undefined) {
    items.push(it('tablero.corrienteNominalA', 'Corriente nominal del tablero (A)', 'lectura-etiqueta', 'alta'));
  }
  if (t.capacidadNominalA === undefined) {
    items.push(it('tablero.capacidadNominalA', 'Capacidad nominal del gabinete (A)', 'lectura-etiqueta', 'media'));
  }
  if (t.espaciosTotales === undefined) {
    items.push(it('tablero.espaciosTotales', 'Cantidad de espacios totales del tablero (módulos DIN)', 'inspeccion-visual', 'media'));
  }
  if (t.potenciaContratadaKW === undefined) {
    items.push(it('tablero.potenciaContratadaKW', 'Potencia contratada con la distribuidora (kW)', 'consulta-cliente', 'media'));
  }

  // Acometida
  const acom = t.acometida;
  if (!acom || acom.tipo === 'pendiente') {
    items.push(it('tablero.acometida.tipo', 'Tipo de acometida (aérea / subterránea / desde tablero superior)', 'inspeccion-visual', 'alta'));
  }
  if (!acom?.ubicacion) {
    items.push(it('tablero.acometida.ubicacion', 'Ubicación física de la acometida (frontis, patio, etc.)', 'inspeccion-visual', 'media'));
  }

  // Alimentador de entrada
  const ae = t.alimentadorEntrada;
  if (!ae?.seccionConductorMM2) {
    items.push(it('tablero.alimentadorEntrada.seccionConductorMM2', 'Sección del conductor del alimentador de entrada (mm²)', 'medicion', 'alta', { instrumento: 'Pie de metro / huincha y tabla de calibres' }));
  }
  if (!ae?.longitudM) {
    items.push(it('tablero.alimentadorEntrada.longitudM', 'Longitud del alimentador de entrada (m)', 'medicion', 'alta', { instrumento: 'Huincha de medir' }));
  }
  if (!ae?.canalizacionTipo) {
    items.push(it('tablero.alimentadorEntrada.canalizacionTipo', 'Tipo de canalización del alimentador (EMT / PVC / bandeja / libre)', 'inspeccion-visual', 'alta'));
  }
  if (!ae?.canalizacionDiametroMM) {
    items.push(it('tablero.alimentadorEntrada.canalizacionDiametroMM', 'Diámetro de la canalización del alimentador (mm)', 'medicion', 'media', { instrumento: 'Pie de metro' }));
  }
  if (!ae?.canalizacionMaterial) {
    items.push(it('tablero.alimentadorEntrada.canalizacionMaterial', 'Material de la canalización (acero / PVC / aluminio)', 'inspeccion-visual', 'media'));
  }
  if (!ae?.capacidadCorrienteA) {
    items.push(it('tablero.alimentadorEntrada.capacidadCorrienteA', 'Capacidad de transporte de corriente del alimentador (A)', 'consulta-cliente', 'media'));
  }
  if (!ae?.conductoresPorFase) {
    items.push(it('tablero.alimentadorEntrada.conductoresPorFase', 'Cantidad de conductores por fase (1 si no es paralelo)', 'inspeccion-visual', 'baja'));
  }

  // Puesta a tierra
  const pt = t.puestaATierra;
  if (pt?.resistenciaOhmMedida === undefined) {
    items.push(it('tablero.puestaATierra.resistenciaOhmMedida', 'Resistencia de la puesta a tierra medida en terreno (Ω)', 'medicion', 'alta', { instrumento: 'Telurímetro (ej. Fluke 1623-2)' }));
  }
  if (!pt?.instrumentoMedicion) {
    items.push(it('tablero.puestaATierra.instrumentoMedicion', 'Identificación del instrumento usado para medir la tierra (marca/modelo)', 'lectura-etiqueta', 'media'));
  }
  if (!pt?.tipoElectrodo || pt.tipoElectrodo === 'pendiente') {
    items.push(it('tablero.puestaATierra.tipoElectrodo', 'Tipo de electrodo de tierra (jabalina / malla / multielectrodo)', 'inspeccion-visual', 'media'));
  }
  if (!pt?.fechaMedicion) {
    items.push(it('tablero.puestaATierra.fechaMedicion', 'Fecha en que se midió la resistencia de tierra', 'consulta-cliente', 'baja'));
  }

  // Por componente: campos críticos para RIC N°18
  for (const c of t.componentes) {
    const protegeRamal = c.tipo === 'interruptor-automatico' || c.tipo === 'interruptor-general' || c.tipo === 'diferencial';
    if (protegeRamal && c.calibreA === undefined) {
      items.push(it(`componente.${c.id}.calibreA`, `Calibre nominal (In, A) del ${c.tipo}`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
    }
    if (protegeRamal && c.polos === undefined) {
      items.push(it(`componente.${c.id}.polos`, `Número de polos del ${c.tipo}`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
    }
    if ((c.tipo === 'interruptor-automatico' || c.tipo === 'interruptor-general') && c.curva === undefined) {
      items.push(it(`componente.${c.id}.curva`, `Curva de disparo (B / C / D / K) del ${c.tipo}`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
    }
    if (protegeRamal && c.capacidadCortocircuitoKA === undefined) {
      items.push(it(`componente.${c.id}.capacidadCortocircuitoKA`, `Capacidad de cortocircuito (Icu/Icn, kA) del ${c.tipo}`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
    }
    if (c.tipo === 'diferencial' && c.sensibilidadMA === undefined) {
      items.push(it(`componente.${c.id}.sensibilidadMA`, `Sensibilidad (mA) del diferencial`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
    }
    if (protegeRamal && !c.marca) {
      items.push(it(`componente.${c.id}.marca`, `Marca del ${c.tipo}`, 'lectura-etiqueta', 'media', { componenteId: c.id }));
    }
    if (protegeRamal && !c.modelo) {
      items.push(it(`componente.${c.id}.modelo`, `Modelo del ${c.tipo}`, 'lectura-etiqueta', 'media', { componenteId: c.id }));
    }
  }

  // Por circuito: campos del cuadro de cargas
  for (const cir of t.circuitos) {
    const destinoPendiente = !cir.destino || cir.destino.trim().toLowerCase() === 'pendiente' || cir.destino.trim() === '';
    if (destinoPendiente) {
      items.push(it(`circuito.${cir.id}.destino`, `Destino o uso del circuito #${cir.numero} (ej. 'Iluminación cocina')`, 'consulta-cliente', 'alta', { circuitoId: cir.id }));
    }
    if (cir.uso === 'pendiente') {
      items.push(it(`circuito.${cir.id}.uso`, `Categoría de uso del circuito #${cir.numero}`, 'consulta-cliente', 'media', { circuitoId: cir.id }));
    }
    if (cir.seccionConductorMM2 === undefined) {
      items.push(it(`circuito.${cir.id}.seccionConductorMM2`, `Sección del conductor del circuito #${cir.numero} (mm²)`, 'medicion', 'alta', { circuitoId: cir.id, instrumento: 'Pie de metro / tabla de calibres' }));
    }
    if (cir.longitudM === undefined) {
      items.push(it(`circuito.${cir.id}.longitudM`, `Longitud del circuito #${cir.numero} (m)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Huincha de medir' }));
    }
    if (cir.canalizacionTipo === undefined) {
      items.push(it(`circuito.${cir.id}.canalizacionTipo`, `Tipo de canalización del circuito #${cir.numero}`, 'inspeccion-visual', 'media', { circuitoId: cir.id }));
    }
    if (cir.cargaW === undefined) {
      items.push(it(`circuito.${cir.id}.cargaW`, `Potencia conectada al circuito #${cir.numero} (W)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Pinza amperimétrica + multímetro' }));
    }
    if (cir.corrienteA === undefined) {
      items.push(it(`circuito.${cir.id}.corrienteA`, `Corriente nominal del circuito #${cir.numero} (A) — medida o calculada`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Pinza amperimétrica' }));
    }
  }

  return items;
}
