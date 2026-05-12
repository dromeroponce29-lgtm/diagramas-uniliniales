# Plan 2 — Persistencia completa + workspace híbrido

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Objetivo:** A partir del MVP del Plan 1, construir el modelo de datos completo y la pantalla principal de trabajo. Al terminar el Plan 2, el usuario puede crear un cliente, agregarle tableros, subir hasta 20 fotos por tablero (procesadas por el pipeline dual-agent del Plan 1), revisar la lista de componentes detectados, resolver discrepancias manualmente, completar datos no observables a mano, y todo queda persistido en disco como JSON + fotos. Sin diagrama SVG todavía (Plan 3), sin RIC (Plan 4), sin exportación (Plan 6).

**Arquitectura:** El backend gana endpoints CRUD para `Cliente` y `Tablero` y persistencia en sistema de archivos siguiendo la estructura `proyectos/<slug-cliente>/...` del spec. El frontend gana enrutamiento (`react-router-dom`), dos pantallas (lista de clientes + workspace del tablero), y stores Zustand para clientes y tableros. El endpoint `POST /api/extract` del Plan 1 se reemplaza por `POST /api/clientes/:c/tableros/:t/fotos`, que además de procesar, persiste la foto y los resultados.

**Stack adicional respecto al Plan 1:** `react-router-dom`, `fs/promises` (built-in), nada más nuevo.

**Alcance (qué NO incluye):**
- Motor de diagrama SVG (Plan 3).
- Verificación RIC activa (Plan 4).
- Interconexiones entre tableros (Plan 5).
- Exportación PDF / ZIP (Plan 6).

---

## Estructura de archivos al terminar el Plan 2

```
diagramas-uniliniales/
├── tipos/
│   └── modelo.ts                                # EXPANDIDO con Cliente, Tablero, Foto, etc.
├── apps/
│   ├── servidor/
│   │   ├── src/
│   │   │   ├── almacen/                         # NUEVO
│   │   │   │   ├── rutas.ts                     # path helpers
│   │   │   │   ├── escritura.ts                 # write-to-tmp + rename atómico
│   │   │   │   ├── cliente.ts                   # CRUD Cliente
│   │   │   │   └── tablero.ts                   # CRUD Tablero + fotos
│   │   │   ├── esquemas/
│   │   │   │   ├── extraccion.ts                # (Plan 1)
│   │   │   │   ├── cliente.ts                   # NUEVO
│   │   │   │   └── tablero.ts                   # NUEVO
│   │   │   ├── completitud/                     # NUEVO
│   │   │   │   └── calcular.ts                  # función pura
│   │   │   ├── rutas/
│   │   │   │   ├── extraer.ts                   # ELIMINADO (reemplazado)
│   │   │   │   ├── clientes.ts                  # NUEVO — CRUD clientes
│   │   │   │   ├── tableros.ts                  # NUEVO — CRUD tableros + fotos + PATCH
│   │   │   │   └── ...
│   │   │   ├── agentes/                         # (Plan 1, sin cambios)
│   │   │   ├── util/
│   │   │   │   ├── ulid.ts                      # (Plan 1)
│   │   │   │   └── slug.ts                      # NUEVO
│   │   │   └── ...
│   │   └── tests/
│   │       ├── reconciliador.test.ts            # (Plan 1)
│   │       ├── extraer.test.ts                  # ELIMINADO (reemplazado)
│   │       ├── almacen-cliente.test.ts          # NUEVO
│   │       ├── almacen-tablero.test.ts          # NUEVO
│   │       ├── completitud.test.ts              # NUEVO
│   │       ├── clientes-api.test.ts             # NUEVO
│   │       └── tableros-api.test.ts             # NUEVO
│   └── web/
│       ├── package.json                         # MODIFICADO (agrega react-router-dom)
│       ├── src/
│       │   ├── App.tsx                          # MODIFICADO — router con rutas
│       │   ├── pantallas/                       # NUEVO
│       │   │   ├── ListaClientes.tsx
│       │   │   └── WorkspaceTablero.tsx
│       │   ├── componentes/                     # NUEVO
│       │   │   ├── PanelFotos.tsx
│       │   │   ├── PanelComponentes.tsx
│       │   │   ├── PanelPendientes.tsx
│       │   │   ├── BarraCompletitud.tsx
│       │   │   ├── DialogoCliente.tsx
│       │   │   ├── DialogoTablero.tsx
│       │   │   └── ResolverDiscrepancia.tsx
│       │   ├── api/
│       │   │   └── cliente.ts                   # MODIFICADO — todos los endpoints
│       │   ├── estado/
│       │   │   ├── extraccionStore.ts           # ELIMINADO (reemplazado)
│       │   │   ├── clienteStore.ts              # NUEVO
│       │   │   └── tableroStore.ts              # NUEVO
│       │   └── util/
│       │       └── completitud.ts               # NUEVO (idem backend, función pura)
```

---

## Tarea 1 — Expandir tipos compartidos con Cliente, Tablero y todo el modelo

**Archivos:**
- Modificar: `tipos/modelo.ts`

- [ ] **Paso 1: Sobrescribir `tipos/modelo.ts` agregando los tipos completos**

Reemplazar el archivo por:

```typescript
// Tipos compartidos entre apps/servidor y apps/web.

// ============================================================================
// Procedencia y confianza — usado por todos los datos extraídos.
// ============================================================================

export type FuenteDato =
  | 'foto-claude'
  | 'foto-openai'
  | 'foto-ambos'
  | 'manual'
  | 'pendiente';

export type ConfianzaDato = 'alta' | 'media' | 'baja' | 'discrepancia';

export interface Procedencia {
  fuente: FuenteDato;
  confianza: ConfianzaDato;
  fotoId?: string;
  notas?: string;
}

// ============================================================================
// Componentes detectados por agentes IA y reconciliados.
// ============================================================================

export type TipoComponente =
  | 'interruptor-automatico'
  | 'diferencial'
  | 'interruptor-general'
  | 'barra-fase'
  | 'barra-neutro'
  | 'barra-tierra'
  | 'dps'
  | 'contactor'
  | 'rele-termico'
  | 'medidor'
  | 'borne'
  | 'otro';

export type CalidadFoto = 'buena' | 'aceptable' | 'mala';

export interface ResultadoExtraccionAgente {
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentesDetectados: ComponenteDetectadoAgente[];
  rotulacionCircuitosLeida: RotulacionCircuito[];
}

export interface ComponenteDetectadoAgente {
  tipoSugerido: TipoComponente;
  marca: string | null;
  modelo: string | null;
  calibreA: number | null;
  polos: 1 | 2 | 3 | 4 | null;
  curva: 'B' | 'C' | 'D' | 'K' | null;
  sensibilidadMA: number | null;
  posicion: { fila: number; columna: number } | null;
  textoLeido: string | null;
  confianzaAgente: 'alta' | 'media' | 'baja';
  notas: string | null;
}

export interface RotulacionCircuito {
  numero: number | null;
  textoOriginal: string;
}

// Resultado del reconciliador para una sola foto.
export interface ResultadoExtraccion {
  fotoId: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentes: ComponenteReconciliado[];
  rotulacionesLeidas: RotulacionCircuito[];
}

export interface ComponenteReconciliado {
  id: string;
  tipo: TipoComponente;
  marca?: string;
  modelo?: string;
  calibreA?: number;
  polos?: 1 | 2 | 3 | 4;
  curva?: 'B' | 'C' | 'D' | 'K';
  sensibilidadMA?: number;
  posicionEnTablero?: { fila: number; columna: number };
  procedencia: Procedencia;
}

// ============================================================================
// Cliente — entidad raíz del modelo.
// ============================================================================

export interface Cliente {
  id: string;                                 // ULID
  slug: string;                               // usado en rutas y nombre de carpeta
  nombre: string;
  rut?: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  creadoEn: string;                           // ISO date
  actualizadoEn: string;
  tableros: ResumenTablero[];                 // referencias (id + código + completitud)
  // interconexiones: las introduce Plan 5.
}

export interface ResumenTablero {
  id: string;
  codigo: string;
  porcentajeCompletitud: number;
}

// ============================================================================
// Tablero — pertenece a un cliente.
// ============================================================================

export type TipoTablero = 'general' | 'distribucion' | 'comando' | 'otro';
export type TensionSistema = '220V-mono' | '380V-trif' | '380V/220V-trif-n' | 'pendiente';
export type EsquemaTierra = 'TT' | 'TN-S' | 'TN-C-S' | 'IT' | 'pendiente';

export interface Tablero {
  id: string;                                 // ULID
  slug: string;
  clienteId: string;
  codigo: string;                             // "TG", "TD-1", "TD-Cocina"
  nombre: string;
  tipo: TipoTablero;
  ubicacion?: string;

  tensionSistema: TensionSistema;
  esquemaTierra: EsquemaTierra;
  potenciaContratadaKW?: number;
  corrienteNominalA?: number;

  fotos: Foto[];                              // hasta 20
  componentes: ComponenteReconciliado[];      // acumulado desde todas las fotos
  pendientes: Pendiente[];

  porcentajeCompletitud: number;              // calculado, sincronizado al guardar

  creadoEn: string;
  actualizadoEn: string;

  // hallazgosRIC se agrega en Plan 4
  // circuitos se agrega en Plan 4 (cuando empiezan a derivarse del análisis)
}

export interface Foto {
  id: string;                                 // ULID, también es el nombre del archivo
  nombreOriginal: string;                     // como vino del usuario
  mimeType: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  subidaEn: string;                           // ISO
}

export type CategoriaPendiente =
  | 'dato-no-observable'
  | 'discrepancia-agentes'
  | 'foto-baja-calidad';

export type ResolucionPendiente = 'foto-nueva' | 'entrada-manual' | 'medicion-terreno';

export interface Pendiente {
  id: string;
  categoria: CategoriaPendiente;
  descripcion: string;
  componenteId?: string;
  resoluble: ResolucionPendiente;
  resueltoEn?: string;                        // ISO si fue resuelto
}
```

- [ ] **Paso 2: Verificar compilación**

Ejecutar: `npm --workspace apps/servidor exec tsc -- --noEmit`
Esperado: sin errores. El reconciliador existente sigue compilando porque los tipos que usa están preservados.

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Verificar tests del Plan 1**

Ejecutar: `npm test`
Esperado: 10/10 pasan (no cambia ninguna lógica).

- [ ] **Paso 4: Commit**

```bash
git add tipos/modelo.ts
git commit -m "feat(tipos): expande modelo con Cliente, Tablero, Foto, Pendiente"
```

---

## Tarea 2 — Schemas Zod para Cliente y Tablero

**Archivos:**
- Crear: `apps/servidor/src/esquemas/cliente.ts`
- Crear: `apps/servidor/src/esquemas/tablero.ts`

- [ ] **Paso 1: Crear `cliente.ts`**

`apps/servidor/src/esquemas/cliente.ts`:

