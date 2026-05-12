export function generarSlug(texto: string, sufijo: number = 1): string {
  const normalizado = texto
    .normalize('NFD')                                // separa acentos
    .replace(/[̀-ͯ]/g, '')                 // quita diacríticos (rango Unicode)
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')                     // todo lo no alfanumérico → guión
    .replace(/^-+|-+$/g, '');                        // sin guiones al inicio/final

  if (!normalizado) {
    throw new Error('No se puede generar slug desde un nombre vacío');
  }

  return sufijo > 1 ? `${normalizado}-${sufijo}` : normalizado;
}
