import { z } from 'zod';

export const EsquemaTipoComponente = z.enum([
  'interruptor-automatico',
  'diferencial',
  'interruptor-general',
  'barra-fase',
  'barra-neutro',
  'barra-tierra',
  'dps',
  'contactor',
  'rele-termico',
  'medidor',
  'borne',
  'otro'
]);

export const EsquemaComponenteDetectado = z.object({
  tipoSugerido: EsquemaTipoComponente,
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  calibreA: z.number().positive().nullable(),
  polos: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
  curva: z.enum(['B', 'C', 'D', 'K']).nullable(),
  sensibilidadMA: z.number().positive().nullable(),
  capacidadCortocircuitoKA: z.number().positive().nullable().optional(),
  posicion: z.object({
    fila: z.number().int().nonnegative(),
    columna: z.number().int().nonnegative()
  }).nullable(),
  textoLeido: z.string().nullable(),
  confianzaAgente: z.enum(['alta', 'media', 'baja']),
  notas: z.string().nullable()
});

export const EsquemaRotulacion = z.object({
  numero: z.number().int().positive().nullable(),
  textoOriginal: z.string(),
  destinoLeido: z.string().nullable().optional()
});

export const EsquemaDatosGeneralesObservados = z.object({
  tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n']).nullable().optional(),
  esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT']).nullable().optional(),
  frecuenciaHz: z.number().positive().nullable().optional(),
  capacidadNominalA: z.number().positive().nullable().optional(),
  marcaGabinete: z.string().nullable().optional(),
  modeloGabinete: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional()
}).nullable().optional();

// Los agentes a veces omiten arrays o envían null cuando no detectan nada.
// Coercionamos a [] para no rechazar la extracción completa por un campo vacío.
const arrayTolerante = <T extends z.ZodTypeAny>(esquema: T) =>
  z.preprocess(v => (v == null ? [] : v), z.array(esquema));

export const EsquemaExtraccionAgente = z.object({
  calidadFoto: z.enum(['buena', 'aceptable', 'mala']),
  problemasFoto: arrayTolerante(z.string()),
  componentesDetectados: arrayTolerante(EsquemaComponenteDetectado),
  rotulacionCircuitosLeida: arrayTolerante(EsquemaRotulacion),
  datosGeneralesObservados: EsquemaDatosGeneralesObservados
});

export type ExtraccionAgente = z.infer<typeof EsquemaExtraccionAgente>;