```typescript
import { z } from 'zod';

export const EsquemaResumenTablero = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  porcentajeCompletitud: z.number().int().min(0).max(100)
});

export const EsquemaCliente = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(1).max(200),
  rut: z.string().max(20).optional(),
  direccion: z.string().max(300).optional(),
  contactoNombre: z.string().max(200).optional(),
  contactoTelefono: z.string().max(50).optional(),
  contactoEmail: z.string().email().max(200).optional(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  tableros: z.array(EsquemaResumenTablero)
});

// Para inputs al crear (lo que envía el frontend, sin id/slug/timestamps/tableros).
export const EsquemaClienteEntrada = EsquemaCliente
  .omit({ id: true, slug: true, creadoEn: true, actualizadoEn: true, tableros: true })
  .partial({ rut: true, direccion: true, contactoNombre: true, contactoTelefono: true, contactoEmail: true });

export type ClienteEntrada = z.infer<typeof EsquemaClienteEntrada>;
```

- [ ] **Paso 2: Crear `tablero.ts`**

`apps/servidor/src/esquemas/tablero.ts`:

```typescript
import { z } from 'zod';

const EsquemaProcedencia = z.object({
  fuente: z.enum(['foto-claude', 'foto-openai', 'foto-ambos', 'manual', 'pendiente']),
  confianza: z.enum(['alta', 'media', 'baja', 'discrepancia']),
  fotoId: z.string().optional(),
  notas: z.string().optional()
});

const EsquemaComponenteReconciliado = z.object({
  id: z.string().min(1),
  tipo: z.enum([
    'interruptor-automatico', 'diferencial', 'interruptor-general',
    'barra-fase', 'barra-neutro', 'barra-tierra',
    'dps', 'contactor', 'rele-termico', 'medidor', 'borne', 'otro'
  ]),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  calibreA: z.number().positive().optional(),
  polos: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  curva: z.enum(['B', 'C', 'D', 'K']).optional(),
  sensibilidadMA: z.number().positive().optional(),
  posicionEnTablero: z.object({
    fila: z.number().int().nonnegative(),
    columna: z.number().int().nonnegative()
  }).optional(),
  procedencia: EsquemaProcedencia
});

const EsquemaFoto = z.object({
  id: z.string().min(1),
  nombreOriginal: z.string(),
  mimeType: z.string(),
  calidadFoto: z.enum(['buena', 'aceptable', 'mala']),
  problemasFoto: z.array(z.string()),
  subidaEn: z.string()
});

const EsquemaPendiente = z.object({
  id: z.string().min(1),
  categoria: z.enum(['dato-no-observable', 'discrepancia-agentes', 'foto-baja-calidad']),
  descripcion: z.string(),
  componenteId: z.string().optional(),
  resoluble: z.enum(['foto-nueva', 'entrada-manual', 'medicion-terreno']),
  resueltoEn: z.string().optional()
});

export const EsquemaTablero = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  clienteId: z.string().min(1),
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  tipo: z.enum(['general', 'distribucion', 'comando', 'otro']),
  ubicacion: z.string().max(300).optional(),
  tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n', 'pendiente']),
  esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT', 'pendiente']),
  potenciaContratadaKW: z.number().positive().optional(),
  corrienteNominalA: z.number().positive().optional(),
  fotos: z.array(EsquemaFoto),
  componentes: z.array(EsquemaComponenteReconciliado),
  pendientes: z.array(EsquemaPendiente),
  porcentajeCompletitud: z.number().int().min(0).max(100),
  creadoEn: z.string(),
  actualizadoEn: z.string()
});

// Para input al crear un tablero.
export const EsquemaTableroEntrada = EsquemaTablero
  .pick({ codigo: true, nombre: true, tipo: true })
  .extend({
    ubicacion: z.string().max(300).optional(),
    tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n', 'pendiente']).default('pendiente'),
    esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT', 'pendiente']).default('pendiente'),
    potenciaContratadaKW: z.number().positive().optional(),
    corrienteNominalA: z.number().positive().optional()
  });

// Para actualizar campos manuales del tablero (todo opcional).
export const EsquemaTableroActualizacion = EsquemaTableroEntrada.partial();

// Para actualizar un componente individual (todo opcional excepto el id).
export const EsquemaComponenteActualizacion = EsquemaComponenteReconciliado.partial();

export type TableroEntrada = z.infer<typeof EsquemaTableroEntrada>;
export type TableroActualizacion = z.infer<typeof EsquemaTableroActualizacion>;
export type ComponenteActualizacion = z.infer<typeof EsquemaComponenteActualizacion>;
```

- [ ] **Paso 3: Verificar compilación**

Ejecutar: `npm --workspace apps/servidor exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add apps/servidor/src/esquemas/cliente.ts apps/servidor/src/esquemas/tablero.ts
git commit -m "feat(servidor): agrega schemas Zod para Cliente y Tablero"
```

---

## Tarea 3 — Util de slug y escritura atómica

**Archivos:**
- Crear: `apps/servidor/src/util/slug.ts`
- Crear: `apps/servidor/src/almacen/rutas.ts`
- Crear: `apps/servidor/src/almacen/escritura.ts`
- Crear: `apps/servidor/tests/util.test.ts`

- [ ] **Paso 1: Crear test del slug primero**

`apps/servidor/tests/util.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generarSlug } from '../src/util/slug.js';

describe('generarSlug', () => {
  it('convierte a kebab-case ASCII', () => {
    expect(generarSlug('Constructora Andes Ltda.')).toBe('constructora-andes-ltda');
  });

  it('quita acentos', () => {
    expect(generarSlug('Eléctrica Ñuñoa')).toBe('electrica-nunoa');
  });

  it('colapsa espacios múltiples y signos', () => {
    expect(generarSlug('TG --  Principal  S.A.')).toBe('tg-principal-sa');
  });

  it('rechaza nombre vacío', () => {
    expect(() => generarSlug('')).toThrow();
    expect(() => generarSlug('   ')).toThrow();
  });

  it('soporta sufijo numérico para colisiones', () => {
    expect(generarSlug('Empresa', 2)).toBe('empresa-2');
    expect(generarSlug('Empresa', 1)).toBe('empresa');
  });
});
```

- [ ] **Paso 2: Implementar slug**

`apps/servidor/src/util/slug.ts`:

```typescript
export function generarSlug(texto: string, sufijo: number = 1): string {
  const normalizado = texto
    .normalize('NFD')                                // separa acentos
    .replace(/[̀-ͯ]/g, '')                 // quita diacríticos
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')                     // todo lo no alfanumérico → guión
    .replace(/^-+|-+$/g, '');                        // sin guiones al inicio/final

  if (!normalizado) {
    throw new Error('No se puede generar slug desde un nombre vacío');
  }

  return sufijo > 1 ? `${normalizado}-${sufijo}` : normalizado;
}
```

- [ ] **Paso 3: Ejecutar tests del slug**

Ejecutar: `npm --workspace apps/servidor run test -- util`
Esperado: 5/5 pasan.

- [ ] **Paso 4: Crear `rutas.ts` (helpers de paths del almacén)**

`apps/servidor/src/almacen/rutas.ts`:

```typescript
import { resolve, join } from 'node:path';

// Resuelve la raíz de proyectos/. Por defecto desde la raíz del repo,
// pero se puede sobrescribir con la variable de entorno DIRECTORIO_PROYECTOS
// (útil para tests).
export function dirProyectos(): string {
  const env = process.env.DIRECTORIO_PROYECTOS;
  if (env) return resolve(env);
  // Subimos 4 niveles desde apps/servidor/src/almacen/rutas.ts: ../../../../proyectos
  // Pero como tsx compila on-the-fly, usar process.cwd() es más confiable cuando el
  // servidor se arranca desde la raíz del monorepo (npm run dev:servidor).
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
```

- [ ] **Paso 5: Crear `escritura.ts` (escritura atómica)**

`apps/servidor/src/almacen/escritura.ts`:

```typescript
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
```

- [ ] **Paso 6: Verificar compilación**

Ejecutar: `npm --workspace apps/servidor exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 7: Commit**

```bash
git add apps/servidor/src/util/slug.ts apps/servidor/src/almacen/ apps/servidor/tests/util.test.ts
git commit -m "feat(servidor): agrega util de slug y escritura atómica del almacén"
```

---

## Tarea 4 — Almacén Cliente (CRUD con TDD)

**Archivos:**
- Crear: `apps/servidor/src/almacen/cliente.ts`
- Crear: `apps/servidor/tests/almacen-cliente.test.ts`
- Crear: `apps/servidor/tests/helpers/dir-temporal.ts`

- [ ] **Paso 1: Crear helper para directorios temporales en tests**

`apps/servidor/tests/helpers/dir-temporal.ts`:

```typescript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function crearDirTemporal(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'diagramas-test-'));
}

export async function eliminarDirTemporal(ruta: string): Promise<void> {
  await rm(ruta, { recursive: true, force: true });
}
```

- [ ] **Paso 2: Crear tests del almacén Cliente**

`apps/servidor/tests/almacen-cliente.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import {
  crearCliente,
  leerCliente,
  listarClientes,
  actualizarCliente,
  eliminarCliente
} from '../src/almacen/cliente.js';

describe('almacén Cliente', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('crea un cliente nuevo con slug derivado del nombre', async () => {
    const c = await crearCliente({ nombre: 'Constructora Andes Ltda.' });
    expect(c.id).toBeDefined();
    expect(c.slug).toBe('constructora-andes-ltda');
    expect(c.nombre).toBe('Constructora Andes Ltda.');
    expect(c.tableros).toEqual([]);
    expect(c.creadoEn).toBeDefined();
  });

  it('lee un cliente que fue creado', async () => {
    const c = await crearCliente({ nombre: 'Empresa A' });
    const leido = await leerCliente(c.slug);
    expect(leido.id).toBe(c.id);
    expect(leido.nombre).toBe('Empresa A');
  });

  it('agrega sufijo numérico si el slug ya existe', async () => {
    const a = await crearCliente({ nombre: 'Empresa' });
    const b = await crearCliente({ nombre: 'Empresa' });
    expect(a.slug).toBe('empresa');
    expect(b.slug).toBe('empresa-2');
  });

  it('lista todos los clientes existentes', async () => {
    await crearCliente({ nombre: 'A' });
    await crearCliente({ nombre: 'B' });
    const lista = await listarClientes();
    expect(lista).toHaveLength(2);
    expect(lista.map(c => c.nombre).sort()).toEqual(['A', 'B']);
  });

  it('actualiza campos del cliente y actualiza actualizadoEn', async () => {
    const c = await crearCliente({ nombre: 'Empresa' });
    const original = c.actualizadoEn;
    await new Promise(r => setTimeout(r, 5));
    const u = await actualizarCliente(c.slug, { direccion: 'Av. Apoquindo 123' });
    expect(u.direccion).toBe('Av. Apoquindo 123');
    expect(u.actualizadoEn).not.toBe(original);
  });

  it('rechaza actualización si el cliente no existe', async () => {
    await expect(actualizarCliente('inexistente', { direccion: 'X' })).rejects.toThrow();
  });

  it('elimina un cliente y su carpeta', async () => {
    const c = await crearCliente({ nombre: 'A eliminar' });
    await eliminarCliente(c.slug);
    await expect(leerCliente(c.slug)).rejects.toThrow();
  });

  it('lanza error claro si el JSON en disco no parsea contra el schema', async () => {
    // Manipular el archivo a mano para corromperlo
    const c = await crearCliente({ nombre: 'Empresa' });
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await writeFile(join(dir, c.slug, 'cliente.json'), '{ "nombre": 123 }', 'utf-8');
    await expect(leerCliente(c.slug)).rejects.toThrow();
  });
});
```

- [ ] **Paso 3: Ejecutar tests — deben fallar**

Ejecutar: `npm --workspace apps/servidor run test -- almacen-cliente`
Esperado: FAIL — `cliente.js` no existe.

- [ ] **Paso 4: Implementar `almacen/cliente.ts`**

`apps/servidor/src/almacen/cliente.ts`:

```typescript
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
```

- [ ] **Paso 5: Ejecutar tests**

Ejecutar: `npm --workspace apps/servidor run test -- almacen-cliente`
Esperado: 8/8 pasan.

- [ ] **Paso 6: Commit**

```bash
git add apps/servidor/src/almacen/cliente.ts apps/servidor/tests/almacen-cliente.test.ts apps/servidor/tests/helpers/
git commit -m "feat(servidor): implementa almacén Cliente con CRUD y tests"
```

---

## Tarea 5 — Cálculo de completitud (función pura, TDD)

**Archivos:**
- Crear: `apps/servidor/src/completitud/calcular.ts`
- Crear: `apps/servidor/tests/completitud.test.ts`

**Reglas de completitud para Plan 2** (subset de lo que será al final del proyecto):

Cada uno de estos elementos cuenta como 1 slot. Un slot está "completo" si tiene valor y `procedencia.confianza` no es `'pendiente'` ni `'discrepancia'`:

- **Nivel tablero (4 slots fijos):** `tensionSistema`, `esquemaTierra`, `potenciaContratadaKW`, `corrienteNominalA`. Los enums `pendiente` o ausencia → incompleto.
- **Por cada componente (5 slots variables):** `marca`, `modelo`, `calibreA`, `polos`, y `procedencia.confianza` no debe ser `'discrepancia'`.

Para Plan 2 NO se evalúa nada de circuitos ni de RIC (eso entra en Plan 4 y siguientes).

- [ ] **Paso 1: Crear tests**

`apps/servidor/tests/completitud.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calcularCompletitud } from '../src/completitud/calcular.js';
import type { Tablero } from '../../../tipos/modelo.js';

