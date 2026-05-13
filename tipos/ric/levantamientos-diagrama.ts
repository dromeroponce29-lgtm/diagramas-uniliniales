// tipos/ric/levantamientos-diagrama.ts
//
// Detecta los datos que faltan en el tablero para poder armar el diagrama
// unilineal completo y un cuadro de cargas conforme al RIC N°18. La lista
// incluye:
//   - Datos generales del tablero (tensión, esquema tierra, frecuencia,
//     capacidad nominal, temperatura ambiente, ubicación).
//   - Acometida (tipo, ubicación).
//   - Alimentador de entrada (sección, longitud, canalización, capacidad).
//   - Puesta a tierra (resistencia medida, electrodo, instrumento, fecha).
//   - Por cada componente: calibre, polos, curva, Icu, sensibilidad, marca,
//     modelo, etiqueta manuscrita.
//   - Por DPS: tipo (I/II/III), In max kA, Up kV.
//   - Por diferencial: prueba botón TEST, corriente/tiempo de disparo.
//   - Por circuito: destino, uso, sección, longitud, canalización, carga W,
//     corriente A, factor demanda, aislamiento megger MΩ, continuidad PE Ω,
//     agrupamiento, temperatura ambiente del recorrido.
//   - Por circuito de fuerza/motor: datos de placa (hp, kW, rpm, FP, η,
//     fases, marca, modelo), contactor (inA, bobinaV, polos), relé térmico
//     (rango ajuste, ajuste actual, clase).
//   - Inspección general del tablero (luces piloto, paradas emergencia,
//     borneras, transformador de control) — emite "indagar y registrar si
//     aplica".
//
// Aplica el principio "no asumir, no estimar".
import type { Tablero } from '../modelo.js';

