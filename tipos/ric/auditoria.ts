// Tipos de auditoría normativa holística (un agente IA evalúa fotos + datos
// del tablero contra el RIC vigente y emite hallazgos cualitativos que las
// reglas determinísticas no detectan — cosas como "tapa sin tornillos",
// "cables pelados", "ausencia de glándulas", etc.).
//
// Complementa las 14 reglas determinísticas de `evaluarRIC()`: esas detectan
// lo cuantitativo (calibres, secciones, presencia/ausencia); el auditor IA
// captura lo visual y cualitativo.

export type CategoriaAuditoria =
  | 'identificacion'
  | 'proteccion'
  | 'aislacion-pe'
  | 'control-senalizacion'
  | 'seguridad'
  | 'instalacion'
  | 'documentacion'
  | 'mantenimiento'
  | 'otros';

export type SeveridadAuditoria = 'critica' | 'mayor' | 'menor' | 'observacion';

export type EstadoGlobalAuditoria = 'apto' | 'apto-con-observaciones' | 'no-apto';

export type PrioridadEjecucion = 'inmediata' | 'corto-plazo' | 'mediano-plazo';

export interface MaterialRequerido {
  descripcion: string;
  cantidad: number;
  unidad: string;
}

export interface HallazgoAuditoria {
  id: string;                         // ULID
  codigo: string;                     // "AUDIT-001"
  referenciaNormativa?: string;       // "RIC Pliego N°5 art. 7.3.2"
  categoria: CategoriaAuditoria;
  severidad: SeveridadAuditoria;
  titulo: string;
  descripcion: string;
  fotoId?: string;                    // id de la foto que evidencia
  accionCorrectiva: string;
  materialesRequeridos: MaterialRequerido[];
  pasosEjecucion: string[];
  tiempoEstimadoHoras: number;
  costoEstimadoCLP: number;
  prioridadEjecucion: PrioridadEjecucion;
  circuitosAfectados: number[];       // 0 = alimentador/IG, [] = global
  esquemaAntes?: string;              // notación TAG IEC 81346
  esquemaDespues?: string;
}

export interface ResultadoAuditoria {
  generadoEn: string;                 // ISO timestamp
  modelo: string;                     // nombre del modelo IA usado
  estadoGlobal: EstadoGlobalAuditoria;
  resumenEjecutivo: string;
  hallazgos: HallazgoAuditoria[];
  costoUsd?: number;
  tokensInput?: number;
  tokensOutput?: number;
}