function tableroBase(): Tablero {
  return {
    id: '1',
    slug: 't',
    clienteId: 'c',
    codigo: 'TG',
    nombre: 'TG',
    tipo: 'general',
    tensionSistema: 'pendiente',
    esquemaTierra: 'pendiente',
    fotos: [],
    componentes: [],
    pendientes: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-01-01',
    actualizadoEn: '2026-01-01'
  };
}

describe('calcularCompletitud', () => {
  it('un tablero vacío sin datos retorna 0', () => {
    expect(calcularCompletitud(tableroBase())).toBe(0);
  });

  it('un tablero con todos los datos de nivel tablero completos sin componentes retorna 100', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    expect(calcularCompletitud(t)).toBe(100);
  });

  it('un tablero con 50% de los datos de tablero retorna 50', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    // potenciaContratadaKW y corrienteNominalA siguen ausentes
    expect(calcularCompletitud(t)).toBe(50);
  });

  it('un componente sin discrepancia con marca/modelo/calibre/polos cuenta sus 5 slots', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      marca: 'Schneider',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    }];
    // 4 slots de tablero (4/4) + 5 slots de componente (5/5) = 9/9 = 100%
    expect(calcularCompletitud(t)).toBe(100);
  });

  it('un componente con discrepancia degrada la completitud', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      marca: 'Schneider',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-claude', confianza: 'discrepancia' }
    }];
    // 4 slots tablero + 4 slots componente (marca/modelo/calibre/polos sí; confianza no) = 8/9
    expect(calcularCompletitud(t)).toBe(Math.round((8 / 9) * 100));
  });

  it('un componente con marca ausente cuenta 4/5', () => {
    const t = tableroBase();
    t.tensionSistema = '220V-mono';
    t.esquemaTierra = 'TT';
    t.potenciaContratadaKW = 5;
    t.corrienteNominalA = 25;
    t.componentes = [{
      id: '1',
      tipo: 'interruptor-automatico',
      modelo: 'iC60H',
      calibreA: 16,
      polos: 1,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    }];
    // 4 slots tablero + 4 slots componente (sin marca) = 8/9
    expect(calcularCompletitud(t)).toBe(Math.round((8 / 9) * 100));
  });
});
```

- [ ] **Paso 2: Ejecutar tests — deben fallar**

Ejecutar: `npm --workspace apps/servidor run test -- completitud`
Esperado: FAIL — `calcular.js` no existe.

- [ ] **Paso 3: Implementar `calcular.ts`**

`apps/servidor/src/completitud/calcular.ts`:

```typescript
import type { Tablero, ComponenteReconciliado } from '../../../../tipos/modelo.js';

export function calcularCompletitud(t: Tablero): number {
  let slotsCompletos = 0;
  let slotsTotales = 0;

  // Nivel tablero (4 slots fijos)
  slotsTotales += 4;
  if (t.tensionSistema && t.tensionSistema !== 'pendiente') slotsCompletos += 1;
  if (t.esquemaTierra && t.esquemaTierra !== 'pendiente') slotsCompletos += 1;
  if (t.potenciaContratadaKW !== undefined) slotsCompletos += 1;
  if (t.corrienteNominalA !== undefined) slotsCompletos += 1;

  // Por cada componente: marca, modelo, calibreA, polos, y confianza no-discrepancia
  for (const c of t.componentes) {
    slotsTotales += 5;
    slotsCompletos += contarSlotsComponente(c);
  }

  if (slotsTotales === 0) return 0;
  return Math.round((slotsCompletos / slotsTotales) * 100);
}

function contarSlotsComponente(c: ComponenteReconciliado): number {
  let n = 0;
  if (c.marca !== undefined) n += 1;
  if (c.modelo !== undefined) n += 1;
  if (c.calibreA !== undefined) n += 1;
  if (c.polos !== undefined) n += 1;
  if (c.procedencia.confianza !== 'discrepancia') n += 1;
  return n;
}
```

- [ ] **Paso 4: Ejecutar tests**

Ejecutar: `npm --workspace apps/servidor run test -- completitud`
Esperado: 6/6 pasan.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/completitud/ apps/servidor/tests/completitud.test.ts
git commit -m "feat(servidor): cálculo de completitud como función pura testeada"
```

---

## Tarea 6 — Almacén Tablero (CRUD con TDD)

**Archivos:**
- Crear: `apps/servidor/src/almacen/tablero.ts`
- Crear: `apps/servidor/tests/almacen-tablero.test.ts`

- [ ] **Paso 1: Crear tests**

`apps/servidor/tests/almacen-tablero.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import { crearCliente, leerCliente } from '../src/almacen/cliente.js';
import {
  crearTablero,
  leerTablero,
  listarTableros,
  actualizarTablero,
  eliminarTablero,
  agregarComponentes,
  agregarFotoYComponentes,
  actualizarComponente
} from '../src/almacen/tablero.js';
import type { ComponenteReconciliado } from '../../../tipos/modelo.js';

describe('almacén Tablero', () => {
  let dir: string;
  let clienteSlug: string;

  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const c = await crearCliente({ nombre: 'Cliente Prueba' });
    clienteSlug = c.slug;
  });

  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('crea un tablero nuevo y lo agrega al resumen del cliente', async () => {
    const t = await crearTablero(clienteSlug, {
      codigo: 'TG',
      nombre: 'Tablero General',
      tipo: 'general'
    });
    expect(t.id).toBeDefined();
    expect(t.slug).toBe('tg');
    expect(t.tensionSistema).toBe('pendiente');
    expect(t.esquemaTierra).toBe('pendiente');
    expect(t.porcentajeCompletitud).toBe(0);

    const cliente = await leerCliente(clienteSlug);
    expect(cliente.tableros).toHaveLength(1);
    expect(cliente.tableros[0]!.codigo).toBe('TG');
  });

  it('lee un tablero existente', async () => {
    const creado = await crearTablero(clienteSlug, { codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const leido = await leerTablero(clienteSlug, creado.slug);
    expect(leido.id).toBe(creado.id);
  });

  it('lista todos los tableros del cliente', async () => {
    await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await crearTablero(clienteSlug, { codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const lista = await listarTableros(clienteSlug);
    expect(lista).toHaveLength(2);
  });

  it('actualiza campos del tablero y recalcula completitud y actualizadoEn', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const original = t.actualizadoEn;
    await new Promise(r => setTimeout(r, 5));
    const u = await actualizarTablero(clienteSlug, t.slug, {
      tensionSistema: '220V-mono',
      esquemaTierra: 'TT',
      potenciaContratadaKW: 5,
      corrienteNominalA: 25
    });
    expect(u.porcentajeCompletitud).toBe(100);
    expect(u.actualizadoEn).not.toBe(original);
  });

  it('agrega componentes al tablero (sin duplicar por id)', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const comp: ComponenteReconciliado = {
      id: 'comp-1',
      tipo: 'interruptor-general',
      calibreA: 63,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    };
    const t1 = await agregarComponentes(clienteSlug, t.slug, [comp]);
    expect(t1.componentes).toHaveLength(1);

    // re-agregar el mismo id no debe duplicar
    const t2 = await agregarComponentes(clienteSlug, t.slug, [comp]);
    expect(t2.componentes).toHaveLength(1);
  });

  it('agrega foto y componentes atómicamente', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const foto = {
      id: 'foto-1', nombreOriginal: 'a.jpg', mimeType: 'image/jpeg',
      calidadFoto: 'buena' as const, problemasFoto: [], subidaEn: '2026-01-01'
    };
    const comp: ComponenteReconciliado = {
      id: 'c1', tipo: 'interruptor-general', calibreA: 63,
      procedencia: { fuente: 'foto-ambos', confianza: 'alta' }
    };
    const r = await agregarFotoYComponentes(clienteSlug, t.slug, foto, [comp]);
    expect(r.fotos).toHaveLength(1);
    expect(r.componentes).toHaveLength(1);
  });

  it('actualiza un componente individual (resolver discrepancia o entrada manual)', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const comp: ComponenteReconciliado = {
      id: 'comp-1',
      tipo: 'interruptor-automatico',
      calibreA: 16,
      procedencia: { fuente: 'foto-claude', confianza: 'discrepancia', notas: 'Claude 16, OpenAI 10' }
    };
    await agregarComponentes(clienteSlug, t.slug, [comp]);

    const u = await actualizarComponente(clienteSlug, t.slug, 'comp-1', {
      calibreA: 16,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    });
    expect(u.componentes.find(c => c.id === 'comp-1')!.procedencia.confianza).toBe('alta');
  });

  it('elimina un tablero y lo quita del resumen del cliente', async () => {
    const t = await crearTablero(clienteSlug, { codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await eliminarTablero(clienteSlug, t.slug);
    const cliente = await leerCliente(clienteSlug);
    expect(cliente.tableros).toHaveLength(0);
    await expect(leerTablero(clienteSlug, t.slug)).rejects.toThrow();
  });
});
```

- [ ] **Paso 2: Ejecutar tests — deben fallar**

Ejecutar: `npm --workspace apps/servidor run test -- almacen-tablero`
Esperado: FAIL.

- [ ] **Paso 3: Implementar `almacen/tablero.ts`**

`apps/servidor/src/almacen/tablero.ts`:

