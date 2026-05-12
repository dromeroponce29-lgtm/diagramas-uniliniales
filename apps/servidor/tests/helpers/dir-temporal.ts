import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function crearDirTemporal(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'diagramas-test-'));
}

export async function eliminarDirTemporal(ruta: string): Promise<void> {
  await rm(ruta, { recursive: true, force: true });
}
