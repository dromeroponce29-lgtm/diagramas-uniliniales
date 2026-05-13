import { z } from 'zod';

const EsquemaProcedencia = z.object({
  fuente: z.enum(['foto-claude', 'foto-openai', 'foto-ambos', 'manual', 'pendiente']),
  confianza: z.enum(['alta', 'media', 'baja', 'discrepancia']),
  fotoId: z.string().optional(),
  notas: z.string().optional()
});

const EsquemaComponenteReconciliado = z.object({
  id: z.string().min(1),
  tipo: z.enum([
    'interruptor-automatico', 'diferencial', 'interruptor-general',
    'barra-fase', 'barra-neutro', 'barra-tierra',
    'dps', 'contactor', 'rele-termico', 'medidor', 'borne', 'otro'
  ]),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  calibreA: z.number().positive().optional(),
  polos: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  curva: z.enum(['B', 'C', 'D', 'K']).optional(),
  sensibilidadMA: z.number().positive().optional(),
  posicionEnTablero: z.object({
    fila: z.number().int().nonnegative(),
    columna: z.number().int().nonnegative()
  }).optional(),
  capacidadCortocircuitoKA: z.number().positive().optional(),
  procedencia: EsquemaProcedencia
});

const EsquemaFoto = z.object({
  id: z.string().min(1),
  nombreOriginal: z.string(),
  mimeType: z.string(),
  calidadFoto: z.enum(['buena', 'aceptable', 'mala']),
  problemasFoto: z.array(z.string()),
  subidaEn: z.string()
});

const EsquemaPendiente = z.object({
  id: z.string().min(1),
  categoria: z.enum(['dato-no-observable', 'discrepancia-agentes', 'foto-baja-calidad']),
  descripcion: z.string(),
  componenteId: z.string().optional(),
  resoluble: z.enum(['foto-nueva', 'entrada-manual', 'medicion-terreno']),
  resueltoEn: z.string().optional()
});

const EsquemaCircuito = z.object({
  id: z.string().min(1),
  numero: z.number().int().positive(),
  proteccionComponenteId: z.string().min(1),
  diferencialComponenteId: z.string().min(1).optional(),
  destino: z.string(),
  uso: z.enum(['iluminacion', 'enchufes', 'fuerza', 'calefaccion', 'climatizacion', 'cocina', 'otro', 'pendiente']),
  seccionConductorMM2: z.number().positive().optional(),
  longitudM: z.number().positive().optional(),
  cargaW: z.number().positive().optional(),
  canalizacionTipo: z.enum(['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro']).optional(),
  canalizacionDiametroMM: z.number().positive().optional(),
  canalizacionMaterial: z.enum(['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro']).optional(),
  capacidadCorrienteA: z.number().positive().optional(),
  corrienteA: z.number().positive().optional(),
  rotulacionLeida: z.string().optional(),
  procedencia: EsquemaProcedencia
});

const EsquemaAnotacionHallazgo = z.object({
  id: z.string().min(1),
  reglaId: z.string().min(1),
  componenteId: z.string().min(1).optional(),
  circuitoId: z.string().min(1).optional(),
  tipo: z.enum(['no-aplica', 'levantamiento-terreno', 'nota-libre']),
  justificacion: z.string(),
  creadoEn: z.string()
});

const EsquemaAcometida = z.object({
  tipo: z.enum(['aerea', 'subterranea', 'desde-tablero-superior', 'pendiente']),
  ubicacion: z.string().max(300).optional(),
  tableroOrigenId: z.string().min(1).optional(),
  notas: z.string().max(1000).optional()
});

const EsquemaAlimentadorEntrada = z.object({
  seccionConductorMM2: z.number().positive().optional(),
  longitudM: z.number().positive().optional(),
  canalizacionTipo: z.enum(['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro']).optional(),
  canalizacionDiametroMM: z.number().positive().optional(),
  canalizacionMaterial: z.enum(['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro']).optional(),
  capacidadCorrienteA: z.number().positive().optional(),
  conductoresPorFase: z.number().int().positive().optional()
});