```typescript
import { readFile, readdir, rm, access } from 'node:fs/promises';
import type { Tablero, ComponenteReconciliado, ResumenTablero } from '../../../../tipos/modelo.js';
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
  await leerCliente(slugCliente); // valida que existe
  const slug = await slugDisponible(slugCliente, entrada.codigo);
  const ahora = new Date().toISOString();

  const tablero: Tablero = {
    id: nuevoId(),
    slug,
    clienteId: (await leerCliente(slugCliente)).id,
    codigo: entrada.codigo,
    nombre: entrada.nombre,
    tipo: entrada.tipo,
    ...(entrada.ubicacion !== undefined && { ubicacion: entrada.ubicacion }),
    tensionSistema: entrada.tensionSistema ?? 'pendiente',
    esquemaTierra: entrada.esquemaTierra ?? 'pendiente',
    ...(entrada.potenciaContratadaKW !== undefined && { potenciaContratadaKW: entrada.potenciaContratadaKW }),
    ...(entrada.corrienteNominalA !== undefined && { corrienteNominalA: entrada.corrienteNominalA }),
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
  foto: import('../../../../tipos/modelo.js').Foto,
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
```

- [ ] **Paso 4: Ejecutar tests**

Ejecutar: `npm --workspace apps/servidor run test -- almacen-tablero`
Esperado: 7/7 pasan.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/almacen/tablero.ts apps/servidor/tests/almacen-tablero.test.ts
git commit -m "feat(servidor): implementa almacén Tablero con CRUD y actualización de componentes"
```

---

## Tarea 7 — Endpoints CRUD `/api/clientes`

**Archivos:**
- Crear: `apps/servidor/src/rutas/clientes.ts`
- Modificar: `apps/servidor/src/app.ts`
- Crear: `apps/servidor/tests/clientes-api.test.ts`

- [ ] **Paso 1: Crear tests**

`apps/servidor/tests/clientes-api.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai') {}
  async extraer(): Promise<ExtraccionAgente> {
    return {
      calidadFoto: 'buena', problemasFoto: [],
      componentesDetectados: [], rotulacionCircuitosLeida: []
    };
  }
}

function app() {
  return crearApp({
    agenteClaude: new AgenteStub('claude'),
    agenteOpenai: new AgenteStub('openai')
  });
}

describe('API /api/clientes', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('POST crea un cliente', async () => {
    const r = await request(app()).post('/api/clientes').send({ nombre: 'Cliente Uno' });
    expect(r.status).toBe(201);
    expect(r.body.slug).toBe('cliente-uno');
  });

  it('POST rechaza body sin nombre con 400', async () => {
    const r = await request(app()).post('/api/clientes').send({ direccion: 'X' });
    expect(r.status).toBe(400);
  });

  it('GET lista clientes', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'A' });
    await request(app()).post('/api/clientes').send({ nombre: 'B' });
    const r = await request(app()).get('/api/clientes');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  it('GET por slug retorna el cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'Empresa' });
    const r = await request(app()).get('/api/clientes/empresa');
    expect(r.status).toBe(200);
    expect(r.body.nombre).toBe('Empresa');
  });

  it('GET por slug 404 si no existe', async () => {
    const r = await request(app()).get('/api/clientes/inexistente');
    expect(r.status).toBe(404);
  });

  it('PUT actualiza un cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'Empresa' });
    const r = await request(app()).put('/api/clientes/empresa').send({ direccion: 'Av. X' });
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBe('Av. X');
  });

  it('DELETE elimina un cliente', async () => {
    await request(app()).post('/api/clientes').send({ nombre: 'A eliminar' });
    const r = await request(app()).delete('/api/clientes/a-eliminar');
    expect(r.status).toBe(204);
    const post = await request(app()).get('/api/clientes/a-eliminar');
    expect(post.status).toBe(404);
  });
});
```

- [ ] **Paso 2: Crear `rutas/clientes.ts`**

`apps/servidor/src/rutas/clientes.ts`:

```typescript
import { Router } from 'express';
import { ZodError } from 'zod';
import { EsquemaClienteEntrada } from '../esquemas/cliente.js';
import {
  crearCliente,
  leerCliente,
  listarClientes,
  actualizarCliente,
  eliminarCliente
} from '../almacen/cliente.js';

export function crearRutasClientes(): Router {
  const router = Router();

  router.get('/clientes', async (_req, res) => {
    const lista = await listarClientes();
    res.json(lista);
  });

  router.post('/clientes', async (req, res) => {
    try {
      const entrada = EsquemaClienteEntrada.parse(req.body);
      const cliente = await crearCliente(entrada);
      res.status(201).json(cliente);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(500).json({ error: String(e) });
    }
  });

  router.get('/clientes/:slug', async (req, res) => {
    try {
      const cliente = await leerCliente(req.params.slug!);
      res.json(cliente);
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.slug}" no existe` });
    }
  });

  router.put('/clientes/:slug', async (req, res) => {
    try {
      const parche = EsquemaClienteEntrada.partial().parse(req.body);
      const cliente = await actualizarCliente(req.params.slug!, parche);
      res.json(cliente);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.delete('/clientes/:slug', async (req, res) => {
    try {
      await eliminarCliente(req.params.slug!);
      res.status(204).end();
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.slug}" no existe` });
    }
  });

  return router;
}
```

- [ ] **Paso 3: Modificar `app.ts` para montar las rutas**

Sobrescribir `apps/servidor/src/app.ts`:

```typescript
import express, { type Express } from 'express';
import cors from 'cors';
import { crearRutasClientes } from './rutas/clientes.js';
import type { ClienteAgenteIA } from './agentes/interfaz.js';

export interface DepsApp {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearApp(deps: DepsApp): Express {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', crearRutasClientes());

  // Las rutas de tableros (incluido /fotos) se agregan en la Tarea 8.
  void deps; // dependencias mantenidas para inyección en Tarea 8.

  return app;
}
```

- [ ] **Paso 4: Ejecutar tests**

Ejecutar: `npm --workspace apps/servidor run test -- clientes-api`
Esperado: 7/7 pasan.

- [ ] **Paso 5: Verificar que ningún test previo se rompió**

Ejecutar: `npm test`
Esperado: todos los tests del Plan 1 + Plan 2 hasta aquí pasan. (Nota: el test `extraer.test.ts` del Plan 1 quedará obsoleto en Tarea 8; por ahora todavía pasa porque `/api/extract` no se ha eliminado.)

Hmm — espera. La ruta `/api/extract` la montaba `crearApp` del Plan 1. Al sobrescribir `app.ts` para no llamar a `crearRutaExtraer`, el test `extraer.test.ts` empezará a fallar. Eliminar ese test ya, anticipando la Tarea 8:

```bash
rm apps/servidor/tests/extraer.test.ts
rm apps/servidor/src/rutas/extraer.ts
```

Volver a ejecutar `npm test`. Esperado: solo los tests vigentes pasan.

- [ ] **Paso 6: Commit**

```bash
git add apps/servidor/src/rutas/clientes.ts apps/servidor/src/app.ts apps/servidor/tests/clientes-api.test.ts
git rm apps/servidor/tests/extraer.test.ts apps/servidor/src/rutas/extraer.ts
git commit -m "feat(servidor): endpoints CRUD /api/clientes; remueve /api/extract del Plan 1"
```

---

## Tarea 8 — Endpoints `/api/clientes/:c/tableros` con persistencia de fotos

**Archivos:**
- Crear: `apps/servidor/src/rutas/tableros.ts`
- Modificar: `apps/servidor/src/app.ts`
- Crear: `apps/servidor/tests/tableros-api.test.ts`

Este endpoint **reemplaza** al `/api/extract` del Plan 1: cuando se sube una foto, además de procesarla con los agentes y reconciliarla, se guarda en disco y se fusiona con los componentes existentes del tablero.

- [ ] **Paso 1: Crear tests**

`apps/servidor/tests/tableros-api.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from '../src/app.js';
import { crearDirTemporal, eliminarDirTemporal } from './helpers/dir-temporal.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8'));
}

class AgenteStub implements ClienteAgenteIA {
  constructor(public readonly nombre: 'claude' | 'openai', private respuesta: ExtraccionAgente) {}
  async extraer(): Promise<ExtraccionAgente> { return this.respuesta; }
}

function app() {
  return crearApp({
    agenteClaude: new AgenteStub('claude', cargarFixture('claude-foto-01.json')),
    agenteOpenai: new AgenteStub('openai', cargarFixture('openai-foto-01.json'))
  });
}

describe('API /api/clientes/:c/tableros', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    await request(app()).post('/api/clientes').send({ nombre: 'Cliente Uno' });
  });
  afterEach(async () => {
    delete process.env.DIRECTORIO_PROYECTOS;
    await eliminarDirTemporal(dir);
  });

  it('POST crea un tablero del cliente', async () => {
    const r = await request(app())
      .post('/api/clientes/cliente-uno/tableros')
      .send({ codigo: 'TG', nombre: 'Tablero General', tipo: 'general' });
    expect(r.status).toBe(201);
    expect(r.body.slug).toBe('tg');
  });

  it('GET lista tableros del cliente', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TD-1', nombre: 'TD-1', tipo: 'distribucion' });
    const r = await request(app()).get('/api/clientes/cliente-uno/tableros');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  it('POST foto procesa con agentes y persiste componentes en el tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const r = await request(app())
      .post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'tablero.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(200);
    expect(r.body.fotos).toHaveLength(1);
    expect(r.body.componentes.length).toBeGreaterThan(0);
  });

  it('POST foto rechaza si excede 20 fotos', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    // Subir 20 fotos
    for (let i = 0; i < 20; i++) {
      await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
        .attach('foto', buffer, { filename: `f${i}.jpg`, contentType: 'image/jpeg' });
    }
    // La 21 debe ser rechazada
    const r = await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'extra.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(409);
  });

  it('PUT actualiza datos del tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const r = await request(app()).put('/api/clientes/cliente-uno/tableros/tg')
      .send({ tensionSistema: '220V-mono', esquemaTierra: 'TT' });
    expect(r.status).toBe(200);
    expect(r.body.tensionSistema).toBe('220V-mono');
  });

  it('PATCH actualiza un componente individual', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const r1 = await request(app()).post('/api/clientes/cliente-uno/tableros/tg/fotos')
      .attach('foto', buffer, { filename: 'f.jpg', contentType: 'image/jpeg' });
    const componenteId = r1.body.componentes[0].id;

    const r2 = await request(app())
      .patch(`/api/clientes/cliente-uno/tableros/tg/componentes/${componenteId}`)
      .send({ calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } });
    expect(r2.status).toBe(200);
    const comp = r2.body.componentes.find((c: { id: string }) => c.id === componenteId);
    expect(comp.calibreA).toBe(25);
    expect(comp.procedencia.fuente).toBe('manual');
  });

  it('DELETE elimina un tablero', async () => {
    await request(app()).post('/api/clientes/cliente-uno/tableros').send({ codigo: 'TG', nombre: 'TG', tipo: 'general' });
    const r = await request(app()).delete('/api/clientes/cliente-uno/tableros/tg');
    expect(r.status).toBe(204);
  });
});
```

- [ ] **Paso 2: Crear `rutas/tableros.ts`**

`apps/servidor/src/rutas/tableros.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  EsquemaTableroEntrada,
  EsquemaTableroActualizacion,
  EsquemaComponenteActualizacion
} from '../esquemas/tablero.js';
import {
  crearTablero,
  leerTablero,
  listarTableros,
  actualizarTablero,
  eliminarTablero,
  agregarFotoYComponentes,
  actualizarComponente
} from '../almacen/tablero.js';
import { reconciliar } from '../agentes/reconciliador.js';
import { dirFotos, archivoFoto, dirExtracciones, archivoExtraccion } from '../almacen/rutas.js';
import { escribirJsonAtomico } from '../almacen/escritura.js';
import { nuevoId } from '../util/ulid.js';
import type { ClienteAgenteIA } from '../agentes/interfaz.js';
import type { Foto } from '../../../../tipos/modelo.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const MAX_FOTOS_POR_TABLERO = 20;

