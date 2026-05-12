# Plan 4 — Verificación RIC y entidad Circuito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la entidad Circuito, las 9 reglas RIC del spec, el panel de Análisis RIC con dos listas (hallazgos sub-estándar + levantamientos en terreno), y la persistencia asociada.

**Architecture:** Reglas RIC como funciones puras en `tipos/ric/` (módulo compartido entre web y servidor). Hallazgos se computan en vivo y no se persisten; sólo se persisten anotaciones del usuario (silenciar, nota, conversión a terreno). Circuitos se persisten como entidad propia en `tablero.json` y la UI los maneja con una tabla editable que se auto-inicializa desde los automáticos detectados.

**Tech Stack:** TypeScript, Zod, React 18, Zustand, Vitest, React Testing Library, Express, multer (sin cambios), Tailwind.

**Spec:** [2026-05-12-plan-4-verificacion-ric-design.md](../specs/2026-05-12-plan-4-verificacion-ric-design.md)

**Pre-requisito antes de empezar:** En `main` hay un hotfix sin commitear del schema de extracción (apps/servidor/src/agentes/prompts.ts, apps/servidor/src/esquemas/extraccion.ts, tests/extraccion-schema.test.ts). Commitearlo o stashearlo antes de empezar Plan 4 para que el branch nazca limpio.

---

## Fase A — Tipos compartidos

### Tarea A1: Agregar `Circuito`, `UsoCircuito`, `AnotacionHallazgo` y campos nuevos al `Tablero`

**Files:**
- Modify: `tipos/modelo.ts`

- [ ] **Paso 1: Agregar al final del archivo `tipos/modelo.ts`**

```typescript
// ============================================================================
// Circuitos (Plan 4)
// ============================================================================

export type UsoCircuito =
  | 'iluminacion'
  | 'enchufes'
  | 'fuerza'
  | 'calefaccion'
  | 'climatizacion'
  | 'cocina'
  | 'otro'
  | 'pendiente';

export interface Circuito {
  id: string;                          // ULID
  numero: number;                      // correlativo en el tablero (1, 2, 3, ...)
  proteccionComponenteId: string;      // id del automático que protege el circuito
  diferencialComponenteId?: string;    // id del diferencial aguas arriba (opcional)
  destino: string;                     // texto libre o "pendiente"
  uso: UsoCircuito;
  seccionConductorMM2?: number;
  longitudM?: number;
  cargaW?: number;
  rotulacionLeida?: string;
  procedencia: Procedencia;
}

// ============================================================================
// Anotaciones de hallazgos RIC (Plan 4)
// ============================================================================

export type TipoAnotacionHallazgo =
  | 'no-aplica'
  | 'levantamiento-terreno'
  | 'nota-libre';

export interface AnotacionHallazgo {
  id: string;                          // ULID
  reglaId: string;                     // ej. 'ric.tablero.dps-presente'
  componenteId?: string;
  circuitoId?: string;
  tipo: TipoAnotacionHallazgo;
  justificacion: string;
  creadoEn: string;                    // ISO
}
```

- [ ] **Paso 2: Extender la interfaz `Tablero` con los tres campos nuevos**

Editar la interfaz `Tablero` (alrededor de la línea 124). Reemplazar el bloque de comentarios "hallazgosRIC se agrega en Plan 4 / circuitos se agrega en Plan 4" por los tres campos reales:

Reemplazar:
```typescript
  // hallazgosRIC se agrega en Plan 4
  // circuitos se agrega en Plan 4 (cuando empiezan a derivarse del análisis)
}
```

Por:
```typescript
  espaciosTotales?: number;            // Plan 4 — manual, alimenta regla reserva-minima
  circuitos: Circuito[];               // Plan 4
  anotacionesHallazgos: AnotacionHallazgo[];  // Plan 4
}
```

- [ ] **Paso 3: Verificar que TypeScript todavía compila**

Ejecutar:
```bash
npx tsc --noEmit -p apps/servidor/tsconfig.json
```

Esperado: errores en `apps/servidor/src/almacen/tablero.ts` porque `crearTablero` no inicializa los nuevos campos. Eso lo arreglamos en Fase C. Lo único que no debe ocurrir aquí es un error de sintaxis en el propio `tipos/modelo.ts`.

- [ ] **Paso 4: Commit**

```bash
git add tipos/modelo.ts
git commit -m "feat(tipos): agrega Circuito, AnotacionHallazgo y campos nuevos al Tablero"
```

---

### Tarea A2: Crear `tipos/ric/tipos.ts`

**Files:**
- Create: `tipos/ric/tipos.ts`

- [ ] **Paso 1: Crear el archivo con los tipos del motor RIC**

```typescript
// tipos/ric/tipos.ts
// Tipos compartidos del motor de verificación RIC. Las reglas son funciones
// puras (sin React, sin Express) → se importan desde frontend y backend.

import type { Tablero } from '../modelo.js';

export type ResultadoRegla = 'cumple' | 'no-cumple' | 'pendiente-verificar';

export interface HallazgoRIC {
  reglaId: string;                     // 'ric.tablero.dps-presente'
  parteRIC: string;                    // 'RIC N°09'
  descripcionRegla: string;            // legible para humano
  resultado: ResultadoRegla;
  detalle: string;                     // por qué dio ese resultado
  componenteId?: string;
  circuitoId?: string;
}

export interface ReglaRIC {
  id: string;
  parteRIC: string;
  descripcion: string;
  evaluar: (tablero: Tablero) => HallazgoRIC[];
}

export type OrigenLevantamiento = 'pendiente' | 'regla-ric' | 'anotacion-usuario';

export interface LevantamientoTerreno {
  id: string;                          // estable, derivado de la fuente
  origen: OrigenLevantamiento;
  descripcion: string;
  componenteId?: string;
  circuitoId?: string;
  parteRIC?: string;
  prioridad: 'alta' | 'media' | 'baja';
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
npx tsc --noEmit -p apps/servidor/tsconfig.json
```

Esperado: los errores de Fase A1 paso 3 siguen ahí, pero ningún error nuevo viene de `tipos/ric/tipos.ts`.

- [ ] **Paso 3: Commit**

```bash
git add tipos/ric/tipos.ts
git commit -m "feat(tipos): agrega tipos del motor RIC (HallazgoRIC, ReglaRIC, LevantamientoTerreno)"
```

---

## Fase B — Schema Zod backend

### Tarea B1: Tests del schema actualizado

**Files:**
- Create: `apps/servidor/tests/tablero-schema-ric.test.ts`

- [ ] **Paso 1: Escribir tests fallidos para los nuevos campos del schema**

```typescript
// apps/servidor/tests/tablero-schema-ric.test.ts
import { describe, it, expect } from 'vitest';
import { EsquemaTablero } from '../src/esquemas/tablero.js';

const tableroBase = {
  id: '01J0000000000000000000000A',
  slug: 'tg',
  clienteId: '01J0000000000000000000000B',
  codigo: 'TG',
  nombre: 'Tablero General',
  tipo: 'general',
  tensionSistema: 'pendiente',
  esquemaTierra: 'pendiente',
  fotos: [],
  componentes: [],
  pendientes: [],
  porcentajeCompletitud: 0,
  creadoEn: '2026-05-12T00:00:00Z',
  actualizadoEn: '2026-05-12T00:00:00Z',
  circuitos: [],
  anotacionesHallazgos: []
};

describe('EsquemaTablero — campos de Plan 4', () => {
  it('acepta tablero con circuitos vacíos y anotacionesHallazgos vacías', () => {
    expect(() => EsquemaTablero.parse(tableroBase)).not.toThrow();
  });

  it('acepta espaciosTotales como número positivo', () => {
    const t = { ...tableroBase, espaciosTotales: 24 };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.espaciosTotales).toBe(24);
  });

  it('acepta un Circuito completo', () => {
    const t = {
      ...tableroBase,
      circuitos: [{
        id: '01J0000000000000000000000C',
        numero: 1,
        proteccionComponenteId: '01J0000000000000000000000D',
        destino: 'Iluminación living',
        uso: 'iluminacion',
        seccionConductorMM2: 2.5,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.circuitos).toHaveLength(1);
    expect(parsed.circuitos[0]!.uso).toBe('iluminacion');
  });

  it('acepta una AnotacionHallazgo tipo no-aplica', () => {
    const t = {
      ...tableroBase,
      anotacionesHallazgos: [{
        id: '01J0000000000000000000000E',
        reglaId: 'ric.tablero.dps-presente',
        tipo: 'no-aplica',
        justificacion: 'Instalación previa a la entrada en vigencia',
        creadoEn: '2026-05-12T00:00:00Z'
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.anotacionesHallazgos[0]!.tipo).toBe('no-aplica');
  });

  it('rechaza tipo de AnotacionHallazgo inválido', () => {
    const t = {
      ...tableroBase,
      anotacionesHallazgos: [{
        id: '01J',
        reglaId: 'x',
        tipo: 'inexistente',
        justificacion: '',
        creadoEn: '2026-05-12T00:00:00Z'
      }]
    };
    expect(() => EsquemaTablero.parse(t)).toThrow();
  });
});
```

- [ ] **Paso 2: Ejecutar tests y verificar que fallan**

```bash
cd apps/servidor && npx vitest run tests/tablero-schema-ric.test.ts
```

Esperado: 5 tests fallan porque `EsquemaTablero` no conoce los campos nuevos.

---

### Tarea B2: Implementar schemas Zod nuevos

**Files:**
- Modify: `apps/servidor/src/esquemas/tablero.ts`

- [ ] **Paso 1: Insertar los nuevos schemas antes de `EsquemaTablero`**

Insertar después de `EsquemaPendiente` (línea 46) y antes de `export const EsquemaTablero`:

```typescript
const EsquemaCircuito = z.object({
  id: z.string().min(1),
  numero: z.number().int().positive(),
  proteccionComponenteId: z.string().min(1),
  diferencialComponenteId: z.string().min(1).optional(),
  destino: z.string(),
  uso: z.enum(['iluminacion', 'enchufes', 'fuerza', 'calefaccion', 'climatizacion', 'cocina', 'otro', 'pendiente']),
  seccionConductorMM2: z.number().positive().optional(),
  longitudM: z.number().positive().optional(),
  cargaW: z.number().positive().optional(),
  rotulacionLeida: z.string().optional(),
  procedencia: EsquemaProcedencia
});

const EsquemaAnotacionHallazgo = z.object({
  id: z.string().min(1),
  reglaId: z.string().min(1),
  componenteId: z.string().min(1).optional(),
  circuitoId: z.string().min(1).optional(),
  tipo: z.enum(['no-aplica', 'levantamiento-terreno', 'nota-libre']),
  justificacion: z.string(),
  creadoEn: z.string()
});
```

- [ ] **Paso 2: Extender `EsquemaTablero` con los nuevos campos**

En `EsquemaTablero` (después de `corrienteNominalA`), agregar:

