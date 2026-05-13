import { z } from 'zod';

export const EsquemaCategoriaAuditoria = z.enum([
  'identificacion',
  'proteccion',
  'aislacion-pe',
  'control-senalizacion',
  'seguridad',
  'instalacion',
  'documentacion',
  'mantenimiento',
  'otros'
]);

export const EsquemaSeveridadAuditoria = z.enum(['critica', 'mayor', 'menor', 'observacion']);
export const EsquemaEstadoGlobalAuditoria = z.enum(['apto', 'apto-con-observaciones', 'no-apto']);
export const EsquemaPrioridadEjecucion = z.enum(['inmediata', 'corto-plazo', 'mediano-plazo']);

export const EsquemaMaterialRequerido = z.object({
  descripcion: z.string().min(1).max(300),
  cantidad: z.number().nonnegative(),
  unidad: z.string().min(1).max(30)
});

export const EsquemaHallazgoAuditoria = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1).max(50),
  referenciaNormativa: z.string().max(200).optional(),
  categoria: EsquemaCategoriaAuditoria,
  severidad: EsquemaSeveridadAuditoria,
  titulo: z.string().min(1).max(200),
  descripcion: z.string().min(1).max(2000),
  fotoId: z.string().optional(),
  accionCorrectiva: z.string().min(1).max(1000),
  materialesRequeridos: z.array(EsquemaMaterialRequerido),
  pasosEjecucion: z.array(z.string().max(500)),
  tiempoEstimadoHoras: z.number().nonnegative(),
  costoEstimadoCLP: z.number().nonnegative(),
  prioridadEjecucion: EsquemaPrioridadEjecucion,
  circuitosAfectados: z.array(z.number().int().nonnegative()),
  esquemaAntes: z.string().max(500).optional(),
  esquemaDespues: z.string().max(500).optional()
});

export const EsquemaResultadoAuditoria = z.object({
  generadoEn: z.string(),
  modelo: z.string(),
  estadoGlobal: EsquemaEstadoGlobalAuditoria,
  resumenEjecutivo: z.string().max(2000),
  hallazgos: z.array(EsquemaHallazgoAuditoria),
  costoUsd: z.number().nonnegative().optional(),
  tokensInput: z.number().nonnegative().optional(),
  tokensOutput: z.number().nonnegative().optional()
});