export type CategoriaCampoDiagrama =
  | 'medicion'           // requiere instrumento
  | 'lectura-etiqueta'   // basta con leer la placa del equipo
  | 'inspeccion-visual'  // observación directa
  | 'consulta-cliente'   // pedir al cliente la info
  | 'prueba-funcional'   // accionar y verificar
  | 'indagatorio';       // verificar si existe el elemento

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

  // ============================================================
  // Datos generales del tablero
  // ============================================================
  if (t.tensionSistema === 'pendiente') {
    items.push(it('tablero.tensionSistema', 'Tensión del sistema (220V / 380V / 380V+N)', 'consulta-cliente', 'alta'));
  }
  if (t.esquemaTierra === 'pendiente') {
    items.push(it('tablero.esquemaTierra', 'Esquema de puesta a tierra (TT / TN-S / TN-C-S / IT)', 'inspeccion-visual', 'alta'));
  }
  if (t.frecuenciaHz === undefined) {
    items.push(it('tablero.frecuenciaHz', 'Frecuencia del sistema (Hz; típicamente 50)', 'consulta-cliente', 'baja'));
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
  if (t.ubicacion === undefined || t.ubicacion.trim() === '') {
    items.push(it('tablero.ubicacion', 'Ubicación física del tablero dentro del inmueble', 'inspeccion-visual', 'baja'));
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
    items.push(it('tablero.alimentadorEntrada.longitudM', 'Longitud del alimentador de entrada (m)', 'medicion', 'alta', { instrumento: 'Huincha de medir o medidor láser' }));
  }
  if (!ae?.canalizacionTipo) {
    items.push(it('tablero.alimentadorEntrada.canalizacionTipo', 'Tipo de canalización del alimentador (EMT / IMC / PVC rígido / PVC corrugado / bandeja / libre)', 'inspeccion-visual', 'alta'));
  }
  if (!ae?.canalizacionDiametroMM) {
    items.push(it('tablero.alimentadorEntrada.canalizacionDiametroMM', 'Diámetro nominal de la canalización del alimentador (mm)', 'medicion', 'media', { instrumento: 'Pie de metro' }));
  }
  if (!ae?.canalizacionMaterial) {
    items.push(it('tablero.alimentadorEntrada.canalizacionMaterial', 'Material de la canalización (acero / PVC / aluminio)', 'inspeccion-visual', 'media'));
  }
  if (!ae?.capacidadCorrienteA) {
    items.push(it('tablero.alimentadorEntrada.capacidadCorrienteA', 'Capacidad de transporte de corriente del alimentador (A; tabla por aislación, T° ambiente y agrupamiento)', 'consulta-cliente', 'media'));
  }
  if (!ae?.conductoresPorFase) {
    items.push(it('tablero.alimentadorEntrada.conductoresPorFase', 'Cantidad de conductores por fase (1 si no es paralelo)', 'inspeccion-visual', 'baja'));
  }

  // Puesta a tierra
  const pt = t.puestaATierra;
  if (pt?.resistenciaOhmMedida === undefined) {
    items.push(it('tablero.puestaATierra.resistenciaOhmMedida', 'Resistencia de la puesta a tierra medida (Ω)', 'medicion', 'alta', { instrumento: 'Telurímetro (ej. Fluke 1623-2, Hioki FT6031)' }));
  }
  if (!pt?.instrumentoMedicion) {
    items.push(it('tablero.puestaATierra.instrumentoMedicion', 'Identificación del instrumento usado para medir la tierra (marca/modelo)', 'lectura-etiqueta', 'media'));
  }
  if (!pt?.tipoElectrodo || pt.tipoElectrodo === 'pendiente') {
    items.push(it('tablero.puestaATierra.tipoElectrodo', 'Tipo de electrodo de tierra (jabalina copperweld / malla / multielectrodo / placa)', 'inspeccion-visual', 'media'));
  }
  if (!pt?.fechaMedicion) {
    items.push(it('tablero.puestaATierra.fechaMedicion', 'Fecha en que se midió la resistencia de tierra', 'consulta-cliente', 'baja'));
  }

  // ============================================================
  // Por componente: campos críticos para RIC N°18
  // ============================================================
  for (const c of t.componentes) {
    const protegeRamal =
      c.tipo === 'interruptor-automatico' ||
      c.tipo === 'interruptor-general' ||
      c.tipo === 'diferencial';

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
    if (protegeRamal && !c.marca) {
      items.push(it(`componente.${c.id}.marca`, `Marca del ${c.tipo} (Schneider / ABB / Legrand / Siemens / BTicino / Chint / Hager)`, 'lectura-etiqueta', 'media', { componenteId: c.id }));
    }
    if (protegeRamal && !c.modelo) {
      items.push(it(`componente.${c.id}.modelo`, `Modelo o referencia comercial del ${c.tipo}`, 'lectura-etiqueta', 'media', { componenteId: c.id }));
    }

    // Diferencial: requiere pruebas funcionales propias (RIC obliga prueba periódica)
    if (c.tipo === 'diferencial') {
      if (c.sensibilidadMA === undefined) {
        items.push(it(`componente.${c.id}.sensibilidadMA`, `Sensibilidad nominal IΔn del diferencial (típicamente 30 mA enchufes, 300 mA general)`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
      }
      items.push(it(`componente.${c.id}.pruebaBotonTest`, `Prueba con botón TEST del diferencial (¿dispara?)`, 'prueba-funcional', 'alta', { componenteId: c.id, instrumento: 'Botón TEST integrado' }));
      items.push(it(`componente.${c.id}.corrienteDisparoMA`, `Corriente real de disparo medida del diferencial (mA)`, 'medicion', 'media', { componenteId: c.id, instrumento: 'Tester de diferenciales (ej. Fluke 1664 FC, Megger MFT-X1)' }));
      items.push(it(`componente.${c.id}.tiempoDisparoIDnMs`, `Tiempo de disparo a IΔn del diferencial (ms; típicamente <300 ms)`, 'medicion', 'media', { componenteId: c.id, instrumento: 'Tester de diferenciales' }));
      items.push(it(`componente.${c.id}.tiempoDisparo5IDnMs`, `Tiempo de disparo a 5·IΔn del diferencial (ms; típicamente <40 ms)`, 'medicion', 'baja', { componenteId: c.id, instrumento: 'Tester de diferenciales' }));
    }

    // DPS: parámetros específicos (tipo I/II/III, In max kA, Up kV)
    if (c.tipo === 'dps') {
      items.push(it(`componente.${c.id}.tipoDPS`, `Tipo de DPS (I / II / III / I+II) — Clase I se exige cuando hay riesgo de impacto directo`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
      items.push(it(`componente.${c.id}.inMaxKA`, `Corriente máxima de descarga In máx del DPS (kA)`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
      items.push(it(`componente.${c.id}.upKV`, `Nivel de protección Up del DPS (kV)`, 'lectura-etiqueta', 'media', { componenteId: c.id }));
      if (c.polos === undefined) {
        items.push(it(`componente.${c.id}.polos`, `Cantidad de polos del DPS (1P / 2P / 3P / 3P+N)`, 'lectura-etiqueta', 'alta', { componenteId: c.id }));
      }
    }
  }

  // ============================================================
  // Por circuito: campos del cuadro de cargas + pruebas
  // ============================================================
  for (const cir of t.circuitos) {
    const destinoPendiente = !cir.destino || cir.destino.trim().toLowerCase() === 'pendiente' || cir.destino.trim() === '';
    if (destinoPendiente) {
      items.push(it(`circuito.${cir.id}.destino`, `Destino formal del circuito #${cir.numero} (ej. 'Iluminación cocina', 'Tomacorrientes dormitorio principal')`, 'consulta-cliente', 'alta', { circuitoId: cir.id }));
    }
    if (cir.uso === 'pendiente') {
      items.push(it(`circuito.${cir.id}.uso`, `Categoría de uso del circuito #${cir.numero} (iluminacion / enchufes / fuerza / calefaccion / climatizacion / cocina)`, 'consulta-cliente', 'media', { circuitoId: cir.id }));
    }
    if (cir.seccionConductorMM2 === undefined) {
      items.push(it(`circuito.${cir.id}.seccionConductorMM2`, `Sección del conductor del circuito #${cir.numero} (mm²)`, 'medicion', 'alta', { circuitoId: cir.id, instrumento: 'Pie de metro / tabla de calibres' }));
    }
    if (cir.longitudM === undefined) {
      items.push(it(`circuito.${cir.id}.longitudM`, `Longitud del circuito #${cir.numero} (m; impacta caída de tensión)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Huincha o medidor láser' }));
    }
    if (cir.canalizacionTipo === undefined) {
      items.push(it(`circuito.${cir.id}.canalizacionTipo`, `Tipo de canalización del circuito #${cir.numero}`, 'inspeccion-visual', 'media', { circuitoId: cir.id }));
    }
    if (cir.cargaW === undefined) {
      items.push(it(`circuito.${cir.id}.cargaW`, `Potencia instalada en el circuito #${cir.numero} (W)`, 'consulta-cliente', 'media', { circuitoId: cir.id }));
    }
    if (cir.corrienteA === undefined) {
      items.push(it(`circuito.${cir.id}.corrienteA`, `Corriente de diseño del circuito #${cir.numero} (A; medida o calculada P/V/cosφ)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Pinza amperimétrica' }));
    }
    // Pruebas eléctricas estándar exigibles para entrega de obra
    items.push(it(`circuito.${cir.id}.aislamientoMOhm`, `Resistencia de aislación del circuito #${cir.numero} (MΩ; mínimo 1 MΩ por RIC)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Megger 500V (ej. Fluke 1507, Megger MIT400)' }));
    items.push(it(`circuito.${cir.id}.continuidadPEOhm`, `Continuidad del conductor de protección PE del circuito #${cir.numero} (Ω; típicamente <1 Ω)`, 'medicion', 'media', { circuitoId: cir.id, instrumento: 'Multímetro / tester de instalaciones' }));

    // Circuitos de fuerza/motor: datos de placa + accesorios
    if (cir.uso === 'fuerza') {
      items.push(it(`circuito.${cir.id}.motor.hp`, `Potencia mecánica del motor del circuito #${cir.numero} (HP, lectura de placa)`, 'lectura-etiqueta', 'alta', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.kw`, `Potencia eléctrica del motor (kW, lectura de placa)`, 'lectura-etiqueta', 'alta', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.rpm`, `Velocidad nominal del motor (rpm, lectura de placa)`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.factorPotencia`, `Factor de potencia nominal del motor (cosφ, placa)`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.eficiencia`, `Eficiencia nominal del motor (η, placa)`, 'lectura-etiqueta', 'baja', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.fases`, `Cantidad de fases del motor (1 o 3, placa)`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.motor.marcaModelo`, `Marca y modelo del motor (placa; Siemens / WEG / ABB / Marathon)`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.contactor`, `Contactor aguas abajo del TM del circuito #${cir.numero}: marca, In (A), tensión bobina (V), polos`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
      items.push(it(`circuito.${cir.id}.releTermico`, `Relé térmico/guardamotor del circuito #${cir.numero}: marca, rango ajuste (A mín–máx), ajuste actual, clase (10A / 10 / 20 / 30)`, 'lectura-etiqueta', 'media', { circuitoId: cir.id }));
    }
  }

  // ============================================================
  // Elementos generales del tablero a indagar (pueden o no existir)
  // ============================================================
  items.push(it('tablero.lucesPiloto', 'Luces piloto presentes: propósito (tensión red / fases R, S, T / motor marcha / motor falla), color, ¿enciende?', 'indagatorio', 'baja'));
  items.push(it('tablero.paradasEmergencia', 'Paradas de emergencia presentes: tipo (pulsador seta / tirador / pedal), ubicación, accesible, rotulada, ¿funcional al accionar?', 'indagatorio', 'media'));
  items.push(it('tablero.borneras', 'Borneras presentes: código, tipo (distribución / tierra / control), polos, marca, calibre máximo (mm²)', 'indagatorio', 'baja'));
  items.push(it('tablero.transformadorControl', 'Transformador de control (si aplica): primario (V), secundario (V), potencia (VA), marca', 'indagatorio', 'baja'));
  items.push(it('tablero.temperaturaAmbienteC', 'Temperatura ambiente típica del tablero (°C; afecta selección de calibres)', 'medicion', 'baja', { instrumento: 'Termómetro / dato climático local' }));
  items.push(it('tablero.agrupamientoCanalizaciones', 'Agrupamiento de canalizaciones: cuántos circuitos cargados comparten cada ducto (impacta factores de corrección por agrupamiento)', 'inspeccion-visual', 'baja'));

  return items;
}
