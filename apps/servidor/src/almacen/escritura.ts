import { writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { nuevoId } from '../util/ulid.js';

// Escribe un objeto como JSON en disco usando el patrón write-to-tmp → rename
// para garantizar atomicidad: si el proceso muere a mitad de la escritura,
// el archivo original (si existe) queda intacto.
export async function escribirJsonAtomico(ruta: string, datos: unknown): Promise<void> {
  await mkdir(dirname(ruta), { recursive: true });
  const tmp = `${ruta}.${nuevoId()}.tmp`;
  await writeFile(tmp, JSON.stringify(datos, null, 2), 'utf-8');
  await rename(tmp, ruta);
}

// Escribe un Buffer (foto) usando el mismo patrón.
export async function escribirBufferAtomico(ruta: string, buffer: Buffer): Promise<void> {
  await mkdir(dirname(ruta), { recursive: true });
  const tmp = `${ruta}.${nuevoId()}.tmp`;
  await writeFile(tmp, buffer);
  await rename(tmp, ruta);
}