```typescript
  espaciosTotales: z.number().int().positive().optional(),
```

Y al final del objeto (después de `actualizadoEn: z.string()`), agregar:

```typescript
,
  circuitos: z.array(EsquemaCircuito).default([]),
  anotacionesHallazgos: z.array(EsquemaAnotacionHallazgo).default([])
```

Nota: usar `.default([])` permite que tableros viejos en disco (sin estos campos) sigan parseando — los completa con array vacío.

- [ ] **Paso 3: Exportar los nuevos schemas para uso en las rutas**

Agregar al final de `tablero.ts`:

```typescript
export { EsquemaCircuito, EsquemaAnotacionHallazgo };
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/tablero-schema-ric.test.ts
```

Esperado: 5 tests PASS.

- [ ] **Paso 5: Ejecutar suite completa para asegurar que no rompimos nada**

```bash
cd apps/servidor && npx vitest run
```

Esperado: todos los tests pasan (los previos + los 5 nuevos).

- [ ] **Paso 6: Commit**

```bash
git add apps/servidor/src/esquemas/tablero.ts apps/servidor/tests/tablero-schema-ric.test.ts
git commit -m "feat(servidor): schemas Zod para Circuito y AnotacionHallazgo en Tablero"
```

---

## Fase C — Persistencia y datos manuales

### Tarea C1: Inicializar circuitos y anotacionesHallazgos en `crearTablero`

**Files:**
- Modify: `apps/servidor/src/almacen/tablero.ts:53-71`
- Modify: `apps/servidor/tests/almacen-tablero.test.ts`

- [ ] **Paso 1: Agregar test que verifica la inicialización**

Buscar el archivo `apps/servidor/tests/almacen-tablero.test.ts`. Agregar al final del `describe` principal:

```typescript
  it('inicializa circuitos y anotacionesHallazgos como arrays vacíos', async () => {
    const dir = await crearWorkspaceTemporal();
    process.chdir(dir);
    const cliente = await crearCliente({ nombre: 'Foo' });
    const tablero = await crearTablero(cliente.slug, {
      codigo: 'TG', nombre: 'Test', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    expect(tablero.circuitos).toEqual([]);
    expect(tablero.anotacionesHallazgos).toEqual([]);
    expect(tablero.espaciosTotales).toBeUndefined();
  });
```

(Si los nombres de import o el helper `crearWorkspaceTemporal` son distintos, mirar los tests existentes en ese archivo y copiar el patrón.)

- [ ] **Paso 2: Ejecutar test y verificar que falla**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts
```

Esperado: el nuevo test falla porque `circuitos` y `anotacionesHallazgos` son `undefined` en el resultado.

- [ ] **Paso 3: Modificar `crearTablero` en `apps/servidor/src/almacen/tablero.ts`**

En el objeto `tablero` literal dentro de `crearTablero` (líneas 53-71), antes de `creadoEn: ahora`, agregar:

```typescript
    circuitos: [],
    anotacionesHallazgos: [],
```

El bloque queda así:

```typescript
    fotos: [],
    componentes: [],
    pendientes: [],
    circuitos: [],
    anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: ahora,
    actualizadoEn: ahora
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts
```

Esperado: todos los tests del archivo PASS, incluyendo el nuevo.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/almacen/tablero.ts apps/servidor/tests/almacen-tablero.test.ts
git commit -m "feat(servidor): inicializa circuitos y anotacionesHallazgos al crear tablero"
```

---

### Tarea C2: Soporte de `espaciosTotales` en `actualizarTablero`

**Files:**
- Modify: `apps/servidor/src/esquemas/tablero.ts`
- Modify: `apps/servidor/src/almacen/tablero.ts:110-131`
- Modify: `apps/servidor/tests/almacen-tablero.test.ts`

- [ ] **Paso 1: Test fallido**

Agregar al mismo `describe` de `almacen-tablero.test.ts`:

```typescript
  it('permite guardar espaciosTotales vía actualizarTablero', async () => {
    const dir = await crearWorkspaceTemporal();
    process.chdir(dir);
    const cliente = await crearCliente({ nombre: 'Foo' });
    const t = await crearTablero(cliente.slug, {
      codigo: 'TG', nombre: 'X', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    const actualizado = await actualizarTablero(cliente.slug, t.slug, { espaciosTotales: 24 });
    expect(actualizado.espaciosTotales).toBe(24);
    const releido = await leerTablero(cliente.slug, t.slug);
    expect(releido.espaciosTotales).toBe(24);
  });
```

(Asegurarse de que `actualizarTablero` y `leerTablero` estén importados en el archivo.)

- [ ] **Paso 2: Ejecutar y verificar que falla**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts
```

Esperado: el nuevo test falla con error de Zod ("espaciosTotales no permitido" o similar), porque `EsquemaTableroEntrada` no lo conoce.

- [ ] **Paso 3: Extender `EsquemaTableroEntrada`**

En `apps/servidor/src/esquemas/tablero.ts`, en el `extend` de `EsquemaTableroEntrada` (línea 71-77), agregar:

```typescript
    espaciosTotales: z.number().int().positive().optional()
```

El extend queda:

```typescript
  .extend({
    ubicacion: z.string().max(300).optional(),
    tensionSistema: z.enum(['220V-mono', '380V-trif', '380V/220V-trif-n', 'pendiente']).default('pendiente'),
    esquemaTierra: z.enum(['TT', 'TN-S', 'TN-C-S', 'IT', 'pendiente']).default('pendiente'),
    potenciaContratadaKW: z.number().positive().optional(),
    corrienteNominalA: z.number().positive().optional(),
    espaciosTotales: z.number().int().positive().optional()
  });
```

- [ ] **Paso 4: Aplicar el campo en `actualizarTablero`**

En `apps/servidor/src/almacen/tablero.ts`, en la función `actualizarTablero` (líneas 110-131), agregar la línea correspondiente dentro del spread:

```typescript
    ...(parche.espaciosTotales !== undefined && { espaciosTotales: parche.espaciosTotales }),
```

Ubicarla justo después de la línea de `corrienteNominalA`.

- [ ] **Paso 5: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run
```

Esperado: todos pasan.

- [ ] **Paso 6: Commit**

```bash
git add apps/servidor/src/esquemas/tablero.ts apps/servidor/src/almacen/tablero.ts apps/servidor/tests/almacen-tablero.test.ts
git commit -m "feat(servidor): actualizarTablero soporta espaciosTotales"
```

---

## Fase D — Endpoints API

### Tarea D1: Funciones de almacén para reemplazar circuitos y anotaciones

**Files:**
- Modify: `apps/servidor/src/almacen/tablero.ts`
- Modify: `apps/servidor/tests/almacen-tablero.test.ts`

- [ ] **Paso 1: Test fallido**

Agregar al `describe` de `almacen-tablero.test.ts`:

```typescript
  it('reemplazarCircuitos sustituye el array completo y persiste', async () => {
    const dir = await crearWorkspaceTemporal();
    process.chdir(dir);
    const cliente = await crearCliente({ nombre: 'Foo' });
    const t = await crearTablero(cliente.slug, {
      codigo: 'TG', nombre: 'X', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    const nuevoCircuito = {
      id: '01J0000000000000000000000C',
      numero: 1,
      proteccionComponenteId: '01J0000000000000000000000D',
      destino: 'Iluminación',
      uso: 'iluminacion' as const,
      procedencia: { fuente: 'manual' as const, confianza: 'alta' as const }
    };
    const actualizado = await reemplazarCircuitos(cliente.slug, t.slug, [nuevoCircuito]);
    expect(actualizado.circuitos).toEqual([nuevoCircuito]);
    const releido = await leerTablero(cliente.slug, t.slug);
    expect(releido.circuitos).toEqual([nuevoCircuito]);
  });

  it('reemplazarAnotacionesHallazgos sustituye el array completo y persiste', async () => {
    const dir = await crearWorkspaceTemporal();
    process.chdir(dir);
    const cliente = await crearCliente({ nombre: 'Foo' });
    const t = await crearTablero(cliente.slug, {
      codigo: 'TG', nombre: 'X', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    const anotacion = {
      id: '01J0000000000000000000000E',
      reglaId: 'ric.tablero.dps-presente',
      tipo: 'no-aplica' as const,
      justificacion: 'Instalación previa',
      creadoEn: '2026-05-12T00:00:00Z'
    };
    const actualizado = await reemplazarAnotacionesHallazgos(cliente.slug, t.slug, [anotacion]);
    expect(actualizado.anotacionesHallazgos).toEqual([anotacion]);
  });
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts
```

Esperado: errores "reemplazarCircuitos is not defined" / "reemplazarAnotacionesHallazgos is not defined".

- [ ] **Paso 3: Implementar las dos funciones en `apps/servidor/src/almacen/tablero.ts`**

Al final del archivo (después de `eliminarTablero`):

```typescript
export async function reemplazarCircuitos(
  slugCliente: string,
  slugTablero: string,
  circuitos: Tablero['circuitos']
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const actualizado: Tablero = sincronizarCompletitud({
    ...actual,
    circuitos,
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}

export async function reemplazarAnotacionesHallazgos(
  slugCliente: string,
  slugTablero: string,
  anotaciones: Tablero['anotacionesHallazgos']
): Promise<Tablero> {
  const actual = await leerTablero(slugCliente, slugTablero);
  const actualizado: Tablero = sincronizarCompletitud({
    ...actual,
    anotacionesHallazgos: anotaciones,
    actualizadoEn: new Date().toISOString()
  });
  await escribirJsonAtomico(archivoTablero(slugCliente, slugTablero), actualizado);
  await sincronizarCliente(slugCliente);
  return actualizado;
}
```

Asegurarse de que el archivo importe `reemplazarCircuitos` y `reemplazarAnotacionesHallazgos` al inicio del test (con el resto de imports).

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts
```

Esperado: PASS.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/almacen/tablero.ts apps/servidor/tests/almacen-tablero.test.ts
git commit -m "feat(servidor): reemplazarCircuitos y reemplazarAnotacionesHallazgos en almacén"
```

---

### Tarea D2: Endpoints HTTP para circuitos y anotaciones

**Files:**
- Modify: `apps/servidor/src/rutas/tableros.ts`
- Modify: `apps/servidor/tests/tableros-api.test.ts`

- [ ] **Paso 1: Tests fallidos**

Agregar al `describe` principal de `tableros-api.test.ts`:

