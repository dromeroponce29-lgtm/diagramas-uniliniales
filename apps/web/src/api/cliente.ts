import type {
  Cliente, Tablero,
  ItemCatalogo, PlanNormalizacion,
  EstadoPlan, UnidadCatalogo, CategoriaCatalogo
} from '@tipos/modelo';

// Prefijo de la API. En dev queda vacío para que el proxy de Vite enrute
// /api/* hacia el backend local. En producción se setea VITE_API_URL con la
// URL pública del backend (por ejemplo https://...onrender.com).
export const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function pedir<T>(metodo: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${url}`, {
    method: metodo,
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  });
  if (!r.ok) {
    const texto = await r.text();
    throw new Error(`Error ${r.status}: ${texto}`);
  }
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

export const apiClientes = {
  listar: () => pedir<Cliente[]>('GET', '/api/clientes'),
  crear: (datos: { nombre: string; rut?: string; direccion?: string; contactoNombre?: string; contactoTelefono?: string; contactoEmail?: string }) =>
    pedir<Cliente>('POST', '/api/clientes', datos),
  leer: (slug: string) => pedir<Cliente>('GET', `/api/clientes/${slug}`),
  actualizar: (slug: string, datos: Partial<{
    nombre: string; rut: string; direccion: string;
    contactoNombre: string; contactoTelefono: string; contactoEmail: string;
    instaladorPredeterminadoNombre: string;
    instaladorPredeterminadoRUT: string;
    instaladorPredeterminadoClaseSEC: 'A' | 'B' | 'C' | 'D';
    proyectoNombrePredeterminado: string;
  }>) =>
    pedir<Cliente>('PUT', `/api/clientes/${slug}`, datos),
  eliminar: (slug: string) => pedir<void>('DELETE', `/api/clientes/${slug}`)
};

export const apiTableros = {
  listar: (clienteSlug: string) =>
    pedir<Tablero[]>('GET', `/api/clientes/${clienteSlug}/tableros`),
  crear: (clienteSlug: string, datos: { codigo: string; nombre: string; tipo: 'general' | 'distribucion' | 'comando' | 'otro'; ubicacion?: string }) =>
    pedir<Tablero>('POST', `/api/clientes/${clienteSlug}/tableros`, datos),
  leer: (clienteSlug: string, tableroSlug: string) =>
    pedir<Tablero>('GET', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}`),
  actualizar: (clienteSlug: string, tableroSlug: string, datos: Partial<{
    tensionSistema: string;
    esquemaTierra: string;
    potenciaContratadaKW: number;
    corrienteNominalA: number;
    ubicacion: string;
    nombre: string;
    codigo: string;
    tipo: string;
    espaciosTotales: number;
    frecuenciaHz: number;
    capacidadNominalA: number;
    notasGenerales: string;
    acometida: import('@tipos/modelo').DatosAcometida;
    alimentadorEntrada: import('@tipos/modelo').DatosAlimentadorEntrada;
    puestaATierra: import('@tipos/modelo').DatosPuestaATierra;
    vineta: import('@tipos/modelo').DatosVineta;
  }>) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}`, datos),
  eliminar: (clienteSlug: string, tableroSlug: string) =>
    pedir<void>('DELETE', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}`),

  subirFoto: async (clienteSlug: string, tableroSlug: string, archivo: File): Promise<Tablero> => {
    const fd = new FormData();
    fd.append('foto', archivo);
    const r = await fetch(`${API_BASE}/api/clientes/${clienteSlug}/tableros/${tableroSlug}/fotos`, {
      method: 'POST',
      body: fd
    });
    if (!r.ok) {
      const texto = await r.text();
      throw new Error(`Error ${r.status}: ${texto}`);
    }
    return r.json();
  },

  actualizarComponente: (clienteSlug: string, tableroSlug: string, componenteId: string, datos: unknown) =>
    pedir<Tablero>('PATCH', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/componentes/${componenteId}`, datos),

  reemplazarCircuitos: (clienteSlug: string, tableroSlug: string, circuitos: unknown[]) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/circuitos`, { circuitos }),

  reemplazarAnotacionesHallazgos: (clienteSlug: string, tableroSlug: string, anotaciones: unknown[]) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/anotaciones-ric`, { anotaciones })
};

export interface ItemCatalogoEntrada {
  id?: string;
  codigo: string;
  descripcion: string;
  tipo: 'material' | 'labor';
  unidad: UnidadCatalogo;
  precioUnitarioCLP: number;
  categoria: CategoriaCatalogo;
  notas?: string;
}

export interface PartidaEntrada {
  id?: string;
  itemCodigo: string;
  itemDescripcion: string;
  unidad: UnidadCatalogo;
  precioUnitarioCLP: number;
  cantidad: number;
  hallazgoReglaId?: string;
  hallazgoComponenteId?: string;
  hallazgoCircuitoId?: string;
  notas?: string;
}

export interface PlanActualizacionEntrada {
  estado?: EstadoPlan;
  incluyeIVA?: boolean;
  ivaPct?: number;
  partidas?: PartidaEntrada[];
  notas?: string;
}

export const apiCatalogo = {
  leer: (clienteSlug: string) =>
    pedir<ItemCatalogo[]>('GET', `/api/clientes/${clienteSlug}/catalogo`),
  reemplazar: (clienteSlug: string, items: ItemCatalogoEntrada[]) =>
    pedir<ItemCatalogo[]>('PUT', `/api/clientes/${clienteSlug}/catalogo`, items),
  restaurarSemilla: (clienteSlug: string) =>
    pedir<ItemCatalogo[]>('POST', `/api/clientes/${clienteSlug}/catalogo/semilla`)
};

export const apiAuditoria = {
  ejecutar: (clienteSlug: string, tableroSlug: string) =>
    pedir<import('@tipos/ric/auditoria').ResultadoAuditoria>('POST', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/auditoria`, {}),
  leer: (clienteSlug: string, tableroSlug: string) =>
    pedir<import('@tipos/ric/auditoria').ResultadoAuditoria>('GET', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/auditoria`)
};

export const apiPlanes = {
  listar: (clienteSlug: string, tableroSlug: string) =>
    pedir<PlanNormalizacion[]>('GET', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/planes`),
  crear: (clienteSlug: string, tableroSlug: string, opts: { autoSugerir: boolean }) =>
    pedir<PlanNormalizacion>('POST', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/planes`, opts),
  actualizar: (clienteSlug: string, tableroSlug: string, planId: string, parche: PlanActualizacionEntrada) =>
    pedir<PlanNormalizacion>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/planes/${planId}`, parche),
  eliminar: (clienteSlug: string, tableroSlug: string, planId: string) =>
    pedir<void>('DELETE', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/planes/${planId}`)
};