interface Deps {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearRutasTableros(deps: Deps): Router {
  const router = Router();

  router.get('/clientes/:c/tableros', async (req, res) => {
    try {
      const tableros = await listarTableros(req.params.c!);
      res.json(tableros);
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.c}" no existe` });
    }
  });

  router.post('/clientes/:c/tableros', async (req, res) => {
    try {
      const entrada = EsquemaTableroEntrada.parse(req.body);
      const tablero = await crearTablero(req.params.c!, entrada);
      res.status(201).json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.get('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      res.json(tablero);
    } catch {
      res.status(404).json({ error: `Tablero no encontrado` });
    }
  });

  router.put('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      const parche = EsquemaTableroActualizacion.parse(req.body);
      const tablero = await actualizarTablero(req.params.c!, req.params.t!, parche);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.delete('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      await eliminarTablero(req.params.c!, req.params.t!);
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Tablero no encontrado' });
    }
  });

  router.post('/clientes/:c/tableros/:t/fotos', upload.single('foto'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Falta el archivo "foto"' });
      return;
    }
    const { c, t } = req.params;

    let tablero;
    try {
      tablero = await leerTablero(c!, t!);
    } catch {
      res.status(404).json({ error: 'Tablero no encontrado' });
      return;
    }

    if (tablero.fotos.length >= MAX_FOTOS_POR_TABLERO) {
      res.status(409).json({ error: `Límite de ${MAX_FOTOS_POR_TABLERO} fotos por tablero alcanzado` });
      return;
    }

    const fotoId = nuevoId();
    const ext = extname(req.file.originalname).slice(1).toLowerCase() || 'jpg';

    // Guardar la foto en disco
    await mkdir(dirFotos(c!, t!), { recursive: true });
    await writeFile(archivoFoto(c!, t!, fotoId, ext), req.file.buffer);

    // Procesar con agentes
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    const [claudeRes, openaiRes] = await Promise.allSettled([
      deps.agenteClaude.extraer(base64, mime),
      deps.agenteOpenai.extraer(base64, mime)
    ]);

    if (claudeRes.status === 'rejected' && openaiRes.status === 'rejected') {
      res.status(502).json({
        error: 'Ambos agentes fallaron',
        claude: String(claudeRes.reason),
        openai: String(openaiRes.reason)
      });
      return;
    }

    const claudeExtraccion = claudeRes.status === 'fulfilled' ? claudeRes.value : {
      calidadFoto: 'aceptable' as const,
      problemasFoto: ['Claude falló en esta foto'],
      componentesDetectados: [],
      rotulacionCircuitosLeida: []
    };
    const openaiExtraccion = openaiRes.status === 'fulfilled' ? openaiRes.value : {
      calidadFoto: 'aceptable' as const,
      problemasFoto: ['OpenAI falló en esta foto'],
      componentesDetectados: [],
      rotulacionCircuitosLeida: []
    };

    // Guardar extracciones crudas (auditoría)
    await mkdir(dirExtracciones(c!, t!), { recursive: true });
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'claude'), claudeExtraccion);
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'openai'), openaiExtraccion);

    const reconciliado = reconciliar({
      fotoId,
      extraccionClaude: claudeExtraccion,
      extraccionOpenai: openaiExtraccion
    });
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'reconciliado'), reconciliado);

    // Registrar la foto en el tablero junto con sus componentes (escritura atómica).
    const nuevaFoto: Foto = {
      id: fotoId,
      nombreOriginal: req.file.originalname,
      mimeType: mime,
      calidadFoto: reconciliado.calidadFoto,
      problemasFoto: reconciliado.problemasFoto,
      subidaEn: new Date().toISOString()
    };
    const tableroFinal = await agregarFotoYComponentes(c!, t!, nuevaFoto, reconciliado.componentes);
    res.json(tableroFinal);
  });

  router.patch('/clientes/:c/tableros/:t/componentes/:id', async (req, res) => {
    try {
      const parche = EsquemaComponenteActualizacion.parse(req.body);
      const tablero = await actualizarComponente(req.params.c!, req.params.t!, req.params.id!, parche);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
```

- [ ] **Paso 3: Modificar `app.ts` para montar rutas de tableros**

Actualizar `apps/servidor/src/app.ts`:

```typescript
import express, { type Express } from 'express';
import cors from 'cors';
import { crearRutasClientes } from './rutas/clientes.js';
import { crearRutasTableros } from './rutas/tableros.js';
import type { ClienteAgenteIA } from './agentes/interfaz.js';

export interface DepsApp {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearApp(deps: DepsApp): Express {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', crearRutasClientes());
  app.use('/api', crearRutasTableros({
    agenteClaude: deps.agenteClaude,
    agenteOpenai: deps.agenteOpenai
  }));

  return app;
}
```

- [ ] **Paso 4: Ejecutar tests**

Ejecutar: `npm test`
Esperado: todos los tests del Plan 2 (cliente + tablero + completitud + util + reconciliador + clientes-api + tableros-api) pasan. Total aprox: 8 + 7 + 6 + 5 + 8 + 7 + 7 ≈ 48 tests.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/rutas/tableros.ts apps/servidor/src/app.ts apps/servidor/tests/tableros-api.test.ts
git commit -m "feat(servidor): endpoints CRUD de tableros + subida persistente de fotos"
```

---

## Tarea 9 — Setup React Router en el frontend

**Archivos:**
- Modificar: `apps/web/package.json`
- Modificar: `apps/web/src/App.tsx`

- [ ] **Paso 1: Agregar `react-router-dom` a dependencias**

Editar `apps/web/package.json`, agregar `"react-router-dom": "^6.26.0"` en `dependencies`:

```json
{
  "name": "@diagramas/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Paso 2: Instalar**

Ejecutar desde la raíz: `npm install`
Esperado: instala `react-router-dom` sin errores.

- [ ] **Paso 3: Crear placeholder de pantallas**

`apps/web/src/pantallas/ListaClientes.tsx`:

```typescript
export function ListaClientes() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Clientes (placeholder)</h1></div>;
}
```

`apps/web/src/pantallas/WorkspaceTablero.tsx`:

```typescript
import { useParams } from 'react-router-dom';

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Workspace (placeholder)</h1>
      <p className="text-slate-600">Cliente: {clienteSlug} / Tablero: {tableroSlug}</p>
    </div>
  );
}
```

- [ ] **Paso 4: Sobrescribir `App.tsx` con el router**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ListaClientes } from './pantallas/ListaClientes.js';
import { WorkspaceTablero } from './pantallas/WorkspaceTablero.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/clientes" replace />} />
        <Route path="/clientes" element={<ListaClientes />} />
        <Route path="/clientes/:clienteSlug/tableros/:tableroSlug" element={<WorkspaceTablero />} />
        <Route path="*" element={<Navigate to="/clientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Paso 5: Eliminar el viejo `extraccionStore` y limpiar imports rotos**

```bash
rm apps/web/src/estado/extraccionStore.ts
rm apps/web/src/api/cliente.ts
```

(Ambos van a ser reemplazados — Tarea 10 los recrea con la API completa.)

- [ ] **Paso 6: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 7: Verificar que arranca y navega**

`npm run dev:web`, abrir `http://localhost:5173`. Esperado: redirige a `/clientes` y muestra el placeholder.

- [ ] **Paso 8: Commit**

```bash
git add apps/web/package.json apps/web/src/ package-lock.json
git rm apps/web/src/estado/extraccionStore.ts apps/web/src/api/cliente.ts 2>/dev/null || true
git commit -m "feat(web): instala react-router-dom y pantallas placeholder"
```

---

## Tarea 10 — Cliente HTTP completo y stores Zustand

**Archivos:**
- Crear: `apps/web/src/api/cliente.ts`
- Crear: `apps/web/src/estado/clienteStore.ts`
- Crear: `apps/web/src/estado/tableroStore.ts`

- [ ] **Paso 1: Crear el cliente HTTP completo**

`apps/web/src/api/cliente.ts`:

```typescript
import type { Cliente, Tablero } from '@tipos/modelo';

async function pedir<T>(metodo: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
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
  actualizar: (slug: string, datos: Partial<{ nombre: string; rut: string; direccion: string; contactoNombre: string; contactoTelefono: string; contactoEmail: string }>) =>
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
  actualizar: (clienteSlug: string, tableroSlug: string, datos: Partial<{ tensionSistema: string; esquemaTierra: string; potenciaContratadaKW: number; corrienteNominalA: number; ubicacion: string; nombre: string; codigo: string; tipo: string }>) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}`, datos),
  eliminar: (clienteSlug: string, tableroSlug: string) =>
    pedir<void>('DELETE', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}`),

  subirFoto: async (clienteSlug: string, tableroSlug: string, archivo: File): Promise<Tablero> => {
    const fd = new FormData();
    fd.append('foto', archivo);
    const r = await fetch(`/api/clientes/${clienteSlug}/tableros/${tableroSlug}/fotos`, {
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
    pedir<Tablero>('PATCH', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/componentes/${componenteId}`, datos)
};
```

- [ ] **Paso 2: Crear `clienteStore.ts`**

`apps/web/src/estado/clienteStore.ts`:

```typescript
import { create } from 'zustand';
import type { Cliente } from '@tipos/modelo';
import { apiClientes } from '../api/cliente.js';

interface ClienteStore {
  clientes: Cliente[];
  cargando: boolean;
  error: string | null;
  cargarTodos(): Promise<void>;
  crear(datos: { nombre: string; rut?: string; direccion?: string; contactoNombre?: string; contactoTelefono?: string; contactoEmail?: string }): Promise<Cliente>;
  actualizar(slug: string, datos: Partial<{ nombre: string; rut: string; direccion: string; contactoNombre: string; contactoTelefono: string; contactoEmail: string }>): Promise<void>;
  eliminar(slug: string): Promise<void>;
}

export const useClienteStore = create<ClienteStore>((set, get) => ({
  clientes: [],
  cargando: false,
  error: null,

  async cargarTodos() {
    set({ cargando: true, error: null });
    try {
      const clientes = await apiClientes.listar();
      set({ clientes, cargando: false });
    } catch (e) {
      set({ error: (e as Error).message, cargando: false });
    }
  },

  async crear(datos) {
    const nuevo = await apiClientes.crear(datos);
    set({ clientes: [...get().clientes, nuevo] });
    return nuevo;
  },

  async actualizar(slug, datos) {
    const actualizado = await apiClientes.actualizar(slug, datos);
    set({
      clientes: get().clientes.map(c => c.slug === slug ? actualizado : c)
    });
  },

  async eliminar(slug) {
    await apiClientes.eliminar(slug);
    set({ clientes: get().clientes.filter(c => c.slug !== slug) });
  }
}));
```

- [ ] **Paso 3: Crear `tableroStore.ts`**

`apps/web/src/estado/tableroStore.ts`:

```typescript
import { create } from 'zustand';
import type { Tablero } from '@tipos/modelo';
import { apiTableros } from '../api/cliente.js';

