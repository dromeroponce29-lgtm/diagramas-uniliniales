import { z } from 'zod';

export const EsquemaResumenTablero = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  porcentajeCompletitud: z.number().int().min(0).max(100)
});

export const EsquemaCliente = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(1).max(200),
  rut: z.string().max(20).optional(),
  direccion: z.string().max(300).optional(),
  contactoNombre: z.string().max(200).optional(),
  contactoTelefono: z.string().max(50).optional(),
  contactoEmail: z.string().email().max(200).optional(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  tableros: z.array(EsquemaResumenTablero)
});

// Para inputs al crear (lo que envía el frontend, sin id/slug/timestamps/tableros).
export const EsquemaClienteEntrada = EsquemaCliente
  .omit({ id: true, slug: true, creadoEn: true, actualizadoEn: true, tableros: true })
  .partial({ rut: true, direccion: true, contactoNombre: true, contactoTelefono: true, contactoEmail: true });

export type ClienteEntrada = z.infer<typeof EsquemaClienteEntrada>;