const EsquemaPuestaATierra = z.object({
  resistenciaOhmMedida: z.number().nonnegative().optional(),
  resistenciaOhmProyectada: z.number().nonnegative().optional(),
  instrumentoMedicion: z.string().max(200).optional(),
  fechaMedicion: z.string().optional(),
  tipoElectrodo: z.enum(['jabalina', 'malla', 'multielectrodo', 'pendiente']).optional(),
  notas: z.string().max(1000).optional()
});

const EsquemaVineta = z.object({
  numeroLamina: z.string().max(50).optional(),
  revision: z.string().max(50).optional(),
  fechaEmision: z.string().optional(),
  instaladorNombre: z.string().max(200).optional(),
  instaladorRUT: z.string().max(30).optional(),
  instaladorClaseSEC: z.enum(['A', 'B', 'C', 'D']).optional(),
  proyectoNombre: z.string().max(200).optional()
});

export const EsquemaTablero = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  clienteId: z.string().min(1),
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  tipo: z.enum(['general', 'distribucion', 'comando', 'otro']),
  ubicacion: z.string().max(300).optional(),
  tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n', 'pendiente']),
  esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT', 'pendiente']),
  potenciaContratadaKW: z.number().positive().optional(),
  corrienteNominalA: z.number().positive().optional(),
  espaciosTotales: z.number().int().positive().optional(),
  frecuenciaHz: z.number().positive().optional(),
  capacidadNominalA: z.number().positive().optional(),
  notasGenerales: z.string().max(5000).optional(),
  acometida: EsquemaAcometida.optional(),
  alimentadorEntrada: EsquemaAlimentadorEntrada.optional(),
  puestaATierra: EsquemaPuestaATierra.optional(),
  vineta: EsquemaVineta.optional(),
  fotos: z.array(EsquemaFoto),
  componentes: z.array(EsquemaComponenteReconciliado),
  pendientes: z.array(EsquemaPendiente),
  porcentajeCompletitud: z.number().int().min(0).max(100),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  circuitos: z.array(EsquemaCircuito).default([]),
  anotacionesHallazgos: z.array(EsquemaAnotacionHallazgo).default([])
});

// Para input al crear un tablero.
export const EsquemaTableroEntrada = EsquemaTablero
  .pick({ codigo: true, nombre: true, tipo: true })
  .extend({
    ubicacion: z.string().max(300).optional(),
    tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n', 'pendiente']).default('pendiente'),
    esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT', 'pendiente']).default('pendiente'),
    potenciaContratadaKW: z.number().positive().optional(),
    corrienteNominalA: z.number().positive().optional(),
    espaciosTotales: z.number().int().positive().optional(),
    frecuenciaHz: z.number().positive().optional(),
    capacidadNominalA: z.number().positive().optional(),
    notasGenerales: z.string().max(5000).optional(),
    acometida: EsquemaAcometida.optional(),
    alimentadorEntrada: EsquemaAlimentadorEntrada.optional(),
    puestaATierra: EsquemaPuestaATierra.optional(),
    vineta: EsquemaVineta.optional()
  });

// Para actualizar campos manuales del tablero (todo opcional).
export const EsquemaTableroActualizacion = EsquemaTableroEntrada.partial();

// Para actualizar un componente individual (todo opcional excepto el id).
export const EsquemaComponenteActualizacion = EsquemaComponenteReconciliado.partial();

export type TableroEntrada = z.infer<typeof EsquemaTableroEntrada>;
export type TableroActualizacion = z.infer<typeof EsquemaTableroActualizacion>;
export type ComponenteActualizacion = z.infer<typeof EsquemaComponenteActualizacion>;

export { EsquemaCircuito, EsquemaAnotacionHallazgo, EsquemaAcometida, EsquemaAlimentadorEntrada, EsquemaPuestaATierra, EsquemaVineta };
