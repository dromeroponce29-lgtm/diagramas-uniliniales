import { z } from 'zod';

export const EsquemaUnidadCatalogo = z.enum(['ud', 'm', 'kg', 'h', 'gl']);

export const EsquemaCategoriaCatalogo = z.enum([
  'proteccion',
  'conductor',
  'ducteria',
  'accesorio',
  'mano-de-obra',
  'servicio',
  'otro'
]);

export const EsquemaItemCatalogo = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1).max(50),
  descripcion: z.string().min(1).max(300),
  tipo: z.enum(['material', 'labor']),
  unidad: EsquemaUnidadCatalogo,
  precioUnitarioCLP: z.number().nonnegative(),
  categoria: EsquemaCategoriaCatalogo,
  notas: z.string().max(500).optional()
});

export const EsquemaCatalogo = z.array(EsquemaItemCatalogo);

export const EsquemaItemCatalogoEntrada = EsquemaItemCatalogo.partial({ id: true });

export type ItemCatalogoEntrada = z.infer<typeof EsquemaItemCatalogoEntrada>;
