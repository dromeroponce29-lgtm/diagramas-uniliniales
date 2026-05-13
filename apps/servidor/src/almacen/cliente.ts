import { readFile, readdir, rm, access } from 'node:fs/promises';
import type { Cliente } from '../../../../tipos/modelo.js';
import { EsquemaCliente, type ClienteEntrada } from '../esquemas/cliente.js';
import { archivoCliente, dirCliente, dirProyectos } from './rutas.js';
import { escribirJsonAtomico } from './escritura.js';
import { nuevoId } from '../util/ulid.js';
import { generarSlug } from '../util/slug.js';

async function existe(ruta: string): Promise<boolean> {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function slugDisponible(slugBase: string): Promise<string> {
  let sufijo = 1;
  while (true) {
    const candidato = generarSlug(slugBase, sufijo);
    if (!(await existe(dirCliente(candidato)))) return candidato;
    sufijo += 1;
  }
}

export async function crearCliente(entrada: ClienteEntrada): Promise<Cliente> {
  const slug = await slugDisponible(entrada.nombre);
  const ahora = new Date().toISOString();
  const cliente: Cliente = {
    id: nuevoId(),
    slug,
    nombre: entrada.nombre,
    ...(entrada.rut !== undefined && { rut: entrada.rut }),
    ...(entrada.direccion !== undefined && { direccion: entrada.direccion }),
    ...(entrada.contactoNombre !== undefined && { contactoNombre: entrada.contactoNombre }),
    ...(entrada.contactoTelefono !== undefined && { contactoTelefono: entrada.contactoTelefono }),
    ...(entrada.contactoEmail !== undefined && { contactoEmail: entrada.contactoEmail }),
    creadoEn: ahora,
    actualizadoEn: ahora,
    tableros: []
  };

  await escribirJsonAtomico(archivoCliente(slug), cliente);
  return cliente;
}

export async function leerCliente(slug: string): Promise<Cliente> {
  const ruta = archivoCliente(slug);
  if (!(await existe(ruta))) {
    throw new Error(`Cliente "${slug}" no existe`);
  }
  const contenido = await readFile(ruta, 'utf-8');
  let parseado: unknown;
  try {
    parseado = JSON.parse(contenido);
  } catch {
    throw new Error(`Archivo cliente.json corrupto (no es JSON válido): ${slug}`);
  }
  return EsquemaCliente.parse(parseado);
}

export async function listarClientes(): Promise<Cliente[]> {
  const raiz = dirProyectos();
  if (!(await existe(raiz))) return [];
  const entradas = await readdir(raiz, { withFileTypes: true });
  const slugs = entradas.filter(e => e.isDirectory()).map(e => e.name);

  const clientes: Cliente[] = [];
  for (const slug of slugs) {
    try {
      clientes.push(await leerCliente(slug));
    } catch {
      // carpetas que no tienen cliente.json válido se ignoran silenciosamente
    }
  }
  return clientes;
}

export async function actualizarCliente(slug: string, parche: Partial<ClienteEntrada>): Promise<Cliente> {
  const actual = await leerCliente(slug);
  const actualizado: Cliente = {
    ...actual,
    ...(parche.nombre !== undefined && { nombre: parche.nombre }),
    ...(parche.rut !== undefined && { rut: parche.rut }),
    ...(parche.direccion !== undefined && { direccion: parche.direccion }),
    ...(parche.contactoNombre !== undefined && { contactoNombre: parche.contactoNombre }),
    ...(parche.contactoTelefono !== undefined && { contactoTelefono: parche.contactoTelefono }),
    ...(parche.contactoEmail !== undefined && { contactoEmail: parche.contactoEmail }),
    ...(parche.instaladorPredeterminadoNombre !== undefined && { instaladorPredeterminadoNombre: parche.instaladorPredeterminadoNombre }),
    ...(parche.instaladorPredeterminadoRUT !== undefined && { instaladorPredeterminadoRUT: parche.instaladorPredeterminadoRUT }),
    ...(parche.instaladorPredeterminadoClaseSEC !== undefined && { instaladorPredeterminadoClaseSEC: parche.instaladorPredeterminadoClaseSEC }),
    ...(parche.proyectoNombrePredeterminado !== undefined && { proyectoNombrePredeterminado: parche.proyectoNombrePredeterminado }),
    actualizadoEn: new Date().toISOString()
  };
  await escribirJsonAtomico(archivoCliente(slug), actualizado);
  return actualizado;
}

export async function eliminarCliente(slug: string): Promise<void> {
  const ruta = dirCliente(slug);
  if (!(await existe(ruta))) {
    throw new Error(`Cliente "${slug}" no existe`);
  }
  await rm(ruta, { recursive: true, force: true });
}
