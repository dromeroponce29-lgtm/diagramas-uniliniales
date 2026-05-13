import { readFile, access } from 'node:fs/promises';
import type { ItemCatalogo } from '../../../../tipos/modelo.js';
import { CATALOGO_SEMILLA } from '../../../../tipos/catalogo/semilla.js';
import { EsquemaCatalogo, type ItemCatalogoEntrada } from '../esquemas/catalogo.js';
import { archivoCatalogo, dirCliente } from './rutas.js';
import { escribirJsonAtomico } from './escritura.js';
import { nuevoId } from '../util/ulid.js';

async function existe(ruta: string): Promise<boolean> {
  try { await access(ruta); return true; } catch { return false; }
}

function asegurarCodigosUnicos(items: { codigo: string }[]): void {
  const vistos = new Set<string>();
  for (const it of items) {
    if (vistos.has(it.codigo)) {
      throw new Error(`Código de ítem duplicado en catálogo: "${it.codigo}"`);
    }
    vistos.add(it.codigo);
  }
}

function hidratarSemilla(): ItemCatalogo[] {
  return CATALOGO_SEMILLA.map(item => ({ ...item, id: nuevoId() }));
}

export async function leerCatalogo(slugCliente: string): Promise<ItemCatalogo[]> {
  if (!(await existe(dirCliente(slugCliente)))) {
    throw new Error(`Cliente "${slugCliente}" no existe`);
  }
  const ruta = archivoCatalogo(slugCliente);
  if (!(await existe(ruta))) {
    const semilla = hidratarSemilla();
    await escribirJsonAtomico(ruta, semilla);
    return semilla;
  }
  const contenido = await readFile(ruta, 'utf-8');
  const parseado = JSON.parse(contenido);
  return EsquemaCatalogo.parse(parseado);
}

export async function reemplazarCatalogo(
  slugCliente: string,
  entradas: ItemCatalogoEntrada[]
): Promise<ItemCatalogo[]> {
  if (!(await existe(dirCliente(slugCliente)))) {
    throw new Error(`Cliente "${slugCliente}" no existe`);
  }
  asegurarCodigosUnicos(entradas);
  const items: ItemCatalogo[] = entradas.map(e => ({
    ...e,
    id: e.id ?? nuevoId()
  }));
  const validado = EsquemaCatalogo.parse(items);
  await escribirJsonAtomico(archivoCatalogo(slugCliente), validado);
  return validado;
}

export async function restaurarSemillaCatalogo(slugCliente: string): Promise<ItemCatalogo[]> {
  if (!(await existe(dirCliente(slugCliente)))) {
    throw new Error(`Cliente "${slugCliente}" no existe`);
  }
  const semilla = hidratarSemilla();
  await escribirJsonAtomico(archivoCatalogo(slugCliente), semilla);
  return semilla;
}