```typescript
  it('PUT /circuitos reemplaza el array completo', async () => {
    const { app, slug, tableroSlug } = await prepararFixture();
    const circuito = {
      id: '01J0000000000000000000000C',
      numero: 1,
      proteccionComponenteId: '01J0000000000000000000000D',
      destino: 'Living',
      uso: 'iluminacion',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    };
    const r = await request(app)
      .put(`/api/clientes/${slug}/tableros/${tableroSlug}/circuitos`)
      .send({ circuitos: [circuito] });
    expect(r.status).toBe(200);
    expect(r.body.circuitos).toHaveLength(1);
  });

  it('PUT /circuitos rechaza body sin array', async () => {
    const { app, slug, tableroSlug } = await prepararFixture();
    const r = await request(app)
      .put(`/api/clientes/${slug}/tableros/${tableroSlug}/circuitos`)
      .send({ circuitos: 'no-array' });
    expect(r.status).toBe(400);
  });

  it('PUT /anotaciones-ric reemplaza el array completo', async () => {
    const { app, slug, tableroSlug } = await prepararFixture();
    const anotacion = {
      id: '01J0000000000000000000000E',
      reglaId: 'ric.tablero.dps-presente',
      tipo: 'no-aplica',
      justificacion: 'previa',
      creadoEn: '2026-05-12T00:00:00Z'
    };
    const r = await request(app)
      .put(`/api/clientes/${slug}/tableros/${tableroSlug}/anotaciones-ric`)
      .send({ anotaciones: [anotacion] });
    expect(r.status).toBe(200);
    expect(r.body.anotacionesHallazgos).toHaveLength(1);
  });
```

