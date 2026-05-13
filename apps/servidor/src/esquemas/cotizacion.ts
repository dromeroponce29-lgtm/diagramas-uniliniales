import { z } from 'zod';
import { EsquemaUnidadCatalogo } from './catalogo.js';

export const EsquemaPartidaPlan = z.object({
  id: z.string().min(1),
  itemCodigo: z.string().min(1).max(50),
  itemDescripcion: z.string().min(1).max(300),
  unidad: EsquemaUnidadCatalogo,
  precioUnitarioCLP: z.number().nonnegative(),
  cantidad: z.number().nonnegative(),
  totalCLP: z.number().nonnegative(),
  hallazgoReglaId: z.string().max(100).optional(),
  hallazgoComponenteId: z.string().max(50).optional(),
  hallazgoCircuitoId: z.string().max(50).optional(),
  notas: z.string().max(500).optional()
});

export const EsquemaEstadoPlan = z.enum(['borrador', 'enviado', 'aceptado', 'rechazado']);

export const EsquemaPlanNormalizacion = z.object({
  id: z.string().min(1),
  numero: z.number().int().positive(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  estado: EsquemaEstadoPlan,
  partidas: z.array(EsquemaPartidaPlan),
  incluyeIVA: z.boolean(),
  ivaPct: z.number().nonnegative().max(100),
  subtotalCLP: z.number().nonnegative(),
  ivaCLP: z.number().nonnegative(),
  totalCLP: z.number().nonnegative(),
  notas: z.string().max(2000).optional()
});

// Entrada del PUT: el cliente envía partidas+notas+estado+IVA; el backend recalcula totales y actualizadoEn.
export const EsquemaPlanActualizacion = z.object({
  estado: EsquemaEstadoPlan.optional(),
  incluyeIVA: z.boolean().optional(),
  ivaPct: z.number().nonnegative().max(100).optional(),
  partidas: z.array(EsquemaPartidaPlan.omit({ totalCLP: true }).partial({ id: true })).optional(),
  notas: z.string().max(2000).optional()
});

// Entrada del POST: { autoSugerir: boolean }
export const EsquemaPlanCreacion = z.object({
  autoSugerir: z.boolean().default(true)
});

export type PlanActualizacion = z.infer<typeof EsquemaPlanActualizacion>;
export type PlanCreacion = z.infer<typeof EsquemaPlanCreacion>;
