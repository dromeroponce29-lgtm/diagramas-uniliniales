import { readFile, readdir, rm, access } from 'node:fs/promises';
import type { Tablero, ComponenteReconciliado, ResumenTablero, Foto } from '../../../../tipos/modelo.js';
import { EsquemaTablero, type TableroEntrada, type TableroActualizacion, type ComponenteActualizacion } from '../esquemas/tablero.js';
import { archivoTablero, dirTablero, dirTableros, archivoCliente } from './rutas.js';
import { escribirJsonAtomico } from './escritura.js';
import { leerCliente } from './cliente.js';
import { nuevoId } from '../util/ulid.js';
import { generarSlug } from '../util/slug.js';
import { calcularCompletitud } from '../completitud/calcular.js';

async function existe(ruta: string): Promise<boolean> {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function slugDisponible(slugCliente: string, base: string): Promise<string> {
  let sufijo = 1;
  while (true) {
    const candidato = generarSlug(base, sufijo);
    if (!(await existe(dirTablero(slugCliente, candidato)))) return candidato;
    sufijo += 1;
  }
}

function sincronizarCompletitud(t: Tablero): Tablero {
  return { ...t, porcentajeCompletitud: calcularCompletitud(t) };
}

async function sincronizarCliente(slugCliente: string): Promise<void> {
  const cliente = await leerCliente(slugCliente);
  const tableros = await listarTableros(slugCliente);
  const resumenes: ResumenTablero[] = tableros.map(t => ({
    id: t.id,
    codigo: t.codigo,
    porcentajeCompletitud: t.porcentajeCompletitud
  }));
  await escribirJsonAtomico(archivoCliente(slugCliente), {
    ...cliente,
    tableros: resumenes,
    actualizadoEn: new Date().toISOString()
  });
}

export async function crearTablero(slugCliente: string, entrada: TableroEntrada): Promise<Tablero> {
  const cliente = await leerCliente(slugCliente);
  const slug = await slugDisponible(slugCliente, entrada.codigo);
  const ahora = new Date().toISOString();

  const tablero: Tablero = {
    id: nuevoId(),
    slug,
    clienteId: cliente.id,
    codigo: entrada.codigo,
    nombre: entrada.nombre,
    tipo: entrada.tipo,
    ...(entrada.ubicacion !== undefined && { ubicacion: entrada.ubicacion }),
    tensionSistema: entrada.tensionSistema ?? 'pendiente',
    esquemaTierra: entrada.esquemaTierra ?? 'pendiente',
    ...(entrada.potenciaContratadaKW !== undefined && { potenciaContratadaKW: entrada.potenciaContratadaKW }),
    ...(entrada.corrienteNominalA !== undefined && { corrienteNominalA: entrada.corrienteNominalA }),
    circuitos: [],
    anotacionesHallazgos: [],
    fotos: [],
    componentes: [],
    pendientes: [],
    porcentajeCompletitud: 0,
    creadoEn: ahora,
    actualizadoEn: ahora
  };

  const conCompletitud = sincronizarCompletitud(tablero);
  await escribirJsonAtomico(archivoTablero(slugCliente, slug), conCompletitud);
  await sincronizarCliente(slugCliente);
  return conCompletitud;
}

export async function leerTablero(slugCliente: string, slugTablero: string): Promise<Tablero> {
  const ruta = archivoTablero(slugCliente, slugTablero);
  if (!(await existe(ruta))) {
    throw new Error(`Tablero "${slugTablero}" no existe en cliente "${slugCliente}"`);
  }
  const contenido = await readFile(ruta, 'utf-8');
  let parseado: unknown;
  try {
    parseado = JSON.parse(contenido);
  } catch {
    throw new Error(`Archivo tablero.json corrupto: ${slugCliente}/${slugTablero}`);
  }
  return EsquemaTablero.parse(parseado);
}

export async function listarTableros(slugCliente: string): Promise<Tablero[]> {
  const raiz = dirTableros(slugCliente);
  if (!(await existe(raiz))) return [];
  const entradas = await readdir(raiz, { withFileTypes: true });
  const slugs = entradas.filter(e => e.isDirectory()).map(e => e.name);
  const tableros: Tablero[] = [];
  for (const s of slugs) {
    try {
      tableros.push(await leerTablero(slugCliente, s));
    } catch {
      // ignorar carpetas corruptas
    }
  }
  return tableros;
}

export async function actualizarTablero(
  slugCliente: string,
  slugTablero: string,
  parche: TableroActualizacion
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const actualizado: Tablero = sincronizarCompletitud({
    ...actual,
    ...(parche.codigo !== undefined && { codigo: parche.codigo }),
    ...(parche.nombre !== undefined && { nombre: parche.nombre }),
    ...(parche.tipo !== undefined && { tipo: parche.tipo }),
    ...(parche.ubicacion !== undefined && { ubicacion: parche.ubicacion }),
    ...(parche.tensionSistema !== undefined && { tensionSistema: parche.tensionSistema }),
    ...(parche.esquemaTierra !== undefined && { esquemaTierra: parche.esquemaTierra }),
    ...(parche.potenciaContratadaKW !== undefined && { potenciaContratadaKW: parche.potenciaContratadaKW }),
    ...(parche.corrienteNominalA !== undefined && { corrienteNominalA: parche.corrienteNominalA }),
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}

export async function eliminarTablero(slugCliente: string, slugTablero: string): Promise<void> {
  const ruta = dirTablero(slugCliente, slugTablero);
  if (!(await existe(ruta))) {
    throw new Error(`Tablero "${slugTablero}" no existe en cliente "${slugCliente}"`);
  }
  await rm(ruta, { recursive: true, force: true });
  await sincronizarCliente(slugCliente);
}

export async function agregarComponentes(
  slugCliente: string,
  slugTablero: string,
  nuevos: ComponenteReconciliado[]
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const porId = new Map(actual.componentes.map(c => [c.id, c]));
  for (const c of nuevos) {
    porId.set(c.id, c); // sobrescribe si existe
  }
  const actualizado = sincronizarCompletitud({
    ...actual,
    componentes: [...porId.values()],
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}

// Agrega una foto Y sus componentes reconciliados en una sola escritura atómica.
// Usado por POST .../fotos para evitar estados intermedios inconsistentes.
export async function agregarFotoYComponentes(
  slugCliente: string,
  slugTablero: string,
  foto: Foto,
  componentes: ComponenteReconciliado[]
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const porId = new Map(actual.componentes.map(c => [c.id, c]));
  for (const c of componentes) porId.set(c.id, c);

  const actualizado = sincronizarCompletitud({
    ...actual,
    fotos: [...actual.fotos, foto],
    componentes: [...porId.values()],
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}

export async function actualizarComponente(
  slugCliente: string,
  slugTablero: string,
  componenteId: string,
  parche: ComponenteActualizacion
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const idx = actual.componentes.findIndex(c => c.id === componenteId);
  if (idx < 0) {
    throw new Error(`Componente "${componenteId}" no existe en tablero "${slugTablero}"`);
  }
  const componente = actual.componentes[idx]!;
  const componenteActualizado: ComponenteReconciliado = {
    ...componente,
    ...parche,
    id: componente.id, // id nunca cambia
    tipo: parche.tipo ?? componente.tipo,
    procedencia: parche.procedencia ?? componente.procedencia
  };
  const nuevosComponentes = [...actual.componentes];
  nuevosComponentes[idx] = componenteActualizado;

  const actualizado = sincronizarCompletitud({
    ...actual,
    componentes: nuevosComponentes,
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}
