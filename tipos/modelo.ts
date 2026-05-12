// Tipos compartidos entre apps/servidor y apps/web.

// ============================================================================
// Procedencia y confianza — usado por todos los datos extraídos.
// ============================================================================

export type FuenteDato =
  | 'foto-claude'
  | 'foto-openai'
  | 'foto-ambos'
  | 'manual'
  | 'pendiente';

export type ConfianzaDato = 'alta' | 'media' | 'baja' | 'discrepancia';

export interface Procedencia {
  fuente: FuenteDato;
  confianza: ConfianzaDato;
  fotoId?: string;
  notas?: string;
}

// ============================================================================
// Componentes detectados por agentes IA y reconciliados.
// ============================================================================

export type TipoComponente =
  | 'interruptor-automatico'
  | 'diferencial'
  | 'interruptor-general'
  | 'barra-fase'
  | 'barra-neutro'
  | 'barra-tierra'
  | 'dps'
  | 'contactor'
  | 'rele-termico'
  | 'medidor'
  | 'borne'
  | 'otro';

export type CalidadFoto = 'buena' | 'aceptable' | 'mala';

export interface ResultadoExtraccionAgente {
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentesDetectados: ComponenteDetectadoAgente[];
  rotulacionCircuitosLeida: RotulacionCircuito[];
}

export interface ComponenteDetectadoAgente {
  tipoSugerido: TipoComponente;
  marca: string | null;
  modelo: string | null;
  calibreA: number | null;
  polos: 1 | 2 | 3 | 4 | null;
  curva: 'B' | 'C' | 'D' | 'K' | null;
  sensibilidadMA: number | null;
  posicion: { fila: number; columna: number } | null;
  textoLeido: string | null;
  confianzaAgente: 'alta' | 'media' | 'baja';
  notas: string | null;
}

export interface RotulacionCircuito {
  numero: number | null;
  textoOriginal: string;
}

// Resultado del reconciliador para una sola foto.
export interface ResultadoExtraccion {
  fotoId: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentes: ComponenteReconciliado[];
  rotulacionesLeidas: RotulacionCircuito[];
}

export interface ComponenteReconciliado {
  id: string;
  tipo: TipoComponente;
  marca?: string;
  modelo?: string;
  calibreA?: number;
  polos?: 1 | 2 | 3 | 4;
  curva?: 'B' | 'C' | 'D' | 'K';
  sensibilidadMA?: number;
  posicionEnTablero?: { fila: number; columna: number };
  capacidadCortocircuitoKA?: number;
  procedencia: Procedencia;
}

// ============================================================================
// Cliente — entidad raíz del modelo.
// ============================================================================

export interface Cliente {
  id: string;                                 // ULID
  slug: string;                               // usado en rutas y nombre de carpeta
  nombre: string;
  rut?: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  creadoEn: string;                           // ISO date
  actualizadoEn: string;
  tableros: ResumenTablero[];                 // referencias (id + código + completitud)
  // interconexiones: las introduce Plan 5.
  instaladorPredeterminadoNombre?: string;
  instaladorPredeterminadoRUT?: string;
  instaladorPredeterminadoClaseSEC?: ClaseSEC;
  proyectoNombrePredeterminado?: string;
}

export interface ResumenTablero {
  id: string;
  codigo: string;
  porcentajeCompletitud: number;
}

// ============================================================================
// Tablero — pertenece a un cliente.
// ============================================================================

export type TipoTablero = 'general' | 'distribucion' | 'comando' | 'otro';
export type TensionSistema = '220V-mono' | '380V-trif' | '380V/220V-trif-n' | 'pendiente';
export type EsquemaTierra = 'TT' | 'TN-S' | 'TN-C-S' | 'IT' | 'pendiente';

export interface Tablero {
  id: string;                                 // ULID
  slug: string;
  clienteId: string;
  codigo: string;                             // "TG", "TD-1", "TD-Cocina"
  nombre: string;
  tipo: TipoTablero;
  ubicacion?: string;

  tensionSistema: TensionSistema;
  esquemaTierra: EsquemaTierra;
  potenciaContratadaKW?: number;
  corrienteNominalA?: number;

  fotos: Foto[];                              // hasta 20
  componentes: ComponenteReconciliado[];      // acumulado desde todas las fotos
  pendientes: Pendiente[];

  porcentajeCompletitud: number;              // calculado, sincronizado al guardar