interface TableroStore {
  tablero: Tablero | null;
  cargando: boolean;
  subiendoFoto: boolean;
  error: string | null;

  cargar(clienteSlug: string, tableroSlug: string): Promise<void>;
  actualizarDatos(clienteSlug: string, tableroSlug: string, datos: Parameters<typeof apiTableros.actualizar>[2]): Promise<void>;
  subirFoto(clienteSlug: string, tableroSlug: string, archivo: File): Promise<void>;
  actualizarComponente(clienteSlug: string, tableroSlug: string, componenteId: string, datos: unknown): Promise<void>;
  limpiar(): void;
}

export const useTableroStore = create<TableroStore>(set => ({
  tablero: null,
  cargando: false,
  subiendoFoto: false,
  error: null,

  async cargar(clienteSlug, tableroSlug) {
    set({ cargando: true, error: null });
    try {
      const tablero = await apiTableros.leer(clienteSlug, tableroSlug);
      set({ tablero, cargando: false });
    } catch (e) {
      set({ error: (e as Error).message, cargando: false });
    }
  },

  async actualizarDatos(clienteSlug, tableroSlug, datos) {
    const tablero = await apiTableros.actualizar(clienteSlug, tableroSlug, datos);
    set({ tablero });
  },

  async subirFoto(clienteSlug, tableroSlug, archivo) {
    set({ subiendoFoto: true, error: null });
    try {
      const tablero = await apiTableros.subirFoto(clienteSlug, tableroSlug, archivo);
      set({ tablero, subiendoFoto: false });
    } catch (e) {
      set({ error: (e as Error).message, subiendoFoto: false });
    }
  },

  async actualizarComponente(clienteSlug, tableroSlug, componenteId, datos) {
    const tablero = await apiTableros.actualizarComponente(clienteSlug, tableroSlug, componenteId, datos);
    set({ tablero });
  },

  limpiar() {
    set({ tablero: null, cargando: false, subiendoFoto: false, error: null });
  }
}));
```

- [ ] **Paso 4: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/api/cliente.ts apps/web/src/estado/
git commit -m "feat(web): API cliente completa y stores de cliente/tablero"
```

---

## Tarea 11 — Pantalla `ListaClientes` con diálogo de creación/edición

**Archivos:**
- Crear: `apps/web/src/componentes/DialogoCliente.tsx`
- Modificar: `apps/web/src/pantallas/ListaClientes.tsx`

- [ ] **Paso 1: Crear el diálogo de cliente**

`apps/web/src/componentes/DialogoCliente.tsx`:

```typescript
import { useState, useEffect } from 'react';
import type { Cliente } from '@tipos/modelo';

interface Props {
  abierto: boolean;
  clienteExistente?: Cliente;
  onCerrar(): void;
  onGuardar(datos: { nombre: string; rut?: string; direccion?: string; contactoNombre?: string; contactoTelefono?: string; contactoEmail?: string }): Promise<void>;
}

export function DialogoCliente({ abierto, clienteExistente, onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setNombre(clienteExistente?.nombre ?? '');
      setRut(clienteExistente?.rut ?? '');
      setDireccion(clienteExistente?.direccion ?? '');
      setContactoNombre(clienteExistente?.contactoNombre ?? '');
      setContactoTelefono(clienteExistente?.contactoTelefono ?? '');
      setContactoEmail(clienteExistente?.contactoEmail ?? '');
      setError(null);
    }
  }, [abierto, clienteExistente]);

  if (!abierto) return null;

  async function alGuardar() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        ...(rut.trim() && { rut: rut.trim() }),
        ...(direccion.trim() && { direccion: direccion.trim() }),
        ...(contactoNombre.trim() && { contactoNombre: contactoNombre.trim() }),
        ...(contactoTelefono.trim() && { contactoTelefono: contactoTelefono.trim() }),
        ...(contactoEmail.trim() && { contactoEmail: contactoEmail.trim() })
      });
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">
          {clienteExistente ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>

        <div className="space-y-3">
          <Campo etiqueta="Nombre *" valor={nombre} alCambiar={setNombre} />
          <Campo etiqueta="RUT" valor={rut} alCambiar={setRut} />
          <Campo etiqueta="Dirección" valor={direccion} alCambiar={setDireccion} />
          <Campo etiqueta="Contacto — nombre" valor={contactoNombre} alCambiar={setContactoNombre} />
          <Campo etiqueta="Contacto — teléfono" valor={contactoTelefono} alCambiar={setContactoTelefono} />
          <Campo etiqueta="Contacto — email" valor={contactoEmail} alCambiar={setContactoEmail} tipo="email" />
        </div>

        {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCerrar} disabled={guardando}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cancelar</button>
          <button onClick={alGuardar} disabled={guardando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, alCambiar, tipo = 'text' }: {
  etiqueta: string; valor: string; alCambiar: (v: string) => void; tipo?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={e => alCambiar(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
```

- [ ] **Paso 2: Reescribir `ListaClientes.tsx`**

`apps/web/src/pantallas/ListaClientes.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClienteStore } from '../estado/clienteStore.js';
import { DialogoCliente } from '../componentes/DialogoCliente.js';
import type { Cliente } from '@tipos/modelo';

export function ListaClientes() {
  const { clientes, cargando, error, cargarTodos, crear, actualizar, eliminar } = useClienteStore();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | undefined>();

  useEffect(() => {
    cargarTodos();
  }, [cargarTodos]);

  function alAbrirNuevo() {
    setEditando(undefined);
    setDialogoAbierto(true);
  }

  function alAbrirEditar(c: Cliente) {
    setEditando(c);
    setDialogoAbierto(true);
  }

  async function alGuardar(datos: Parameters<typeof crear>[0]) {
    if (editando) {
      await actualizar(editando.slug, datos);
    } else {
      await crear(datos);
    }
  }

  async function alEliminar(c: Cliente) {
    if (!confirm(`¿Eliminar cliente "${c.nombre}"? Esta acción borra también todos sus tableros.`)) return;
    try {
      await eliminar(c.slug);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button onClick={alAbrirNuevo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          + Nuevo cliente
        </button>
      </header>

      {cargando && <div className="text-slate-500">Cargando...</div>}
      {error && <div className="bg-red-50 border border-red-200 p-4 rounded text-red-900 mb-4">{error}</div>}

      {!cargando && clientes.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded p-8 text-center text-slate-600">
          No hay clientes todavía. Crea el primero con "Nuevo cliente".
        </div>
      )}

      <div className="space-y-3">
        {clientes.map(c => (
          <article key={c.id} className="bg-white rounded-lg shadow p-5">
            <header className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{c.nombre}</h2>
                {c.direccion && <p className="text-sm text-slate-600">{c.direccion}</p>}
                <p className="text-sm text-slate-500 mt-1">
                  {c.tableros.length} tablero{c.tableros.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => alAbrirEditar(c)} className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => alEliminar(c)} className="text-red-600 hover:underline text-sm">Eliminar</button>
              </div>
            </header>

            {c.tableros.length > 0 && (
              <ul className="mt-3 space-y-1">
                {c.tableros.map(t => (
                  <li key={t.id} className="flex items-center justify-between border-t pt-2">
                    <Link to={`/clientes/${c.slug}/tableros/${t.codigo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      className="text-blue-700 hover:underline">
                      {t.codigo}
                    </Link>
                    <span className="text-sm text-slate-600">
                      Completitud: {t.porcentajeCompletitud}%
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <Link to={`/clientes/${c.slug}/nuevo-tablero`} className="text-sm text-blue-600 hover:underline">
                + Agregar tablero
              </Link>
            </div>
          </article>
        ))}
      </div>

      <DialogoCliente
        abierto={dialogoAbierto}
        clienteExistente={editando}
        onCerrar={() => setDialogoAbierto(false)}
        onGuardar={alGuardar}
      />
    </div>
  );
}
```

**Nota sobre el link a tablero:** el cálculo del slug del tablero en el frontend (`codigo.toLowerCase().replace(...)`) es una aproximación; el slug real lo da el backend al crear. Mientras tanto, esto sirve cuando el slug derivado del código coincide con el slug del backend (caso típico — códigos como "TG" → `tg`, "TD-1" → `td-1`). Cuando no coincida, el endpoint del backend devolverá 404 y el frontend mostrará el error. Esta limitación se resuelve en Plan 5 cuando ya cargamos los tableros del cliente con su slug real.

- [ ] **Paso 3: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 4: Verificación visual rápida**

Ejecutar: `npm run dev`. Abrir `http://localhost:5173`. Crear un cliente. Verificar que aparece en la lista. Editar. Eliminar.

(Requiere que el backend esté arriba, lo que requiere `.env` con claves. Si no hay claves, el backend sale con error — los CRUD de cliente NO necesitan claves, así que se puede modificar temporalmente `index.ts` para no exigirlas mientras se prueba este paso, o simplemente saltar esta verificación visual y dejarla para la Tarea 17.)

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/pantallas/ListaClientes.tsx apps/web/src/componentes/DialogoCliente.tsx
git commit -m "feat(web): pantalla ListaClientes con CRUD vía diálogo"
```

---

## Tarea 12 — Diálogo y pantalla "Nuevo tablero"

**Archivos:**
- Crear: `apps/web/src/componentes/DialogoTablero.tsx`
- Crear: `apps/web/src/pantallas/NuevoTablero.tsx`
- Modificar: `apps/web/src/App.tsx`

- [ ] **Paso 1: Crear `DialogoTablero.tsx`**

`apps/web/src/componentes/DialogoTablero.tsx`:

```typescript
import { useState } from 'react';
import type { TipoTablero } from '@tipos/modelo';

interface Props {
  onGuardar(datos: { codigo: string; nombre: string; tipo: TipoTablero; ubicacion?: string }): Promise<void>;
  onCancelar(): void;
}

const TIPOS: { valor: TipoTablero; etiqueta: string }[] = [
  { valor: 'general', etiqueta: 'Tablero general (TG)' },
  { valor: 'distribucion', etiqueta: 'Tablero de distribución (TD)' },
  { valor: 'comando', etiqueta: 'Tablero de comando' },
  { valor: 'otro', etiqueta: 'Otro' }
];

