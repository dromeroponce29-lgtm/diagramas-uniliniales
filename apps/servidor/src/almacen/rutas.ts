import { resolve, join } from 'node:path';

// Resuelve la raíz de proyectos/. Por defecto desde la raíz del repo,
// pero se puede sobrescribir con la variable de entorno DIRECTORIO_PROYECTOS
// (útil para tests).
export function dirProyectos(): string {
  const env = process.env.DIRECTORIO_PROYECTOS;
  if (env) return resolve(env);
  // process.cwd() es confiable cuando el servidor se arranca desde la raíz
  // del monorepo (npm run dev:servidor).
  return resolve(process.cwd(), 'proyectos');
}

export function dirCliente(slugCliente: string): string {
  return join(dirProyectos(), slugCliente);
}

export function archivoCliente(slugCliente: string): string {
  return join(dirCliente(slugCliente), 'cliente.json');
}

export function dirTableros(slugCliente: string): string {
  return join(dirCliente(slugCliente), 'tableros');
}

export function dirTablero(slugCliente: string, slugTablero: string): string {
  return join(dirTableros(slugCliente), slugTablero);
}

export function archivoTablero(slugCliente: string, slugTablero: string): string {
  return join(dirTablero(slugCliente, slugTablero), 'tablero.json');
}

export function dirFotos(slugCliente: string, slugTablero: string): string {
  return join(dirTablero(slugCliente, slugTablero), 'fotos');
}

export function archivoFoto(slugCliente: string, slugTablero: string, fotoId: string, extension: string): string {
  return join(dirFotos(slugCliente, slugTablero), `${fotoId}.${extension}`);
}

export function dirExtracciones(slugCliente: string, slugTablero: string): string {
  return join(dirTablero(slugCliente, slugTablero), 'extracciones');
}

export function archivoExtraccion(slugCliente: string, slugTablero: string, fotoId: string, sufijo: 'claude' | 'openai' | 'reconciliado'): string {
  return join(dirExtracciones(slugCliente, slugTablero), `${fotoId}-${sufijo}.json`);
}
