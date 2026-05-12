import type { ResultadoExtraccion } from '@tipos/modelo';

export async function extraerFoto(archivo: File): Promise<ResultadoExtraccion> {
  const formulario = new FormData();
  formulario.append('foto', archivo);

  const respuesta = await fetch('/api/extract', {
    method: 'POST',
    body: formulario
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Error ${respuesta.status}: ${texto}`);
  }

  return respuesta.json() as Promise<ResultadoExtraccion>;
}