export function DialogoTablero({ onGuardar, onCancelar }: Props) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoTablero>('general');
  const [ubicacion, setUbicacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alGuardar() {
    if (!codigo.trim() || !nombre.trim()) {
      setError('Código y nombre son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo,
        ...(ubicacion.trim() && { ubicacion: ubicacion.trim() })
      });
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl">
      <h3 className="text-xl font-semibold mb-4">Nuevo tablero</h3>

      <div className="space-y-3">
        <Campo etiqueta="Código *  (ej: TG, TD-1, TD-Cocina)" valor={codigo} alCambiar={setCodigo} />
        <Campo etiqueta="Nombre / descripción *" valor={nombre} alCambiar={setNombre} />
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoTablero)}
            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </label>
        <Campo etiqueta="Ubicación (opcional)" valor={ubicacion} alCambiar={setUbicacion} />
      </div>

      {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancelar} disabled={guardando}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cancelar</button>
        <button onClick={alGuardar} disabled={guardando}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
          {guardando ? 'Creando...' : 'Crear tablero'}
        </button>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{etiqueta}</span>
      <input value={valor} onChange={e => alCambiar(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}
```

- [ ] **Paso 2: Crear `NuevoTablero.tsx`**

`apps/web/src/pantallas/NuevoTablero.tsx`:

```typescript
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiTableros } from '../api/cliente.js';
import { DialogoTablero } from '../componentes/DialogoTablero.js';