  creadoEn: string;
  actualizadoEn: string;

  espaciosTotales?: number;            // Plan 4 — manual, alimenta regla reserva-minima
  circuitos: Circuito[];               // Plan 4
  anotacionesHallazgos: AnotacionHallazgo[];  // Plan 4

  // Plan 5 — RIC N°18
  frecuenciaHz?: number;
  capacidadNominalA?: number;
  notasGenerales?: string;
  acometida?: DatosAcometida;
  alimentadorEntrada?: DatosAlimentadorEntrada;
  puestaATierra?: DatosPuestaATierra;
  vineta?: DatosVineta;
}

export interface Foto {
  id: string;                                 // ULID, también es el nombre del archivo
  nombreOriginal: string;                     // como vino del usuario
  mimeType: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  subidaEn: string;                           // ISO
}

export type CategoriaPendiente =
  | 'dato-no-observable'
  | 'discrepancia-agentes'
  | 'foto-baja-calidad';

export type ResolucionPendiente = 'foto-nueva' | 'entrada-manual' | 'medicion-terreno';

export interface Pendiente {
  id: string;
  categoria: CategoriaPendiente;
  descripcion: string;
  componenteId?: string;
  resoluble: ResolucionPendiente;
  resueltoEn?: string;                        // ISO si fue resuelto
}

// ============================================================================
// Circuitos (Plan 4)
// ============================================================================

export type UsoCircuito =
  | 'iluminacion'
  | 'enchufes'
  | 'fuerza'
  | 'calefaccion'
  | 'climatizacion'
  | 'cocina'
  | 'otro'
  | 'pendiente';

export interface Circuito {
  id: string;                          // ULID
  numero: number;                      // correlativo en el tablero (1, 2, 3, ...)
  proteccionComponenteId: string;      // id del automático que protege el circuito
  diferencialComponenteId?: string;    // id del diferencial aguas arriba (opcional)
  destino: string;                     // texto libre o "pendiente"
  uso: UsoCircuito;
  seccionConductorMM2?: number;
  longitudM?: number;
  cargaW?: number;
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;
  corrienteA?: number;
  rotulacionLeida?: string;
  procedencia: Procedencia;
}

// ============================================================================
// Anotaciones de hallazgos RIC (Plan 4)
// ============================================================================

export type TipoAnotacionHallazgo =
  | 'no-aplica'
  | 'levantamiento-terreno'
  | 'nota-libre';

export interface AnotacionHallazgo {
  id: string;                          // ULID
  reglaId: string;                     // ej. 'ric.tablero.dps-presente'
  componenteId?: string;
  circuitoId?: string;
  tipo: TipoAnotacionHallazgo;
  justificacion: string;
  creadoEn: string;                    // ISO
}

// ============================================================================
// Datos eléctricos extendidos (Plan 5 — RIC N°18)
// ============================================================================

export type TipoCanalizacion =
  | 'EMT' | 'PVC-rigido' | 'PVC-flexible' | 'bandeja' | 'libre' | 'subterranea' | 'otro';

export type MaterialCanalizacion =
  | 'acero' | 'PVC' | 'aluminio' | 'fibrocemento' | 'otro';

export type TipoAcometida =
  | 'aerea' | 'subterranea' | 'desde-tablero-superior' | 'pendiente';

export type TipoElectrodoTierra =
  | 'jabalina' | 'malla' | 'multielectrodo' | 'pendiente';

export type ClaseSEC = 'A' | 'B' | 'C' | 'D';

export interface DatosAcometida {
  tipo: TipoAcometida;
  ubicacion?: string;
  tableroOrigenId?: string;
  notas?: string;
}

export interface DatosAlimentadorEntrada {
  seccionConductorMM2?: number;
  longitudM?: number;
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;
  conductoresPorFase?: number;
}

export interface DatosPuestaATierra {
  resistenciaOhmMedida?: number;
  resistenciaOhmProyectada?: number;
  instrumentoMedicion?: string;
  fechaMedicion?: string;
  tipoElectrodo?: TipoElectrodoTierra;
  notas?: string;
}

export interface DatosVineta {
  numeroLamina?: string;
  revision?: string;
  fechaEmision?: string;
  instaladorNombre?: string;
  instaladorRUT?: string;
  instaladorClaseSEC?: ClaseSEC;
  proyectoNombre?: string;
}