`prepararFixture` ya existe en el archivo (se usa para los tests anteriores). Si no, ver el patrón de los tests existentes en el archivo.

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/tableros-api.test.ts
```

Esperado: 404 en los tres tests (los endpoints no existen).

- [ ] **Paso 3: Agregar los dos endpoints en `apps/servidor/src/rutas/tableros.ts`**

Importar al inicio del archivo (junto a los otros imports de esquemas/almacén):

```typescript
import { EsquemaCircuito, EsquemaAnotacionHallazgo } from '../esquemas/tablero.js';
import { reemplazarCircuitos, reemplazarAnotacionesHallazgos } from '../almacen/tablero.js';
import { z } from 'zod';
```

Antes de `return router;` (al final del archivo, después del PATCH de componentes), agregar:

```typescript
  router.put('/clientes/:c/tableros/:t/circuitos', async (req, res) => {
    try {
      const payload = z.object({ circuitos: z.array(EsquemaCircuito) }).parse(req.body);
      const tablero = await reemplazarCircuitos(req.params.c!, req.params.t!, payload.circuitos);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.put('/clientes/:c/tableros/:t/anotaciones-ric', async (req, res) => {
    try {
      const payload = z.object({ anotaciones: z.array(EsquemaAnotacionHallazgo) }).parse(req.body);
      const tablero = await reemplazarAnotacionesHallazgos(req.params.c!, req.params.t!, payload.anotaciones);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run
```

Esperado: todos PASS.

- [ ] **Paso 5: Commit**

```bash
git add apps/servidor/src/rutas/tableros.ts apps/servidor/tests/tableros-api.test.ts
git commit -m "feat(servidor): endpoints PUT /circuitos y /anotaciones-ric"
```

---

## Fase E — Motor RIC (9 reglas)

### Tarea E1: Regla `int-general-presente`

**Files:**
- Create: `tipos/ric/reglas/int-general-presente.ts`
- Create: `apps/servidor/tests/ric/int-general-presente.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/int-general-presente.test.ts
import { describe, it, expect } from 'vitest';
import { reglaIntGeneralPresente } from '../../../../tipos/ric/reglas/int-general-presente.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C',
    codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z',
    actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaIntGeneralPresente', () => {
  it('no-cumple cuando no hay interruptor general', () => {
    const t = tableroVacio();
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar cuando hay IG sin calibre o sin corriente nominal', () => {
    const t = tableroVacio();
    t.componentes = [{
      id: '01C1', tipo: 'interruptor-general',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple cuando IG calibre ≥ corrienteNominal', () => {
    const t = tableroVacio();
    t.corrienteNominalA = 40;
    t.componentes = [{
      id: '01C1', tipo: 'interruptor-general', calibreA: 63,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple cuando calibre < corrienteNominal', () => {
    const t = tableroVacio();
    t.corrienteNominalA = 40;
    t.componentes = [{
      id: '01C1', tipo: 'interruptor-general', calibreA: 25,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaIntGeneralPresente.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/int-general-presente.test.ts
```

Esperado: cannot find module.

- [ ] **Paso 3: Implementar la regla**

```typescript
// tipos/ric/reglas/int-general-presente.ts
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaIntGeneralPresente: ReglaRIC = {
  id: 'ric.tablero.int-general-presente',
  parteRIC: 'RIC N°06',
  descripcion: 'Interruptor general presente y dimensionado a la corriente nominal',
  evaluar(tablero) {
    const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');
    if (!ig) {
      return [{
        reglaId: 'ric.tablero.int-general-presente',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Interruptor general presente',
        resultado: 'no-cumple',
        detalle: 'No se encontró un componente tipo "interruptor-general" en el tablero.'
      }];
    }
    if (ig.calibreA === undefined || tablero.corrienteNominalA === undefined) {
      return [{
        reglaId: 'ric.tablero.int-general-presente',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Interruptor general dimensionado',
        resultado: 'pendiente-verificar',
        detalle: 'Falta calibre del IG o corriente nominal del tablero.',
        componenteId: ig.id
      }];
    }
    const cumple = ig.calibreA >= tablero.corrienteNominalA;
    const h: HallazgoRIC = {
      reglaId: 'ric.tablero.int-general-presente',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Interruptor general dimensionado',
      resultado: cumple ? 'cumple' : 'no-cumple',
      detalle: cumple
        ? `IG ${ig.calibreA}A ≥ corriente nominal ${tablero.corrienteNominalA}A.`
        : `IG ${ig.calibreA}A < corriente nominal ${tablero.corrienteNominalA}A.`,
      componenteId: ig.id
    };
    return [h];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/int-general-presente.test.ts
```

Esperado: 4 tests PASS.

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/int-general-presente.ts apps/servidor/tests/ric/int-general-presente.test.ts
git commit -m "feat(ric): regla int-general-presente (RIC N°06)"
```

---

### Tarea E2: Regla `diferencial-presente`

**Files:**
- Create: `tipos/ric/reglas/diferencial-presente.ts`
- Create: `apps/servidor/tests/ric/diferencial-presente.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/diferencial-presente.test.ts
import { describe, it, expect } from 'vitest';
import { reglaDiferencialPresente } from '../../../../tipos/ric/reglas/diferencial-presente.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaDiferencialPresente', () => {
  it('no-cumple si no hay diferencial', () => {
    const [h] = reglaDiferencialPresente.evaluar(tableroVacio());
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si hay al menos uno', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'd1', tipo: 'diferencial', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaDiferencialPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/diferencial-presente.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/diferencial-presente.ts
import type { ReglaRIC } from '../tipos.js';

export const reglaDiferencialPresente: ReglaRIC = {
  id: 'ric.tablero.diferencial-presente',
  parteRIC: 'RIC N°06',
  descripcion: 'Existe diferencial principal y/o por circuitos',
  evaluar(tablero) {
    const tieneAlguno = tablero.componentes.some(c => c.tipo === 'diferencial');
    return [{
      reglaId: 'ric.tablero.diferencial-presente',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Diferencial presente',
      resultado: tieneAlguno ? 'cumple' : 'no-cumple',
      detalle: tieneAlguno
        ? 'Al menos un diferencial detectado en el tablero.'
        : 'No se detectó ningún diferencial en el tablero.'
    }];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/diferencial-presente.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/diferencial-presente.ts apps/servidor/tests/ric/diferencial-presente.test.ts
git commit -m "feat(ric): regla diferencial-presente (RIC N°06)"
```

---

### Tarea E3: Regla `diferencial-sensibilidad-enchufes`

**Files:**
- Create: `tipos/ric/reglas/diferencial-sensibilidad-enchufes.ts`
- Create: `apps/servidor/tests/ric/diferencial-sensibilidad-enchufes.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/diferencial-sensibilidad-enchufes.test.ts
import { describe, it, expect } from 'vitest';
import { reglaDiferencialSensibilidadEnchufes } from '../../../../tipos/ric/reglas/diferencial-sensibilidad-enchufes.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaDiferencialSensibilidadEnchufes', () => {
  it('no emite hallazgos si no hay circuitos de enchufes', () => {
    expect(reglaDiferencialSensibilidadEnchufes.evaluar(tableroVacio())).toEqual([]);
  });

  it('no-cumple si circuito enchufes no tiene diferencial asociado', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('no-cumple si diferencial asociado tiene sensibilidad > 30 mA', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 300, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', diferencialComponenteId: 'd1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si diferencial asociado tiene sensibilidad ≤ 30 mA', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 30, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', diferencialComponenteId: 'd1',
      destino: 'Living', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('pendiente-verificar si uso del circuito es pendiente', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: '', uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaDiferencialSensibilidadEnchufes.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/diferencial-sensibilidad-enchufes.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/diferencial-sensibilidad-enchufes.ts
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaDiferencialSensibilidadEnchufes: ReglaRIC = {
  id: 'ric.tablero.diferencial-sensibilidad-enchufes',
  parteRIC: 'RIC N°06',
  descripcion: 'Circuitos de enchufes con diferencial ≤ 30 mA',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      if (c.uso === 'pendiente') {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero} no tiene uso definido.`,
          circuitoId: c.id
        });
        continue;
      }
      if (c.uso !== 'enchufes') continue;
      if (!c.diferencialComponenteId) {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'no-cumple',
          detalle: `Circuito #${c.numero} (enchufes) no tiene diferencial asociado.`,
          circuitoId: c.id
        });
        continue;
      }
      const dif = tablero.componentes.find(co => co.id === c.diferencialComponenteId);
      if (!dif || dif.sensibilidadMA === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
          parteRIC: 'RIC N°06',
          descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero}: diferencial sin sensibilidad reportada.`,
          circuitoId: c.id
        });
        continue;
      }
      hallazgos.push({
        reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Diferencial ≤30 mA en circuitos de enchufes',
        resultado: dif.sensibilidadMA <= 30 ? 'cumple' : 'no-cumple',
        detalle: `Circuito #${c.numero}: diferencial ${dif.sensibilidadMA} mA.`,
        circuitoId: c.id,
        componenteId: dif.id
      });
    }
    return hallazgos;
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/diferencial-sensibilidad-enchufes.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/diferencial-sensibilidad-enchufes.ts apps/servidor/tests/ric/diferencial-sensibilidad-enchufes.test.ts
git commit -m "feat(ric): regla diferencial-sensibilidad-enchufes (RIC N°06)"
```

---

### Tarea E4: Regla `barras-tierra-neutro-separadas`

**Files:**
- Create: `tipos/ric/reglas/barras-tierra-neutro-separadas.ts`
- Create: `apps/servidor/tests/ric/barras-tierra-neutro-separadas.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/barras-tierra-neutro-separadas.test.ts
import { describe, it, expect } from 'vitest';
import { reglaBarrasTierraNeutroSeparadas } from '../../../../tipos/ric/reglas/barras-tierra-neutro-separadas.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaBarrasTierraNeutroSeparadas', () => {
  it('pendiente-verificar si esquemaTierra es pendiente', () => {
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(tableroVacio());
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple si TT con barras separadas', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TT';
    t.componentes = [
      { id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bt', tipo: 'barra-tierra', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple si TT sin barra de tierra', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TT';
    t.componentes = [{ id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple por no aplicabilidad si esquema no es TT (TN-S)', () => {
    const t = tableroVacio();
    t.esquemaTierra = 'TN-S';
    const [h] = reglaBarrasTierraNeutroSeparadas.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/barras-tierra-neutro-separadas.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/barras-tierra-neutro-separadas.ts
import type { ReglaRIC } from '../tipos.js';

export const reglaBarrasTierraNeutroSeparadas: ReglaRIC = {
  id: 'ric.tablero.barras-tierra-neutro-separadas',
  parteRIC: 'RIC N°08',
  descripcion: 'En esquema TT, barras de tierra y neutro separadas',
  evaluar(tablero) {
    if (tablero.esquemaTierra === 'pendiente') {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'pendiente-verificar',
        detalle: 'Falta definir el esquema de puesta a tierra del tablero.'
      }];
    }
    if (tablero.esquemaTierra !== 'TT') {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'cumple',
        detalle: `Regla no aplica para esquema ${tablero.esquemaTierra}.`
      }];
    }
    const tieneNeutro = tablero.componentes.some(c => c.tipo === 'barra-neutro');
    const tieneTierra = tablero.componentes.some(c => c.tipo === 'barra-tierra');
    if (tieneNeutro && tieneTierra) {
      return [{
        reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
        parteRIC: 'RIC N°08',
        descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
        resultado: 'cumple',
        detalle: 'Se detectan barras separadas de tierra y neutro.'
      }];
    }
    return [{
      reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
      parteRIC: 'RIC N°08',
      descripcionRegla: 'Barras tierra/neutro separadas (esquema TT)',
      resultado: 'no-cumple',
      detalle: `Falta ${tieneNeutro ? 'barra de tierra' : tieneTierra ? 'barra de neutro' : 'barra de tierra y de neutro'}.`
    }];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/barras-tierra-neutro-separadas.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/barras-tierra-neutro-separadas.ts apps/servidor/tests/ric/barras-tierra-neutro-separadas.test.ts
git commit -m "feat(ric): regla barras-tierra-neutro-separadas (RIC N°08)"
```

---

### Tarea E5: Regla `dps-presente`

**Files:**
- Create: `tipos/ric/reglas/dps-presente.ts`
- Create: `apps/servidor/tests/ric/dps-presente.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/dps-presente.test.ts
import { describe, it, expect } from 'vitest';
import { reglaDpsPresente } from '../../../../tipos/ric/reglas/dps-presente.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaDpsPresente', () => {
  it('no-cumple si no hay DPS', () => {
    const [h] = reglaDpsPresente.evaluar(tableroVacio());
    expect(h!.resultado).toBe('no-cumple');
  });

  it('cumple si hay DPS', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'dps1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaDpsPresente.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/dps-presente.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/dps-presente.ts
import type { ReglaRIC } from '../tipos.js';

export const reglaDpsPresente: ReglaRIC = {
  id: 'ric.tablero.dps-presente',
  parteRIC: 'RIC N°09',
  descripcion: 'DPS (descargador de sobretensiones) presente donde RIC lo exige',
  evaluar(tablero) {
    const tiene = tablero.componentes.some(c => c.tipo === 'dps');
    return [{
      reglaId: 'ric.tablero.dps-presente',
      parteRIC: 'RIC N°09',
      descripcionRegla: 'DPS presente',
      resultado: tiene ? 'cumple' : 'no-cumple',
      detalle: tiene
        ? 'DPS detectado en el tablero.'
        : 'No se detectó componente DPS. Si la instalación no requiere DPS, marca el hallazgo como "no aplica".'
    }];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/dps-presente.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/dps-presente.ts apps/servidor/tests/ric/dps-presente.test.ts
git commit -m "feat(ric): regla dps-presente (RIC N°09)"
```

---

### Tarea E6: Regla `calibre-vs-seccion`

**Files:**
- Create: `tipos/ric/reglas/calibre-vs-seccion.ts`
- Create: `apps/servidor/tests/ric/calibre-vs-seccion.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/calibre-vs-seccion.test.ts
import { describe, it, expect } from 'vitest';
import { reglaCalibreVsSeccion } from '../../../../tipos/ric/reglas/calibre-vs-seccion.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaCalibreVsSeccion', () => {
  it('no emite hallazgos si no hay circuitos', () => {
    expect(reglaCalibreVsSeccion.evaluar(tableroVacio())).toEqual([]);
  });

  it('cumple con C16 sobre 2.5mm²', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes', seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple con C25 sobre 2.5mm²', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes', seccionConductorMM2: 2.5,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar si falta sección', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'X', uso: 'enchufes',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaCalibreVsSeccion.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/calibre-vs-seccion.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/calibre-vs-seccion.ts
// Tabla referencial RIC N°02 — calibre máximo de protección por sección
// de conductor de cobre, instalación en ducto. Tomada de la versión
// vigente del RIC al 2026. Si la norma se actualiza, modificar acá.
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

const CALIBRE_MAX_POR_SECCION: Array<{ seccionMM2: number; calibreMaxA: number }> = [
  { seccionMM2: 1.5, calibreMaxA: 16 },
  { seccionMM2: 2.5, calibreMaxA: 20 },
  { seccionMM2: 4,   calibreMaxA: 25 },
  { seccionMM2: 6,   calibreMaxA: 40 },
  { seccionMM2: 10,  calibreMaxA: 63 },
  { seccionMM2: 16,  calibreMaxA: 80 },
  { seccionMM2: 25,  calibreMaxA: 100 }
];

function calibreMaxParaSeccion(seccion: number): number | undefined {
  // Encuentra la fila exacta o la inmediatamente menor.
  const aplicable = [...CALIBRE_MAX_POR_SECCION]
    .reverse()
    .find(f => f.seccionMM2 <= seccion);
  return aplicable?.calibreMaxA;
}

export const reglaCalibreVsSeccion: ReglaRIC = {
  id: 'ric.tablero.calibre-vs-seccion',
  parteRIC: 'RIC N°02',
  descripcion: 'Calibre del automático coherente con la sección del conductor',
  evaluar(tablero) {
    const hallazgos: HallazgoRIC[] = [];
    for (const c of tablero.circuitos) {
      const proteccion = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
      if (!proteccion || proteccion.calibreA === undefined || c.seccionConductorMM2 === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-vs-seccion',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Calibre vs sección',
          resultado: 'pendiente-verificar',
          detalle: `Circuito #${c.numero}: falta calibre del automático o sección del conductor.`,
          circuitoId: c.id,
          ...(proteccion && { componenteId: proteccion.id })
        });
        continue;
      }
      const max = calibreMaxParaSeccion(c.seccionConductorMM2);
      if (max === undefined) {
        hallazgos.push({
          reglaId: 'ric.tablero.calibre-vs-seccion',
          parteRIC: 'RIC N°02',
          descripcionRegla: 'Calibre vs sección',
          resultado: 'pendiente-verificar',
          detalle: `Sección ${c.seccionConductorMM2}mm² fuera de tabla referencial.`,
          circuitoId: c.id
        });
        continue;
      }
      hallazgos.push({
        reglaId: 'ric.tablero.calibre-vs-seccion',
        parteRIC: 'RIC N°02',
        descripcionRegla: 'Calibre vs sección',
        resultado: proteccion.calibreA <= max ? 'cumple' : 'no-cumple',
        detalle: `Circuito #${c.numero}: ${proteccion.calibreA}A sobre ${c.seccionConductorMM2}mm² (máx ${max}A).`,
        circuitoId: c.id,
        componenteId: proteccion.id
      });
    }
    return hallazgos;
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/calibre-vs-seccion.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/calibre-vs-seccion.ts apps/servidor/tests/ric/calibre-vs-seccion.test.ts
git commit -m "feat(ric): regla calibre-vs-seccion (RIC N°02)"
```

---

### Tarea E7: Regla `identificacion-circuitos`

**Files:**
- Create: `tipos/ric/reglas/identificacion-circuitos.ts`
- Create: `apps/servidor/tests/ric/identificacion-circuitos.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/identificacion-circuitos.test.ts
import { describe, it, expect } from 'vitest';
import { reglaIdentificacionCircuitos } from '../../../../tipos/ric/reglas/identificacion-circuitos.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaIdentificacionCircuitos', () => {
  it('no emite hallazgos si no hay circuitos', () => {
    expect(reglaIdentificacionCircuitos.evaluar(tableroVacio())).toEqual([]);
  });

  it('no-cumple por cada circuito con destino vacío o pendiente', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [
      { id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: '', uso: 'pendiente', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'c2', numero: 2, proteccionComponenteId: 'a1', destino: 'pendiente', uso: 'pendiente', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const hs = reglaIdentificacionCircuitos.evaluar(t);
    expect(hs).toHaveLength(2);
    expect(hs.every(h => h.resultado === 'no-cumple')).toBe(true);
  });

  it('cumple para circuitos con destino real', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: 'Iluminación living', uso: 'iluminacion',
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    const [h] = reglaIdentificacionCircuitos.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/identificacion-circuitos.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/identificacion-circuitos.ts
import type { ReglaRIC, HallazgoRIC } from '../tipos.js';

export const reglaIdentificacionCircuitos: ReglaRIC = {
  id: 'ric.tablero.identificacion-circuitos',
  parteRIC: 'RIC N°04',
  descripcion: 'Cada circuito tiene rótulo/destino declarado',
  evaluar(tablero) {
    return tablero.circuitos.map((c): HallazgoRIC => {
      const destino = c.destino.trim().toLowerCase();
      const sinDestino = destino === '' || destino === 'pendiente';
      return {
        reglaId: 'ric.tablero.identificacion-circuitos',
        parteRIC: 'RIC N°04',
        descripcionRegla: 'Identificación de circuitos',
        resultado: sinDestino ? 'no-cumple' : 'cumple',
        detalle: sinDestino
          ? `Circuito #${c.numero} no tiene destino declarado.`
          : `Circuito #${c.numero}: "${c.destino}".`,
        circuitoId: c.id
      };
    });
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/identificacion-circuitos.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/identificacion-circuitos.ts apps/servidor/tests/ric/identificacion-circuitos.test.ts
git commit -m "feat(ric): regla identificacion-circuitos (RIC N°04)"
```

---

### Tarea E8: Regla `reserva-minima`

**Files:**
- Create: `tipos/ric/reglas/reserva-minima.ts`
- Create: `apps/servidor/tests/ric/reserva-minima.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/reserva-minima.test.ts
import { describe, it, expect } from 'vitest';
import { reglaReservaMinima } from '../../../../tipos/ric/reglas/reserva-minima.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaReservaMinima', () => {
  it('pendiente-verificar si espaciosTotales no está definido', () => {
    const [h] = reglaReservaMinima.evaluar(tableroVacio());
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple con 24 espacios y 18 automáticos (reserva 25%)', () => {
    const t = tableroVacio();
    t.espaciosTotales = 24;
    t.componentes = Array.from({ length: 18 }, (_, i) => ({
      id: `a${i}`, tipo: 'interruptor-automatico' as const,
      procedencia: { fuente: 'manual' as const, confianza: 'alta' as const }
    }));
    const [h] = reglaReservaMinima.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple con 20 espacios y 18 automáticos (reserva 10%)', () => {
    const t = tableroVacio();
    t.espaciosTotales = 20;
    t.componentes = Array.from({ length: 18 }, (_, i) => ({
      id: `a${i}`, tipo: 'interruptor-automatico' as const,
      procedencia: { fuente: 'manual' as const, confianza: 'alta' as const }
    }));
    const [h] = reglaReservaMinima.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/reserva-minima.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/reserva-minima.ts
import type { ReglaRIC } from '../tipos.js';

export const reglaReservaMinima: ReglaRIC = {
  id: 'ric.tablero.reserva-minima',
  parteRIC: 'RIC N°04',
  descripcion: 'Reserva ≥20% de espacios libres en el tablero',
  evaluar(tablero) {
    if (tablero.espaciosTotales === undefined) {
      return [{
        reglaId: 'ric.tablero.reserva-minima',
        parteRIC: 'RIC N°04',
        descripcionRegla: 'Reserva mínima 20%',
        resultado: 'pendiente-verificar',
        detalle: 'Falta declarar la cantidad total de espacios físicos del tablero.'
      }];
    }
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico').length;
    const ocupacion = automaticos / tablero.espaciosTotales;
    const reserva = 1 - ocupacion;
    return [{
      reglaId: 'ric.tablero.reserva-minima',
      parteRIC: 'RIC N°04',
      descripcionRegla: 'Reserva mínima 20%',
      resultado: reserva >= 0.20 ? 'cumple' : 'no-cumple',
      detalle: `${automaticos} automáticos sobre ${tablero.espaciosTotales} espacios → reserva ${(reserva * 100).toFixed(0)}%.`
    }];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/reserva-minima.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/reserva-minima.ts apps/servidor/tests/ric/reserva-minima.test.ts
git commit -m "feat(ric): regla reserva-minima (RIC N°04)"
```

---

### Tarea E9: Regla `selectividad`

**Files:**
- Create: `tipos/ric/reglas/selectividad.ts`
- Create: `apps/servidor/tests/ric/selectividad.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/selectividad.test.ts
import { describe, it, expect } from 'vitest';
import { reglaSelectividad } from '../../../../tipos/ric/reglas/selectividad.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('reglaSelectividad', () => {
  it('pendiente-verificar si IG no tiene calibre', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });

  it('cumple si IG ≥ max ramal', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'ig', tipo: 'interruptor-general', calibreA: 63, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a2', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('cumple');
  });

  it('no-cumple si IG < max ramal', () => {
    const t = tableroVacio();
    t.componentes = [
      { id: 'ig', tipo: 'interruptor-general', calibreA: 25, procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 40, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('no-cumple');
  });

  it('pendiente-verificar si no hay automáticos con calibre conocido', () => {
    const t = tableroVacio();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', calibreA: 40, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const [h] = reglaSelectividad.evaluar(t);
    expect(h!.resultado).toBe('pendiente-verificar');
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/selectividad.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/reglas/selectividad.ts
import type { ReglaRIC } from '../tipos.js';

export const reglaSelectividad: ReglaRIC = {
  id: 'ric.tablero.selectividad',
  parteRIC: 'RIC N°06',
  descripcion: 'Calibres en cascada coherentes (IG ≥ máx ramal)',
  evaluar(tablero) {
    const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');
    if (!ig || ig.calibreA === undefined) {
      return [{
        reglaId: 'ric.tablero.selectividad',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
        resultado: 'pendiente-verificar',
        detalle: ig ? 'IG sin calibre declarado.' : 'No hay interruptor general declarado.'
      }];
    }
    const calibresRamales = tablero.componentes
      .filter(c => c.tipo === 'interruptor-automatico' && c.calibreA !== undefined)
      .map(c => c.calibreA as number);
    if (calibresRamales.length === 0) {
      return [{
        reglaId: 'ric.tablero.selectividad',
        parteRIC: 'RIC N°06',
        descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
        resultado: 'pendiente-verificar',
        detalle: 'No hay automáticos ramales con calibre declarado.',
        componenteId: ig.id
      }];
    }
    const max = Math.max(...calibresRamales);
    return [{
      reglaId: 'ric.tablero.selectividad',
      parteRIC: 'RIC N°06',
      descripcionRegla: 'Selectividad (IG ≥ máx ramal)',
      resultado: ig.calibreA >= max ? 'cumple' : 'no-cumple',
      detalle: `IG ${ig.calibreA}A vs máx ramal ${max}A.`,
      componenteId: ig.id
    }];
  }
};
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/selectividad.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/reglas/selectividad.ts apps/servidor/tests/ric/selectividad.test.ts
git commit -m "feat(ric): regla selectividad (RIC N°06)"
```

---

### Tarea E10: Orquestador del motor

**Files:**
- Create: `tipos/ric/reglas/index.ts`
- Create: `tipos/ric/motor.ts`
- Create: `apps/servidor/tests/ric/motor.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/motor.test.ts
import { describe, it, expect } from 'vitest';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { TODAS_LAS_REGLAS } from '../../../../tipos/ric/reglas/index.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('motor RIC', () => {
  it('lista de reglas tiene exactamente 9 elementos', () => {
    expect(TODAS_LAS_REGLAS).toHaveLength(9);
  });

  it('cada regla tiene id único', () => {
    const ids = TODAS_LAS_REGLAS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('evaluarRIC sobre tablero vacío produce al menos un hallazgo por regla', () => {
    const hallazgos = evaluarRIC(tableroVacio());
    const reglasUsadas = new Set(hallazgos.map(h => h.reglaId));
    // Las reglas que iteran por circuitos pueden no emitir hallazgos si no hay circuitos.
    // Mínimo deben aparecer las reglas que evalúan a nivel tablero.
    expect(reglasUsadas.has('ric.tablero.int-general-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.diferencial-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.dps-presente')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.barras-tierra-neutro-separadas')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.reserva-minima')).toBe(true);
    expect(reglasUsadas.has('ric.tablero.selectividad')).toBe(true);
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/motor.test.ts
```

- [ ] **Paso 3: Implementar el índice**

```typescript
// tipos/ric/reglas/index.ts
import { reglaIntGeneralPresente } from './int-general-presente.js';
import { reglaDiferencialPresente } from './diferencial-presente.js';
import { reglaDiferencialSensibilidadEnchufes } from './diferencial-sensibilidad-enchufes.js';
import { reglaBarrasTierraNeutroSeparadas } from './barras-tierra-neutro-separadas.js';
import { reglaDpsPresente } from './dps-presente.js';
import { reglaCalibreVsSeccion } from './calibre-vs-seccion.js';
import { reglaIdentificacionCircuitos } from './identificacion-circuitos.js';
import { reglaReservaMinima } from './reserva-minima.js';
import { reglaSelectividad } from './selectividad.js';
import type { ReglaRIC } from '../tipos.js';

export const TODAS_LAS_REGLAS: ReglaRIC[] = [
  reglaIntGeneralPresente,
  reglaDiferencialPresente,
  reglaDiferencialSensibilidadEnchufes,
  reglaBarrasTierraNeutroSeparadas,
  reglaDpsPresente,
  reglaCalibreVsSeccion,
  reglaIdentificacionCircuitos,
  reglaReservaMinima,
  reglaSelectividad
];
```

- [ ] **Paso 4: Implementar el orquestador**

```typescript
// tipos/ric/motor.ts
import type { Tablero } from '../modelo.js';
import type { HallazgoRIC } from './tipos.js';
import { TODAS_LAS_REGLAS } from './reglas/index.js';

export function evaluarRIC(tablero: Tablero): HallazgoRIC[] {
  return TODAS_LAS_REGLAS.flatMap(r => r.evaluar(tablero));
}
```

- [ ] **Paso 5: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/motor.test.ts
```

- [ ] **Paso 6: Commit**

```bash
git add tipos/ric/reglas/index.ts tipos/ric/motor.ts apps/servidor/tests/ric/motor.test.ts
git commit -m "feat(ric): motor evaluarRIC orquesta las 9 reglas"
```

---

### Tarea E11: `derivarLevantamientosTerreno`

**Files:**
- Create: `tipos/ric/derivar-levantamientos.ts`
- Create: `apps/servidor/tests/ric/derivar-levantamientos.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/derivar-levantamientos.test.ts
import { describe, it, expect } from 'vitest';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('derivarLevantamientosTerreno', () => {
  it('incluye pendientes con resoluble = medicion-terreno', () => {
    const t = tableroVacio();
    t.pendientes = [
      { id: 'p1', categoria: 'dato-no-observable', descripcion: 'verificar tierra', resoluble: 'medicion-terreno' },
      { id: 'p2', categoria: 'dato-no-observable', descripcion: 'otro', resoluble: 'entrada-manual' }
    ];
    const ls = derivarLevantamientosTerreno(t);
    expect(ls).toHaveLength(1);
    expect(ls[0]!.origen).toBe('pendiente');
  });

  it('incluye anotaciones tipo levantamiento-terreno', () => {
    const t = tableroVacio();
    t.anotacionesHallazgos = [{
      id: 'a1', reglaId: 'ric.tablero.dps-presente', tipo: 'levantamiento-terreno',
      justificacion: 'medir con megger', creadoEn: '2026-05-12T00:00:00Z'
    }];
    const ls = derivarLevantamientosTerreno(t);
    expect(ls).toHaveLength(1);
    expect(ls[0]!.origen).toBe('anotacion-usuario');
  });

  it('incluye hallazgos pendiente-verificar generados al vuelo', () => {
    // esquemaTierra=pendiente genera regla barras-tierra-neutro-separadas pendiente-verificar
    const t = tableroVacio();
    const ls = derivarLevantamientosTerreno(t);
    const algunoDeRegla = ls.some(l => l.origen === 'regla-ric');
    expect(algunoDeRegla).toBe(true);
  });
});
```

- [ ] **Paso 2: Ejecutar — debe fallar**

```bash
cd apps/servidor && npx vitest run tests/ric/derivar-levantamientos.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/derivar-levantamientos.ts
import type { Tablero } from '../modelo.js';
import type { LevantamientoTerreno } from './tipos.js';
import { evaluarRIC } from './motor.js';

export function derivarLevantamientosTerreno(tablero: Tablero): LevantamientoTerreno[] {
  const items: LevantamientoTerreno[] = [];

  // 1. Pendientes con resoluble = medicion-terreno
  for (const p of tablero.pendientes) {
    if (p.resoluble === 'medicion-terreno' && !p.resueltoEn) {
      items.push({
        id: `pendiente:${p.id}`,
        origen: 'pendiente',
        descripcion: p.descripcion,
        ...(p.componenteId && { componenteId: p.componenteId }),
        prioridad: 'media'
      });
    }
  }

  // 2. Hallazgos RIC con resultado = pendiente-verificar
  for (const h of evaluarRIC(tablero)) {
    if (h.resultado === 'pendiente-verificar') {
      items.push({
        id: `regla:${h.reglaId}:${h.componenteId ?? ''}:${h.circuitoId ?? ''}`,
        origen: 'regla-ric',
        descripcion: h.detalle,
        ...(h.componenteId && { componenteId: h.componenteId }),
        ...(h.circuitoId && { circuitoId: h.circuitoId }),
        parteRIC: h.parteRIC,
        prioridad: 'baja'
      });
    }
  }

  // 3. Anotaciones tipo levantamiento-terreno
  for (const a of tablero.anotacionesHallazgos) {
    if (a.tipo === 'levantamiento-terreno') {
      items.push({
        id: `anotacion:${a.id}`,
        origen: 'anotacion-usuario',
        descripcion: a.justificacion || `Verificar regla ${a.reglaId}`,
        ...(a.componenteId && { componenteId: a.componenteId }),
        ...(a.circuitoId && { circuitoId: a.circuitoId }),
        prioridad: 'alta'
      });
    }
  }

  return items;
}
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run tests/ric/derivar-levantamientos.test.ts
```

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/derivar-levantamientos.ts apps/servidor/tests/ric/derivar-levantamientos.test.ts
git commit -m "feat(ric): derivarLevantamientosTerreno une pendientes, reglas y anotaciones"
```

---

## Fase F — Frontend: API y store

### Tarea F1: Extender `apiTableros` con los nuevos endpoints

**Files:**
- Modify: `apps/web/src/api/cliente.ts`

- [ ] **Paso 1: Agregar tres funciones al objeto `apiTableros`**

Después de `actualizarComponente` (línea ~56), agregar:

```typescript
,

  reemplazarCircuitos: (clienteSlug: string, tableroSlug: string, circuitos: unknown[]) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/circuitos`, { circuitos }),

  reemplazarAnotacionesHallazgos: (clienteSlug: string, tableroSlug: string, anotaciones: unknown[]) =>
    pedir<Tablero>('PUT', `/api/clientes/${clienteSlug}/tableros/${tableroSlug}/anotaciones-ric`, { anotaciones })
```

(Las funciones aceptan `unknown[]` y dejan que Zod valide en el servidor — el tipado real lo hace el caller.)

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/api/cliente.ts
git commit -m "feat(web): api para reemplazar circuitos y anotaciones RIC"
```

---

### Tarea F2: Extender `tableroStore`

**Files:**
- Modify: `apps/web/src/estado/tableroStore.ts`

- [ ] **Paso 1: Agregar dos acciones al store**

En la interfaz `TableroStore`, agregar:

```typescript
  reemplazarCircuitos(clienteSlug: string, tableroSlug: string, circuitos: import('@tipos/modelo').Circuito[]): Promise<void>;
  reemplazarAnotacionesHallazgos(clienteSlug: string, tableroSlug: string, anotaciones: import('@tipos/modelo').AnotacionHallazgo[]): Promise<void>;
```

En el cuerpo del `create`, agregar antes de `limpiar`:

```typescript
  async reemplazarCircuitos(clienteSlug, tableroSlug, circuitos) {
    const tablero = await apiTableros.reemplazarCircuitos(clienteSlug, tableroSlug, circuitos);
    set({ tablero });
  },

  async reemplazarAnotacionesHallazgos(clienteSlug, tableroSlug, anotaciones) {
    const tablero = await apiTableros.reemplazarAnotacionesHallazgos(clienteSlug, tableroSlug, anotaciones);
    set({ tablero });
  },
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/estado/tableroStore.ts
git commit -m "feat(web): tableroStore acciones para circuitos y anotaciones RIC"
```

---

## Fase G — Frontend: tabla de circuitos

### Tarea G1: Componente `TablaCircuitos`

**Files:**
- Create: `apps/web/src/componentes/TablaCircuitos.tsx`

- [ ] **Paso 1: Crear el componente**

```tsx
// apps/web/src/componentes/TablaCircuitos.tsx
import { useMemo } from 'react';
import { ulid } from 'ulid';
import type { Tablero, Circuito, UsoCircuito } from '@tipos/modelo';
import { useTableroStore } from '../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const USOS: UsoCircuito[] = [
  'iluminacion', 'enchufes', 'fuerza', 'calefaccion',
  'climatizacion', 'cocina', 'otro', 'pendiente'
];

export function TablaCircuitos({ tablero, clienteSlug, tableroSlug }: Props) {
  const { reemplazarCircuitos } = useTableroStore();

  // Filas inicializadas a partir de automáticos sin circuito asignado.
  const filasMostrar = useMemo<Circuito[]>(() => {
    if (tablero.circuitos.length > 0) return tablero.circuitos;
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
    return automaticos.map((c, i): Circuito => ({
      id: ulid(),
      numero: i + 1,
      proteccionComponenteId: c.id,
      destino: 'pendiente',
      uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'baja' }
    }));
  }, [tablero.circuitos, tablero.componentes]);

  async function guardar(circuitos: Circuito[]) {
    await reemplazarCircuitos(clienteSlug, tableroSlug, circuitos);
  }

  function actualizarFila(id: string, parche: Partial<Circuito>) {
    const nuevos = filasMostrar.map(c => c.id === id ? { ...c, ...parche } : c);
    void guardar(nuevos);
  }

  function eliminarFila(id: string) {
    void guardar(filasMostrar.filter(c => c.id !== id));
  }

  function agregarFila() {
    const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
    const primerAuto = automaticos[0];
    if (!primerAuto) return;
    const nuevoNumero = (filasMostrar.at(-1)?.numero ?? 0) + 1;
    void guardar([...filasMostrar, {
      id: ulid(),
      numero: nuevoNumero,
      proteccionComponenteId: primerAuto.id,
      destino: 'pendiente',
      uso: 'pendiente',
      procedencia: { fuente: 'manual', confianza: 'baja' }
    }]);
  }

  const automaticos = tablero.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const diferenciales = tablero.componentes.filter(c => c.tipo === 'diferencial');

  return (
    <div className="space-y-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-slate-600">
            <th className="py-2 pr-2">Nº</th>
            <th className="py-2 pr-2">Protección</th>
            <th className="py-2 pr-2">Diferencial</th>
            <th className="py-2 pr-2">Destino</th>
            <th className="py-2 pr-2">Uso</th>
            <th className="py-2 pr-2">mm²</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {filasMostrar.map(c => (
            <tr key={c.id} className="border-b">
              <td className="py-1 pr-2">
                <input
                  type="number"
                  value={c.numero}
                  onChange={e => actualizarFila(c.id, { numero: Number(e.target.value) })}
                  className="w-12 border rounded px-1"
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.proteccionComponenteId}
                  onChange={e => actualizarFila(c.id, { proteccionComponenteId: e.target.value })}
                  className="border rounded px-1"
                >
                  {automaticos.map(a => (
                    <option key={a.id} value={a.id}>
                      {`C${a.calibreA ?? '?'} (${a.id.slice(-4)})`}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.diferencialComponenteId ?? ''}
                  onChange={e => actualizarFila(c.id, { diferencialComponenteId: e.target.value || undefined })}
                  className="border rounded px-1"
                >
                  <option value="">—</option>
                  {diferenciales.map(d => (
                    <option key={d.id} value={d.id}>
                      {`${d.sensibilidadMA ?? '?'}mA (${d.id.slice(-4)})`}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <input
                  type="text"
                  value={c.destino === 'pendiente' ? '' : c.destino}
                  placeholder="pendiente"
                  onChange={e => actualizarFila(c.id, { destino: e.target.value || 'pendiente' })}
                  className="w-32 border rounded px-1"
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={c.uso}
                  onChange={e => actualizarFila(c.id, { uso: e.target.value as UsoCircuito })}
                  className="border rounded px-1"
                >
                  {USOS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td className="py-1 pr-2">
                <input
                  type="number"
                  step="0.5"
                  value={c.seccionConductorMM2 ?? ''}
                  onChange={e => actualizarFila(c.id, {
                    seccionConductorMM2: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-16 border rounded px-1"
                />
              </td>
              <td className="py-1 text-right">
                <button
                  onClick={() => eliminarFila(c.id)}
                  className="text-red-600 hover:underline text-xs"
                >Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={agregarFila}
        className="text-sm text-blue-600 hover:underline"
        disabled={automaticos.length === 0}
      >+ Agregar circuito</button>
      {filasMostrar.length === 0 && (
        <p className="text-sm text-slate-500">
          Aún no hay automáticos detectados. Sube fotos del tablero o agrega componentes manualmente.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores. Si falla por falta de `ulid`, ya está instalado en `node_modules` (lo usa el servidor); en frontend agregarlo a `apps/web/package.json` con `npm --workspace apps/web install ulid`.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/componentes/TablaCircuitos.tsx apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): TablaCircuitos editable con auto-inicialización desde automáticos"
```

---

### Tarea G2: Integrar la tabla en `PanelComponentes` como tab

**Files:**
- Modify: `apps/web/src/componentes/PanelComponentes.tsx`

- [ ] **Paso 1: Leer el archivo y entender su estructura actual**

```bash
sed -n '1,40p' apps/web/src/componentes/PanelComponentes.tsx
```

- [ ] **Paso 2: Agregar tabs al panel**

En lo alto del componente (después de los hooks existentes), agregar:

```tsx
const [tab, setTab] = useState<'componentes' | 'circuitos'>('componentes');
```

Importar `useState` desde React (si no estaba ya).

Reemplazar el `<h2>` actual del header del panel por:

```tsx
<div className="flex items-center gap-2 mb-3">
  <h2 className="font-semibold">{tab === 'componentes'
    ? `Componentes (${tablero.componentes.length})`
    : `Circuitos (${tablero.circuitos.length})`}</h2>
  <div className="ml-auto flex border rounded overflow-hidden text-xs">
    <button
      className={`px-2 py-1 ${tab === 'componentes' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
      onClick={() => setTab('componentes')}
    >Componentes</button>
    <button
      className={`px-2 py-1 ${tab === 'circuitos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
      onClick={() => setTab('circuitos')}
    >Circuitos</button>
  </div>
</div>
```

Envolver el contenido actual del panel en un condicional:

```tsx
{tab === 'componentes' && (
  <>{/* contenido actual de la lista de componentes */}</>
)}
{tab === 'circuitos' && (
  <TablaCircuitos
    tablero={tablero}
    clienteSlug={clienteSlug}
    tableroSlug={tableroSlug}
  />
)}
```

Importar al inicio del archivo:
```tsx
import { TablaCircuitos } from './TablaCircuitos.js';
```

- [ ] **Paso 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 4: Verificación manual rápida**

Levantar `npm run dev`. Abrir un tablero existente (creado en Plan 2/3). En el panel central debe aparecer el toggle "Componentes / Circuitos". Al hacer clic en Circuitos, debe mostrar filas auto-inicializadas para cada automático detectado.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/componentes/PanelComponentes.tsx
git commit -m "feat(web): PanelComponentes con tabs Componentes/Circuitos"
```

---

## Fase H — Frontend: Panel "Análisis RIC"

### Tarea H1: Sub-componente `AccionesHallazgo`

**Files:**
- Create: `apps/web/src/componentes/AccionesHallazgo.tsx`

- [ ] **Paso 1: Crear el componente**

```tsx
// apps/web/src/componentes/AccionesHallazgo.tsx
import { useState } from 'react';
import { ulid } from 'ulid';
import type { HallazgoRIC, AnotacionHallazgo, TipoAnotacionHallazgo } from '@tipos/modelo';

interface Props {
  hallazgo: HallazgoRIC;
  anotacionesExistentes: AnotacionHallazgo[];
  onAgregar(anotacion: AnotacionHallazgo): void;
  onEliminar(anotacionId: string): void;
}

export function AccionesHallazgo({ hallazgo, anotacionesExistentes, onAgregar, onEliminar }: Props) {
  const [abierto, setAbierto] = useState<TipoAnotacionHallazgo | null>(null);
  const [texto, setTexto] = useState('');

  function confirmar(tipo: TipoAnotacionHallazgo) {
    if ((tipo === 'no-aplica' || tipo === 'levantamiento-terreno') && !texto.trim()) return;
    onAgregar({
      id: ulid(),
      reglaId: hallazgo.reglaId,
      ...(hallazgo.componenteId && { componenteId: hallazgo.componenteId }),
      ...(hallazgo.circuitoId && { circuitoId: hallazgo.circuitoId }),
      tipo,
      justificacion: texto.trim(),
      creadoEn: new Date().toISOString()
    });
    setTexto('');
    setAbierto(null);
  }

  if (abierto) {
    return (
      <div className="mt-2 p-2 bg-slate-50 border rounded space-y-2">
        <label className="text-xs text-slate-600 block">
          {abierto === 'no-aplica' && 'Justifica por qué no aplica esta regla:'}
          {abierto === 'levantamiento-terreno' && 'Describe la medición o verificación que se hará en terreno:'}
          {abierto === 'nota-libre' && 'Nota libre (opcional):'}
        </label>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={2}
          className="w-full border rounded p-1 text-sm"
        />
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => confirmar(abierto)}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >Guardar</button>
          <button
            onClick={() => { setAbierto(null); setTexto(''); }}
            className="px-2 py-1 border rounded hover:bg-slate-100"
          >Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      <button
        onClick={() => setAbierto('no-aplica')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >No aplica</button>
      <button
        onClick={() => setAbierto('levantamiento-terreno')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >→ Terreno</button>
      <button
        onClick={() => setAbierto('nota-libre')}
        className="px-2 py-0.5 border rounded hover:bg-slate-100"
      >Nota</button>

      {anotacionesExistentes.length > 0 && (
        <div className="basis-full mt-1 space-y-1">
          {anotacionesExistentes.map(a => (
            <div key={a.id} className="flex items-start gap-2 text-slate-600">
              <span className="font-medium">[{a.tipo}]</span>
              <span className="flex-1">{a.justificacion || '(sin justificación)'}</span>
              <button
                onClick={() => onEliminar(a.id)}
                className="text-red-600 hover:underline"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/componentes/AccionesHallazgo.tsx
git commit -m "feat(web): AccionesHallazgo (no-aplica, →terreno, nota libre)"
```

---

### Tarea H2: Componente `PanelAnalisisRIC`

**Files:**
- Create: `apps/web/src/componentes/PanelAnalisisRIC.tsx`

- [ ] **Paso 1: Crear el componente**

```tsx
// apps/web/src/componentes/PanelAnalisisRIC.tsx
import { useMemo, useState } from 'react';
import type { Tablero, AnotacionHallazgo } from '@tipos/modelo';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';
import { useTableroStore } from '../estado/tableroStore.js';
import { AccionesHallazgo } from './AccionesHallazgo.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

function emojiResultado(r: string) {
  if (r === 'cumple') return '✓';
  if (r === 'no-cumple') return '❌';
  return '⏳';
}

export function PanelAnalisisRIC({ tablero, clienteSlug, tableroSlug }: Props) {
  const { reemplazarAnotacionesHallazgos } = useTableroStore();
  const [tab, setTab] = useState<'hallazgos' | 'terreno'>('hallazgos');

  const hallazgos = useMemo(() => evaluarRIC(tablero), [tablero]);
  const levantamientos = useMemo(() => derivarLevantamientosTerreno(tablero), [tablero]);

  // Para mostrar anotaciones específicas a cada hallazgo
  function anotacionesPara(reglaId: string, componenteId?: string, circuitoId?: string): AnotacionHallazgo[] {
    return tablero.anotacionesHallazgos.filter(a =>
      a.reglaId === reglaId &&
      a.componenteId === componenteId &&
      a.circuitoId === circuitoId
    );
  }

  function agregarAnotacion(a: AnotacionHallazgo) {
    void reemplazarAnotacionesHallazgos(clienteSlug, tableroSlug, [...tablero.anotacionesHallazgos, a]);
  }

  function eliminarAnotacion(id: string) {
    void reemplazarAnotacionesHallazgos(
      clienteSlug, tableroSlug,
      tablero.anotacionesHallazgos.filter(a => a.id !== id)
    );
  }

  // Un hallazgo con anotación no-aplica se considera silenciado y se renderiza tachado al final.
  const ordenados = useMemo(() => {
    return [...hallazgos].sort((a, b) => {
      const sa = anotacionesPara(a.reglaId, a.componenteId, a.circuitoId).some(an => an.tipo === 'no-aplica');
      const sb = anotacionesPara(b.reglaId, b.componenteId, b.circuitoId).some(an => an.tipo === 'no-aplica');
      if (sa !== sb) return sa ? 1 : -1;
      // Luego no-cumple > pendiente-verificar > cumple
      const orden = { 'no-cumple': 0, 'pendiente-verificar': 1, 'cumple': 2 };
      return orden[a.resultado] - orden[b.resultado];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallazgos, tablero.anotacionesHallazgos]);

  return (
    <div className="bg-white border rounded p-4 h-full overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">Análisis RIC</h2>
        <div className="ml-auto flex border rounded overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${tab === 'hallazgos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            onClick={() => setTab('hallazgos')}
          >Hallazgos ({hallazgos.length})</button>
          <button
            className={`px-2 py-1 ${tab === 'terreno' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            onClick={() => setTab('terreno')}
          >Levantamientos terreno ({levantamientos.length})</button>
        </div>
      </div>

      {tab === 'hallazgos' && (
        <ul className="space-y-3">
          {ordenados.map((h, i) => {
            const anots = anotacionesPara(h.reglaId, h.componenteId, h.circuitoId);
            const silenciado = anots.some(a => a.tipo === 'no-aplica');
            return (
              <li key={`${h.reglaId}-${i}`} className={`p-2 border rounded ${silenciado ? 'bg-slate-50 text-slate-400 line-through' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{emojiResultado(h.resultado)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{h.descripcionRegla}</div>
                    <div className="text-xs text-slate-600">{h.detalle}</div>
                  </div>
                  <span className="text-xs text-slate-500">{h.parteRIC}</span>
                </div>
                {!silenciado && h.resultado !== 'cumple' && (
                  <AccionesHallazgo
                    hallazgo={h}
                    anotacionesExistentes={anots}
                    onAgregar={agregarAnotacion}
                    onEliminar={eliminarAnotacion}
                  />
                )}
                {silenciado && (
                  <div className="mt-1 text-xs text-slate-500">
                    Silenciado: {anots.find(a => a.tipo === 'no-aplica')?.justificacion}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'terreno' && (
        <ul className="space-y-2">
          {levantamientos.length === 0 && (
            <li className="text-sm text-slate-500">Sin levantamientos pendientes.</li>
          )}
          {levantamientos.map(l => (
            <li key={l.id} className="p-2 border rounded flex items-start gap-2">
              <span className={`text-xs px-1 rounded ${
                l.prioridad === 'alta' ? 'bg-red-100 text-red-700' :
                l.prioridad === 'media' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>{l.prioridad}</span>
              <div className="flex-1">
                <div className="text-sm">{l.descripcion}</div>
                <div className="text-xs text-slate-500">
                  Origen: {l.origen}{l.parteRIC ? ` · ${l.parteRIC}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/componentes/PanelAnalisisRIC.tsx
git commit -m "feat(web): PanelAnalisisRIC con dos tabs (hallazgos + terreno)"
```

---

### Tarea H3: Reemplazar el placeholder en `WorkspaceTablero`

**Files:**
- Modify: `apps/web/src/pantallas/WorkspaceTablero.tsx`

- [ ] **Paso 1: Reemplazar el bloque placeholder**

En `apps/web/src/pantallas/WorkspaceTablero.tsx`, reemplazar:

```tsx
<div className="col-span-6">
  <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded p-4 text-center text-slate-500">
    Hallazgos RIC — se construyen en el Plan 4.
  </div>
</div>
```

Por:

```tsx
<div className="col-span-6">
  <PanelAnalisisRIC tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
</div>
```

Agregar al inicio del archivo:

```tsx
import { PanelAnalisisRIC } from '../componentes/PanelAnalisisRIC.js';
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Verificación manual rápida**

`npm run dev`, abrir un tablero existente. El panel inferior derecho ya no es placeholder — debe mostrar la lista de hallazgos RIC (al menos las reglas que evalúan a nivel tablero).

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/pantallas/WorkspaceTablero.tsx
git commit -m "feat(web): integra PanelAnalisisRIC en workspace (reemplazo del placeholder)"
```

---

### Tarea H4: Test mínimo de `PanelAnalisisRIC`

**Files:**
- Create: `apps/web/tests/PanelAnalisisRIC.test.tsx`

- [ ] **Paso 1: Crear test**

```tsx
// apps/web/tests/PanelAnalisisRIC.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PanelAnalisisRIC } from '../src/componentes/PanelAnalisisRIC.js';
import type { Tablero } from '@tipos/modelo';

vi.mock('../src/estado/tableroStore.js', () => ({
  useTableroStore: () => ({ reemplazarAnotacionesHallazgos: vi.fn() })
}));

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('PanelAnalisisRIC', () => {
  it('renderiza el título y los tabs', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getByText('Análisis RIC')).toBeDefined();
    expect(screen.getByText(/Hallazgos \(/)).toBeDefined();
    expect(screen.getByText(/Levantamientos terreno \(/)).toBeDefined();
  });

  it('lista al menos una regla evaluada como no-cumple para tablero vacío', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    // "Diferencial presente" debe estar en no-cumple
    expect(screen.getByText(/Diferencial presente/)).toBeDefined();
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que pasa**

```bash
cd apps/web && npx vitest run tests/PanelAnalisisRIC.test.tsx
```

Esperado: PASS.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/tests/PanelAnalisisRIC.test.tsx
git commit -m "test(web): cobertura básica de PanelAnalisisRIC"
```

---

## Fase I — Espacios totales + barra superior

### Tarea I1: Input "espacios totales" en panel de datos del tablero

**Files:**
- Modify: `apps/web/src/componentes/PanelPendientes.tsx`
- Modify: `apps/web/src/api/cliente.ts` (tipo del parámetro de `actualizar`)

`PanelPendientes.tsx` aloja los datos manuales del tablero (tensión, esquema tierra, potencia, corriente nominal) además de la lista de pendientes. Es el lugar correcto para el nuevo input.

- [ ] **Paso 1: Extender el tipo del parámetro `apiTableros.actualizar` en `apps/web/src/api/cliente.ts`**

Buscar la línea (≈ línea 36):

```typescript
  actualizar: (clienteSlug: string, tableroSlug: string, datos: Partial<{ tensionSistema: string; esquemaTierra: string; potenciaContratadaKW: number; corrienteNominalA: number; ubicacion: string; nombre: string; codigo: string; tipo: string }>) =>
```

Agregar `espaciosTotales: number` al `Partial<{...}>`:

```typescript
  actualizar: (clienteSlug: string, tableroSlug: string, datos: Partial<{ tensionSistema: string; esquemaTierra: string; potenciaContratadaKW: number; corrienteNominalA: number; ubicacion: string; nombre: string; codigo: string; tipo: string; espaciosTotales: number }>) =>
```

- [ ] **Paso 2: Agregar el input en `PanelPendientes.tsx`**

`PanelPendientes` usa el patrón "state local + botón guardar". Reflejar ese patrón:

a) En los hooks de estado al inicio del componente, agregar:

```tsx
const [espaciosTotales, setEspaciosTotales] = useState<string>(tablero.espaciosTotales?.toString() ?? '');
```

b) En el `useEffect` que sincroniza state cuando cambia `tablero`, agregar:

```tsx
setEspaciosTotales(tablero.espaciosTotales?.toString() ?? '');
```

c) En la función de submit (que llama `actualizarDatos`), parsear y agregar al payload. Junto al spread de `potenciaContratadaKW`:

```tsx
const etNum = espaciosTotales ? Number(espaciosTotales) : undefined;
// ...
await actualizarDatos(clienteSlug, tableroSlug, {
  tensionSistema,
  esquemaTierra,
  ...(pNum !== undefined && !Number.isNaN(pNum) && { potenciaContratadaKW: pNum }),
  ...(cnNum !== undefined && !Number.isNaN(cnNum) && { corrienteNominalA: cnNum }),
  ...(etNum !== undefined && !Number.isNaN(etNum) && { espaciosTotales: etNum })
});
```

(`cnNum` ya existirá por el `corrienteNominalA` previo. Si no, mirar el patrón en el archivo y mantenerlo.)

d) En el JSX del formulario, junto al input de `corrienteNominalA`, agregar:

```tsx
<label className="block text-sm">
  Espacios totales del tablero
  <input
    type="number"
    min="1"
    value={espaciosTotales}
    onChange={e => setEspaciosTotales(e.target.value)}
    className="mt-1 w-24 border rounded px-2 py-1"
  />
</label>
```

- [ ] **Paso 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 4: Verificación manual**

`npm run dev`, abrir un tablero. El panel inferior izquierdo (datos del tablero) ahora tiene el input "Espacios totales". Al cambiar el valor y guardar, refrescar el navegador debe preservar el dato.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/componentes/PanelPendientes.tsx apps/web/src/api/cliente.ts
git commit -m "feat(web): input de espaciosTotales en datos del tablero"
```

---

### Tarea I2: Contador RIC en la barra superior

**Files:**
- Modify: `apps/web/src/componentes/BarraCompletitud.tsx`

- [ ] **Paso 1: Inspeccionar el archivo**

```bash
cat apps/web/src/componentes/BarraCompletitud.tsx
```

- [ ] **Paso 2: Agregar la línea de hallazgos RIC y levantamientos terreno**

Debajo de la barra de completitud, mostrar:

```tsx
{(() => {
  const hallazgosNoCumple = evaluarRIC(tablero).filter(h =>
    h.resultado === 'no-cumple' &&
    !tablero.anotacionesHallazgos.some(a =>
      a.tipo === 'no-aplica' &&
      a.reglaId === h.reglaId &&
      a.componenteId === h.componenteId &&
      a.circuitoId === h.circuitoId
    )
  ).length;
  const terreno = derivarLevantamientosTerreno(tablero).length;
  return (
    <div className="text-xs text-slate-600 mt-1">
      {hallazgosNoCumple} hallazgos RIC sin resolver · {terreno} levantamientos en terreno
    </div>
  );
})()}
```

Agregar imports al inicio del archivo:

```tsx
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { derivarLevantamientosTerreno } from '../../../../tipos/ric/derivar-levantamientos.js';
```

- [ ] **Paso 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/componentes/BarraCompletitud.tsx
git commit -m "feat(web): BarraCompletitud incluye contadores RIC"
```

---

## Fase J — Plantilla de resultados E2E

### Tarea J1: Crear plantilla `plan-4-resultados.md`

**Files:**
- Create: `docs/superpowers/plans/2026-05-12-plan-4-resultados.md`

- [ ] **Paso 1: Crear el archivo**

```markdown
# Plan 4 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual del Plan 4.
> Requiere backend + frontend corriendo y al menos un tablero con componentes detectados.

**Fecha:** _pendiente_

---

## Pasos de ejecución

1. `npm run dev` — backend y frontend.
2. Abrir `http://localhost:5173` (o el puerto que muestre Vite).
3. Abrir un tablero existente o crear uno nuevo y subir fotos.
4. Recorrer la verificación de abajo.

---

## Tabla de circuitos
- [ ] La pestaña "Circuitos" del panel central muestra una fila por cada automático detectado.
- [ ] Editar el destino, uso y sección de un circuito persiste al recargar.
- [ ] Agregar/eliminar circuitos funciona.

## Análisis RIC — Hallazgos
- [ ] El panel inferior derecho muestra "Análisis RIC" en lugar del placeholder anterior.
- [ ] Aparecen al menos las 6 reglas de nivel tablero (IG, diferencial, DPS, barras separadas, reserva mínima, selectividad).
- [ ] Cada hallazgo no-cumple/pendiente-verificar tiene los tres botones (No aplica / →Terreno / Nota).
- [ ] Silenciar un hallazgo con justificación lo tacha y lo manda al final.
- [ ] Recargar el navegador preserva las anotaciones.

## Análisis RIC — Levantamientos en terreno
- [ ] La pestaña muestra al menos los hallazgos pendiente-verificar.
- [ ] Si hay pendientes con resoluble=medicion-terreno (de Plan 2), también aparecen.
- [ ] Convertir un hallazgo en levantamiento-terreno lo agrega a esta lista.

## Datos manuales
- [ ] Ingresar "Espacios totales del tablero" en el panel de datos cambia la regla reserva-minima de pendiente-verificar a cumple/no-cumple.
- [ ] Cambiar esquemaTierra a "TT" hace que la regla de barras separadas evalúe en función de los componentes.

## Barra superior
- [ ] El contador "X hallazgos RIC sin resolver · Y levantamientos terreno" se actualiza en vivo al editar.

## Fotos / tableros probados

| # | Descripción | Reglas no-cumple | Reglas pendiente-verificar | Observaciones |
|---|-------------|------------------|----------------------------|---------------|
| 1 | _pendiente_ |                  |                            |               |

## Hallazgos para Plan 5
- _pendiente_

---

## Criterios de aceptación del Plan 4

- [ ] `npm test` ejecuta ~110 tests, todos pasan.
- [ ] El workspace muestra el panel "Análisis RIC" con sus dos tabs.
- [ ] La tabla de circuitos permite crear/editar/borrar filas.
- [ ] Las 9 reglas devuelven `cumple` / `no-cumple` / `pendiente-verificar` correctamente.
- [ ] Acciones sobre hallazgos persisten en disco y sobreviven a F5.
- [ ] El contador de la barra superior se actualiza en vivo.
- [ ] Refrescar el navegador preserva circuitos + anotaciones.
```

- [ ] **Paso 2: Verificar tests globales por última vez**

```bash
cd apps/servidor && npx vitest run && cd ../web && npx vitest run
```

Esperado: todos los tests pasan en ambos workspaces.

- [ ] **Paso 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-12-plan-4-resultados.md
git commit -m "docs: agrega plantilla de resultados E2E del Plan 4"
```

---

## Criterios de aceptación finales

- [ ] `npm test` (raíz) ejecuta ~110 tests, todos pasan.
- [ ] El workspace muestra "Análisis RIC" con dos tabs funcionales.
- [ ] La tabla de circuitos del panel central permite CRUD inline.
- [ ] Las 9 reglas RIC están implementadas y testeadas (`cumple`/`no-cumple`/`pendiente-verificar`).
- [ ] `derivarLevantamientosTerreno` une las tres fuentes (pendientes manuales, reglas pendientes-verificar, anotaciones del usuario).
- [ ] El usuario puede silenciar, convertir a terreno o anotar libremente cada hallazgo, y eso persiste en disco.
- [ ] El input "Espacios totales" del panel de datos se persiste y alimenta la regla de reserva mínima.
- [ ] La barra superior muestra contadores RIC en vivo.
- [ ] Refrescar el navegador no pierde nada.

---

## Lo que NO resuelve Plan 4 (queda para planes posteriores)

- Catálogo de materiales con precios CLP (**Plan 5**).
- Motor de cotización: dado un hallazgo, calcular materiales + mano de obra (**Plan 5**).
- PDF profesional con diagrama + tablas + simbología (Plan 6).
- Importación/exportación ZIP del cliente completo (Plan 8).
- Diagrama general inter-tableros con interconexiones (Plan 7).
- Reglas RIC adicionales (selectividad fina con curvas, secciones de tierra, coordinación con magnetotérmicos, etc.). El motor es extensible; agregar reglas es lineal.
- Edición directa del componente al clic en el diagrama. Sigue para Plan 6+.