export function NuevoTablero() {
  const { clienteSlug } = useParams();
  const navigate = useNavigate();

  async function alGuardar(datos: Parameters<typeof apiTableros.crear>[1]) {
    const t = await apiTableros.crear(clienteSlug!, datos);
    navigate(`/clientes/${clienteSlug}/tableros/${t.slug}`);
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Volver a clientes</Link>
        <h1 className="text-3xl font-bold mt-2">Nuevo tablero — {clienteSlug}</h1>
      </header>
      <DialogoTablero onGuardar={alGuardar} onCancelar={() => navigate('/clientes')} />
    </div>
  );
}
```

- [ ] **Paso 3: Agregar ruta en `App.tsx`**

Modificar `apps/web/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ListaClientes } from './pantallas/ListaClientes.js';
import { WorkspaceTablero } from './pantallas/WorkspaceTablero.js';
import { NuevoTablero } from './pantallas/NuevoTablero.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/clientes" replace />} />
        <Route path="/clientes" element={<ListaClientes />} />
        <Route path="/clientes/:clienteSlug/nuevo-tablero" element={<NuevoTablero />} />
        <Route path="/clientes/:clienteSlug/tableros/:tableroSlug" element={<WorkspaceTablero />} />
        <Route path="*" element={<Navigate to="/clientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Paso 4: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/componentes/DialogoTablero.tsx apps/web/src/pantallas/NuevoTablero.tsx apps/web/src/App.tsx
git commit -m "feat(web): diálogo y pantalla para crear tableros"
```

---

## Tarea 13 — Workspace del tablero — estructura general + BarraCompletitud

**Archivos:**
- Crear: `apps/web/src/componentes/BarraCompletitud.tsx`
- Reescribir: `apps/web/src/pantallas/WorkspaceTablero.tsx`

- [ ] **Paso 1: Crear `BarraCompletitud.tsx`**

`apps/web/src/componentes/BarraCompletitud.tsx`:

```typescript
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

export function BarraCompletitud({ tablero }: Props) {
  const pct = tablero.porcentajeCompletitud;
  const pendientesNoResueltos = tablero.pendientes.filter(p => !p.resueltoEn).length;
  const discrepancias = tablero.componentes.filter(c => c.procedencia.confianza === 'discrepancia').length;

  const colorBarra = pct < 50 ? 'bg-red-500' : pct < 90 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold">{tablero.codigo} — {tablero.nombre}</h1>
          <p className="text-xs text-slate-500">{tablero.tipo} · {tablero.ubicacion ?? 'sin ubicación'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{pct}%</div>
          <div className="text-xs text-slate-500">
            {pendientesNoResueltos} pendiente{pendientesNoResueltos === 1 ? '' : 's'} · {discrepancias} discrepancia{discrepancias === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
        <div className={`h-full transition-all ${colorBarra}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Reescribir `WorkspaceTablero.tsx`**

`apps/web/src/pantallas/WorkspaceTablero.tsx`:

```typescript
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTableroStore } from '../estado/tableroStore.js';
import { BarraCompletitud } from '../componentes/BarraCompletitud.js';
import { PanelFotos } from '../componentes/PanelFotos.js';
import { PanelComponentes } from '../componentes/PanelComponentes.js';
import { PanelPendientes } from '../componentes/PanelPendientes.js';

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  const { tablero, cargando, error, cargar, limpiar } = useTableroStore();

  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  if (cargando) return <div className="p-8 text-slate-500">Cargando tablero...</div>;
  if (error) return (
    <div className="p-8">
      <Link to="/clientes" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded text-red-900">{error}</div>
    </div>
  );
  if (!tablero) return null;

  return (
    <div className="min-h-full flex flex-col">
      <BarraCompletitud tablero={tablero} />
      <div className="px-6 py-2">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Lista de clientes</Link>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-6">
        <div className="col-span-3">
          <PanelFotos tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-5">
          <PanelComponentes tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-4">
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded p-6 h-full text-center text-slate-500">
            Diagrama unilineal — se construye en el Plan 3.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-6">
          <PanelPendientes tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-6">
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded p-4 text-center text-slate-500">
            Hallazgos RIC — se construyen en el Plan 4.
          </div>
        </div>
      </div>
    </div>
  );
}
```

(Las importaciones de `PanelFotos`, `PanelComponentes`, `PanelPendientes` van a fallar hasta crearlos en las próximas tareas — eso es esperado en TDD top-down. Compilará al terminar Tarea 16.)

- [ ] **Paso 3: NO hacer commit todavía**

Las importaciones de los paneles aún no existen. Avanzamos a las próximas tareas y commiteamos al final de la Tarea 16.

---

## Tarea 14 — `PanelFotos` con subida múltiple

**Archivos:**
- Crear: `apps/web/src/componentes/PanelFotos.tsx`

- [ ] **Paso 1: Crear `PanelFotos.tsx`**

`apps/web/src/componentes/PanelFotos.tsx`:

```typescript
import { useRef } from 'react';
import type { Tablero } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const MAX_FOTOS = 20;

export function PanelFotos({ tablero, clienteSlug, tableroSlug }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { subiendoFoto, subirFoto, error } = useTableroStore();

  const restantes = MAX_FOTOS - tablero.fotos.length;

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    for (const archivo of archivos) {
      if (tablero.fotos.length + archivos.indexOf(archivo) >= MAX_FOTOS) break;
      await subirFoto(clienteSlug, tableroSlug, archivo);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="bg-white rounded-lg shadow flex flex-col h-full">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold">Fotos ({tablero.fotos.length}/{MAX_FOTOS})</h2>
      </header>

      <div className="p-4 flex-1 overflow-auto space-y-2">
        {tablero.fotos.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6">
            Sin fotos todavía. Sube la primera foto del tablero.
          </div>
        )}
        {tablero.fotos.map(f => (
          <div key={f.id} className="border border-slate-200 rounded p-2 text-sm">
            <div className="font-medium truncate">{f.nombreOriginal}</div>
            <div className="text-xs text-slate-500">
              Calidad: <span className={claseCalidad(f.calidadFoto)}>{f.calidadFoto}</span>
            </div>
            {f.problemasFoto.length > 0 && (
              <ul className="text-xs text-orange-700 mt-1 list-disc ml-4">
                {f.problemasFoto.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      <footer className="border-t p-3">
        {subiendoFoto && (
          <div className="text-sm text-blue-700 mb-2">Procesando foto... (10-30s)</div>
        )}
        {error && (
          <div className="text-sm text-red-700 mb-2">{error}</div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={alSeleccionar}
          disabled={subiendoFoto || restantes <= 0}
          className="block w-full text-sm"
        />
        {restantes <= 0 && (
          <div className="text-xs text-orange-700 mt-1">Límite de {MAX_FOTOS} fotos alcanzado.</div>
        )}
      </footer>
    </section>
  );
}

function claseCalidad(c: string): string {
  switch (c) {
    case 'buena': return 'text-green-700';
    case 'aceptable': return 'text-yellow-700';
    case 'mala': return 'text-red-700';
    default: return '';
  }
}
```

- [ ] **Paso 2: Verificar compilación parcial**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: errores en `WorkspaceTablero.tsx` por los componentes que todavía no existen (`PanelComponentes`, `PanelPendientes`). El `PanelFotos` mismo compila.

---

## Tarea 15 — `PanelComponentes` + `ResolverDiscrepancia`

**Archivos:**
- Crear: `apps/web/src/componentes/ResolverDiscrepancia.tsx`
- Crear: `apps/web/src/componentes/PanelComponentes.tsx`

- [ ] **Paso 1: Crear `ResolverDiscrepancia.tsx`**

`apps/web/src/componentes/ResolverDiscrepancia.tsx`:

```typescript
import { useState } from 'react';
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  componente: ComponenteReconciliado;
  onCerrar(): void;
  onResolver(valoresElegidos: Partial<ComponenteReconciliado>): Promise<void>;
}

// Parsea la nota "Claude leyó X, OpenAI leyó Y" para mostrar las dos opciones.
function parsearDiscrepancia(notas: string | undefined): { claude?: string; openai?: string } {
  if (!notas) return {};
  const m = notas.match(/Claude leyó (.+?), OpenAI leyó (.+?)(?:$| ·)/);
  if (!m) return {};
  return { claude: m[1], openai: m[2] };
}

export function ResolverDiscrepancia({ componente, onCerrar, onResolver }: Props) {
  const partes = (componente.procedencia.notas ?? '').split(' · ');
  const [eligiendo, setEligiendo] = useState(false);

  async function elegir(fuente: 'foto-claude' | 'foto-openai' | 'manual', valorManual?: { calibreA?: number }) {
    setEligiendo(true);
    await onResolver({
      ...valorManual,
      procedencia: {
        ...componente.procedencia,
        fuente,
        confianza: 'alta',
        notas: `Resuelto manualmente desde: ${componente.procedencia.notas}`
      }
    });
    setEligiendo(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-2">Resolver discrepancia</h3>
        <p className="text-sm text-slate-600 mb-4">
          Componente: <strong>{componente.tipo}</strong> · ID {componente.id.substring(0, 8)}
        </p>

        <div className="space-y-2 mb-4">
          {partes.map((p, i) => {
            const dis = parsearDiscrepancia(p);
            if (!dis.claude && !dis.openai) {
              return <div key={i} className="text-sm text-slate-600">{p}</div>;
            }
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                <button onClick={() => elegir('foto-claude')} disabled={eligiendo}
                  className="border border-slate-300 rounded p-3 text-left hover:bg-blue-50">
                  <div className="text-xs text-slate-500">Claude</div>
                  <div className="font-mono">{dis.claude}</div>
                </button>
                <button onClick={() => elegir('foto-openai')} disabled={eligiendo}
                  className="border border-slate-300 rounded p-3 text-left hover:bg-blue-50">
                  <div className="text-xs text-slate-500">OpenAI</div>
                  <div className="font-mono">{dis.openai}</div>
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Si ninguna lectura es correcta, edita el componente manualmente desde el panel central.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onCerrar} disabled={eligiendo}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Crear `PanelComponentes.tsx`**

`apps/web/src/componentes/PanelComponentes.tsx`:

```typescript
import { useState } from 'react';
import type { Tablero, ComponenteReconciliado } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';
import { ResolverDiscrepancia } from './ResolverDiscrepancia.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function PanelComponentes({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarComponente } = useTableroStore();
  const [resolviendo, setResolviendo] = useState<ComponenteReconciliado | null>(null);

  return (
    <section className="bg-white rounded-lg shadow flex flex-col h-full">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">Componentes y circuitos ({tablero.componentes.length})</h2>
      </header>

      <div className="flex-1 overflow-auto">
        {tablero.componentes.length === 0 && (
          <div className="p-8 text-sm text-slate-500 text-center">
            Sin componentes todavía. Sube una foto del tablero para empezar.
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Calibre</th>
              <th className="px-3 py-2">Marca/Modelo</th>
              <th className="px-3 py-2">Confianza</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tablero.componentes.map(c => (
              <tr key={c.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{c.tipo}</td>
                <td className="px-3 py-2">{c.calibreA ? `${c.calibreA} A` : '—'}{c.polos ? ` · ${c.polos}P` : ''}</td>
                <td className="px-3 py-2">{c.marca ?? '—'} {c.modelo ?? ''}</td>
                <td className="px-3 py-2">
                  <span className={claseConfianza(c.procedencia.confianza)}>
                    {c.procedencia.confianza}
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5">{c.procedencia.fuente}</div>
                </td>
                <td className="px-3 py-2">
                  {c.procedencia.confianza === 'discrepancia' && (
                    <button onClick={() => setResolviendo(c)}
                      className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded">
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolviendo && (
        <ResolverDiscrepancia
          componente={resolviendo}
          onCerrar={() => setResolviendo(null)}
          onResolver={async parche => {
            await actualizarComponente(clienteSlug, tableroSlug, resolviendo.id, parche);
            setResolviendo(null);
          }}
        />
      )}
    </section>
  );
}

function claseConfianza(c: string): string {
  switch (c) {
    case 'alta': return 'px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs';
    case 'media': return 'px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs';
    case 'baja': return 'px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-xs';
    case 'discrepancia': return 'px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs';
    default: return 'text-xs';
  }
}
```

---

## Tarea 16 — `PanelPendientes` con entrada manual de datos de tablero

**Archivos:**
- Crear: `apps/web/src/componentes/PanelPendientes.tsx`

Este panel cubre dos cosas:
- Lista de objetos `Pendiente` registrados.
- Atajos para completar los **datos no observables del tablero** (tensión, esquema tierra, potencia, corriente). Para Plan 2 esto es lo más operativo: los pendientes a nivel de componente individual se resuelven desde el panel central.

- [ ] **Paso 1: Crear `PanelPendientes.tsx`**

`apps/web/src/componentes/PanelPendientes.tsx`:

```typescript
import { useState, useEffect } from 'react';
import type { Tablero, TensionSistema, EsquemaTierra } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const OPCIONES_TENSION: { valor: TensionSistema; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: '— pendiente —' },
  { valor: '220V-mono', etiqueta: '220 V monofásico' },
  { valor: '380V-trif', etiqueta: '380 V trifásico (sin neutro)' },
  { valor: '380V/220V-trif-n', etiqueta: '380/220 V trifásico (con neutro)' }
];

const OPCIONES_TIERRA: { valor: EsquemaTierra; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: '— pendiente —' },
  { valor: 'TT', etiqueta: 'TT' },
  { valor: 'TN-S', etiqueta: 'TN-S' },
  { valor: 'TN-C-S', etiqueta: 'TN-C-S' },
  { valor: 'IT', etiqueta: 'IT' }
];

export function PanelPendientes({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [tensionSistema, setTensionSistema] = useState<TensionSistema>(tablero.tensionSistema);
  const [esquemaTierra, setEsquemaTierra] = useState<EsquemaTierra>(tablero.esquemaTierra);
  const [potencia, setPotencia] = useState<string>(tablero.potenciaContratadaKW?.toString() ?? '');
  const [corriente, setCorriente] = useState<string>(tablero.corrienteNominalA?.toString() ?? '');

  useEffect(() => {
    setTensionSistema(tablero.tensionSistema);
    setEsquemaTierra(tablero.esquemaTierra);
    setPotencia(tablero.potenciaContratadaKW?.toString() ?? '');
    setCorriente(tablero.corrienteNominalA?.toString() ?? '');
  }, [tablero]);

  async function alGuardar() {
    const pNum = potencia.trim() ? Number(potencia) : undefined;
    const cNum = corriente.trim() ? Number(corriente) : undefined;
    await actualizarDatos(clienteSlug, tableroSlug, {
      tensionSistema,
      esquemaTierra,
      ...(pNum !== undefined && !Number.isNaN(pNum) && { potenciaContratadaKW: pNum }),
      ...(cNum !== undefined && !Number.isNaN(cNum) && { corrienteNominalA: cNum })
    });
  }

  const pendientesNoResueltos = tablero.pendientes.filter(p => !p.resueltoEn);

  return (
    <section className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Datos del tablero y pendientes</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Tensión del sistema</span>
          <select value={tensionSistema} onChange={e => setTensionSistema(e.target.value as TensionSistema)}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm">
            {OPCIONES_TENSION.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Esquema de tierra</span>
          <select value={esquemaTierra} onChange={e => setEsquemaTierra(e.target.value as EsquemaTierra)}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm">
            {OPCIONES_TIERRA.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Potencia contratada (kW)</span>
          <input value={potencia} onChange={e => setPotencia(e.target.value)} type="number" step="0.1"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Corriente nominal (A)</span>
          <input value={corriente} onChange={e => setCorriente(e.target.value)} type="number" step="0.1"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
        </label>
      </div>

      <button onClick={alGuardar}
        className="mb-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
        Guardar datos manuales
      </button>

      <h3 className="font-medium text-sm mb-2">Pendientes ({pendientesNoResueltos.length})</h3>
      {pendientesNoResueltos.length === 0 ? (
        <div className="text-xs text-slate-500">Sin pendientes — todo lo que se ha levantado está completo.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {pendientesNoResueltos.map(p => (
            <li key={p.id} className="border-l-2 border-orange-400 pl-2">
              <div>{p.descripcion}</div>
              <div className="text-xs text-slate-500">Resoluble por: {p.resoluble}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Paso 2: Verificar compilación completa**

Ejecutar: `npm --workspace apps/web exec tsc -- --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit todos los paneles + workspace**

```bash
git add apps/web/src/componentes/PanelFotos.tsx apps/web/src/componentes/PanelComponentes.tsx apps/web/src/componentes/PanelPendientes.tsx apps/web/src/componentes/ResolverDiscrepancia.tsx apps/web/src/componentes/BarraCompletitud.tsx apps/web/src/pantallas/WorkspaceTablero.tsx
git commit -m "feat(web): workspace del tablero con 4 paneles y resolución de discrepancias"
```

---

## Tarea 17 — Verificación E2E del Plan 2

**Pre-requisitos:**
- `.env` configurado (heredado del Plan 1).
- Backend y frontend corriendo (`npm run dev`).
- Una foto JPEG de un tablero (la misma del Plan 1 sirve).

- [ ] **Paso 1: Limpiar carpeta `proyectos/` si existe de pruebas previas**

```bash
rm -rf proyectos/
```

- [ ] **Paso 2: Arrancar todo**

`npm run dev`
Esperado: backend y frontend levantan sin errores.

- [ ] **Paso 3: Crear cliente desde la UI**

Abrir `http://localhost:5173`. Hacer clic en "Nuevo cliente". Llenar el nombre. Guardar.

Esperado: aparece en la lista.

- [ ] **Paso 4: Crear tablero**

Hacer clic en "+ Agregar tablero" del cliente recién creado. Llenar código (ej: "TG"), nombre, tipo. Crear.

Esperado: redirige al workspace del tablero. Se ve la barra de completitud al 0%, los 4 paneles (fotos vacío, componentes vacío, placeholder de diagrama, panel de datos + pendientes vacíos).

- [ ] **Paso 5: Subir foto**

Desde el panel de fotos del workspace, subir una foto JPEG del tablero.

Esperado: aparece "Procesando foto... (10-30s)". Después de un rato la miniatura aparece en el panel de fotos, los componentes aparecen en el panel central, y la barra de completitud sube.

- [ ] **Paso 6: Resolver una discrepancia (si hay)**

Si algún componente quedó marcado como "discrepancia", hacer clic en "Resolver" y elegir una de las dos lecturas.

Esperado: la confianza del componente pasa a "alta" con fuente "manual", y el % de completitud sube.

- [ ] **Paso 7: Completar datos manuales del tablero**

En el panel de datos, elegir tensión "220V-mono", esquema tierra "TT", llenar potencia y corriente. Guardar.

Esperado: % de completitud salta significativamente.

- [ ] **Paso 8: Refrescar el navegador**

Pulsar F5.

Esperado: el tablero se carga desde disco con todos los datos preservados (foto, componentes, datos manuales).

- [ ] **Paso 9: Inspeccionar el sistema de archivos**

```bash
ls -la proyectos/
```

Esperado: ver la estructura `proyectos/<slug-cliente>/cliente.json` + `tableros/<slug-tablero>/tablero.json` + `fotos/` + `extracciones/`.

- [ ] **Paso 10: Documentar resultados**

Crear `docs/superpowers/plans/2026-05-12-plan-2-resultados.md` con:

```markdown
# Plan 2 — Resultados de la verificación E2E

**Fecha:** [completar]

## Flujo cliente → tablero → foto → completitud

- [ ] Crear cliente desde UI funcionó
- [ ] Crear tablero desde UI funcionó
- [ ] Subir foto procesó con ambos agentes y persistió en disco
- [ ] Refrescar el navegador preservó el estado
- [ ] Estructura de carpetas en disco coincide con la del spec

## Hallazgos para Plan 3

- [Listar lo que el Plan 3 (motor diagrama) debe priorizar]
```

- [ ] **Paso 11: Commit final**

```bash
git add docs/superpowers/plans/2026-05-12-plan-2-resultados.md
git commit -m "docs: registra resultados E2E del Plan 2"
```

---

## Criterios de aceptación del Plan 2

- [ ] `npm test` ejecuta los tests del Plan 1 + Plan 2 y todos pasan (~48 tests).
- [ ] El usuario puede crear, listar, editar y eliminar clientes desde la UI.
- [ ] El usuario puede crear tableros dentro de un cliente.
- [ ] La subida de fotos persiste tanto la foto como las extracciones crudas y reconciliadas en disco.
- [ ] El panel central muestra los componentes detectados y permite resolver discrepancias.
- [ ] El panel inferior izquierdo permite completar datos no observables del tablero.
- [ ] La barra superior muestra completitud calculada y se actualiza en vivo.
- [ ] Refrescar el navegador no pierde datos.
- [ ] Los datos en disco coinciden con la estructura del spec sección 3.7.

---

## Cosas que el Plan 2 NO resuelve (entran al Plan 3 y siguientes)

- No hay diagrama SVG todavía (placeholder en el workspace).
- No hay verificación RIC activa (placeholder).
- No hay interconexiones entre tableros.
- No hay exportación PDF ni ZIP.
- El panel de pendientes solo muestra pendientes a nivel tablero; los pendientes derivados de componentes individuales (faltan datos en una foto) se agregarán cuando el flujo de "agregar pendiente manualmente" del Plan 3-4 lo requiera.
- Edición directa de un componente individual (más allá de resolver discrepancia) — se agrega cuando se necesite junto con el diagrama.
