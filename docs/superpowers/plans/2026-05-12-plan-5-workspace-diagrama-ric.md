# Plan 5 — Workspace modular y diagrama unilineal RIC N°18 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar tarea por tarea. Pasos en sintaxis checkbox (`- [ ]`).

**Goal:** Re-trabajar el workspace en 4 tabs + arreglar empty-state RIC + extender modelo con todos los datos que RIC N°18 exige + reconstruir el diagrama unilineal con acometida, IG, barras, ramales, tierra, cuadros normativos (cargas, alimentadores, simbología, viñeta, notas).

**Architecture:** Phases A→J. Backend primero (tipos + schemas + persistencia), luego empty-state RIC (quick win), luego workspace tabs (refactor estructura), luego tab "Datos generales" con formularios para datos nuevos, luego cuadros normativos (componentes puros), luego diagrama unilineal extendido (sub-componentes SVG), luego lámina completa (composición), finalmente endpoints API y plantilla resultados E2E.

**Tech Stack:** TypeScript, Zod, React 18, Zustand, react-router-dom, Vitest, RTL, Tailwind, Express, multer. Sin nuevas dependencias.

**Spec:** [docs/superpowers/specs/2026-05-12-plan-5-workspace-diagrama-ric-design.md](../specs/2026-05-12-plan-5-workspace-diagrama-ric-design.md)

**Pre-requisito:** Branch `feature/plan-5-workspace-diagrama-ric` desde main. `npm test` debe pasar (115 tests baseline).

---

## Fase A — Modelo y schemas backend

### Tarea A1: Tipos compartidos extendidos en `tipos/modelo.ts`

**Files:**
- Modify: `tipos/modelo.ts`

- [ ] **Paso 1: Agregar al final del archivo `tipos/modelo.ts`** (después de las adiciones de Plan 4):

```typescript
// ============================================================================
// Datos eléctricos extendidos (Plan 5 — RIC N°18)
// ============================================================================

export type TipoCanalizacion =
  | 'EMT' | 'PVC-rigido' | 'PVC-flexible' | 'bandeja' | 'libre' | 'subterranea' | 'otro';

export type MaterialCanalizacion =
  | 'acero' | 'PVC' | 'aluminio' | 'fibrocemento' | 'otro';

export type TipoAcometida =
  | 'aerea' | 'subterranea' | 'desde-tablero-superior' | 'pendiente';

export type TipoElectrodoTierra =
  | 'jabalina' | 'malla' | 'multielectrodo' | 'pendiente';

export type ClaseSEC = 'A' | 'B' | 'C' | 'D';

export interface DatosAcometida {
  tipo: TipoAcometida;
  ubicacion?: string;
  tableroOrigenId?: string;
  notas?: string;
}

export interface DatosAlimentadorEntrada {
  seccionConductorMM2?: number;
  longitudM?: number;
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;
  conductoresPorFase?: number;
}

export interface DatosPuestaATierra {
  resistenciaOhmMedida?: number;
  resistenciaOhmProyectada?: number;
  instrumentoMedicion?: string;
  fechaMedicion?: string;
  tipoElectrodo?: TipoElectrodoTierra;
  notas?: string;
}

export interface DatosVineta {
  numeroLamina?: string;
  revision?: string;
  fechaEmision?: string;
  instaladorNombre?: string;
  instaladorRUT?: string;
  instaladorClaseSEC?: ClaseSEC;
  proyectoNombre?: string;
}
```

- [ ] **Paso 2: Extender la interfaz `Tablero`** (alrededor de las líneas que agregó Plan 4):

Reemplazar el bloque actual de Plan 4:
```typescript
  espaciosTotales?: number;
  circuitos: Circuito[];
  anotacionesHallazgos: AnotacionHallazgo[];
}
```

Por:
```typescript
  espaciosTotales?: number;
  circuitos: Circuito[];
  anotacionesHallazgos: AnotacionHallazgo[];

  // Plan 5 — RIC N°18
  frecuenciaHz?: number;
  capacidadNominalA?: number;
  notasGenerales?: string;
  acometida?: DatosAcometida;
  alimentadorEntrada?: DatosAlimentadorEntrada;
  puestaATierra?: DatosPuestaATierra;
  vineta?: DatosVineta;
}
```

- [ ] **Paso 3: Extender `Circuito`** con datos de canalización:

Reemplazar la interfaz `Circuito` (Plan 4), agregando los siguientes campos opcionales antes del cierre `}`:

```typescript
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;
  corrienteA?: number;
```

(Nota: `cargaW` ya existe; mantener nombre — no renombrar.)

- [ ] **Paso 4: Extender `ComponenteReconciliado`** con capacidad de cortocircuito:

Agregar antes del `procedencia: Procedencia` final:
```typescript
  capacidadCortocircuitoKA?: number;
```

- [ ] **Paso 5: Extender `Cliente`** con campos predeterminados de viñeta:

Agregar antes del cierre `}`:
```typescript
  instaladorPredeterminadoNombre?: string;
  instaladorPredeterminadoRUT?: string;
  instaladorPredeterminadoClaseSEC?: ClaseSEC;
  proyectoNombrePredeterminado?: string;
```

- [ ] **Paso 6: Verificar compilación**

```bash
npx tsc --noEmit -p apps/servidor/tsconfig.json
```

Esperado: errores en schemas Zod del backend (no conocen los campos nuevos). Se arreglan en A2.

- [ ] **Paso 7: Commit**

```bash
git add tipos/modelo.ts
git commit -m "feat(tipos): agrega tipos RIC N°18 (acometida, alimentador, tierra, viñeta)"
```

---

### Tarea A2: Schemas Zod backend extendidos

**Files:**
- Modify: `apps/servidor/src/esquemas/tablero.ts`
- Modify: `apps/servidor/src/esquemas/cliente.ts`
- Create: `apps/servidor/tests/tablero-schema-ric18.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/tablero-schema-ric18.test.ts
import { describe, it, expect } from 'vitest';
import { EsquemaTablero } from '../src/esquemas/tablero.js';

const tableroBase = {
  id: '01J', slug: 'tg', clienteId: '01C',
  codigo: 'TG', nombre: 'X', tipo: 'general',
  tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
  fotos: [], componentes: [], pendientes: [],
  circuitos: [], anotacionesHallazgos: [],
  porcentajeCompletitud: 0,
  creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
};

describe('EsquemaTablero — campos RIC N°18 (Plan 5)', () => {
  it('acepta tablero con frecuenciaHz, capacidadNominalA y notasGenerales', () => {
    const t = { ...tableroBase, frecuenciaHz: 50, capacidadNominalA: 100, notasGenerales: 'X' };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.frecuenciaHz).toBe(50);
    expect(parsed.capacidadNominalA).toBe(100);
  });

  it('acepta DatosAcometida con tipo aerea', () => {
    const t = { ...tableroBase, acometida: { tipo: 'aerea', ubicacion: 'Frontis edificio' } };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.acometida?.tipo).toBe('aerea');
  });

  it('acepta DatosAlimentadorEntrada con sección y canalización', () => {
    const t = {
      ...tableroBase,
      alimentadorEntrada: {
        seccionConductorMM2: 16, longitudM: 12,
        canalizacionTipo: 'EMT', canalizacionDiametroMM: 25, canalizacionMaterial: 'acero',
        capacidadCorrienteA: 80, conductoresPorFase: 1
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.alimentadorEntrada?.seccionConductorMM2).toBe(16);
  });

  it('acepta DatosPuestaATierra con resistencia y electrodo', () => {
    const t = {
      ...tableroBase,
      puestaATierra: {
        resistenciaOhmMedida: 4.2,
        instrumentoMedicion: 'Telurímetro Fluke 1623-2',
        tipoElectrodo: 'jabalina'
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.puestaATierra?.resistenciaOhmMedida).toBe(4.2);
  });

  it('acepta DatosVineta con instalador y lámina', () => {
    const t = {
      ...tableroBase,
      vineta: {
        numeroLamina: 'E-01', revision: 'Rev 0',
        instaladorNombre: 'Daniel Romero', instaladorRUT: '12.345.678-9',
        instaladorClaseSEC: 'A'
      }
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.vineta?.instaladorClaseSEC).toBe('A');
  });

  it('acepta Circuito con datos de canalización y corriente', () => {
    const t = {
      ...tableroBase,
      circuitos: [{
        id: '01C1', numero: 1, proteccionComponenteId: '01CC',
        destino: 'Living', uso: 'iluminacion',
        seccionConductorMM2: 2.5, longitudM: 8,
        canalizacionTipo: 'EMT', canalizacionDiametroMM: 20, canalizacionMaterial: 'PVC',
        capacidadCorrienteA: 25, corrienteA: 2.7,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.circuitos[0]!.canalizacionTipo).toBe('EMT');
  });

  it('acepta Componente con capacidadCortocircuitoKA', () => {
    const t = {
      ...tableroBase,
      componentes: [{
        id: 'c1', tipo: 'interruptor-general', calibreA: 63,
        capacidadCortocircuitoKA: 10,
        procedencia: { fuente: 'manual', confianza: 'alta' }
      }]
    };
    const parsed = EsquemaTablero.parse(t);
    expect(parsed.componentes[0]!.capacidadCortocircuitoKA).toBe(10);
  });

  it('rechaza tipoElectrodo inválido', () => {
    const t = {
      ...tableroBase,
      puestaATierra: { tipoElectrodo: 'inexistente' }
    };
    expect(() => EsquemaTablero.parse(t)).toThrow();
  });
});
```

- [ ] **Paso 2: Ejecutar y confirmar que falla**

```bash
cd apps/servidor && npx vitest run tests/tablero-schema-ric18.test.ts
```

- [ ] **Paso 3: Extender los schemas Zod en `apps/servidor/src/esquemas/tablero.ts`**

Insertar después de `EsquemaAnotacionHallazgo` (al final del archivo, antes del `export { EsquemaCircuito, EsquemaAnotacionHallazgo }`):

```typescript
const EsquemaAcometida = z.object({
  tipo: z.enum(['aerea', 'subterranea', 'desde-tablero-superior', 'pendiente']),
  ubicacion: z.string().max(300).optional(),
  tableroOrigenId: z.string().min(1).optional(),
  notas: z.string().max(1000).optional()
});

const EsquemaAlimentadorEntrada = z.object({
  seccionConductorMM2: z.number().positive().optional(),
  longitudM: z.number().positive().optional(),
  canalizacionTipo: z.enum(['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro']).optional(),
  canalizacionDiametroMM: z.number().positive().optional(),
  canalizacionMaterial: z.enum(['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro']).optional(),
  capacidadCorrienteA: z.number().positive().optional(),
  conductoresPorFase: z.number().int().positive().optional()
});

const EsquemaPuestaATierra = z.object({
  resistenciaOhmMedida: z.number().nonnegative().optional(),
  resistenciaOhmProyectada: z.number().nonnegative().optional(),
  instrumentoMedicion: z.string().max(200).optional(),
  fechaMedicion: z.string().optional(),
  tipoElectrodo: z.enum(['jabalina', 'malla', 'multielectrodo', 'pendiente']).optional(),
  notas: z.string().max(1000).optional()
});

const EsquemaVineta = z.object({
  numeroLamina: z.string().max(50).optional(),
  revision: z.string().max(50).optional(),
  fechaEmision: z.string().optional(),
  instaladorNombre: z.string().max(200).optional(),
  instaladorRUT: z.string().max(30).optional(),
  instaladorClaseSEC: z.enum(['A', 'B', 'C', 'D']).optional(),
  proyectoNombre: z.string().max(200).optional()
});

export { EsquemaAcometida, EsquemaAlimentadorEntrada, EsquemaPuestaATierra, EsquemaVineta };
```

(El export de `EsquemaCircuito` y `EsquemaAnotacionHallazgo` ya existe — agregar los nuevos al export final o crear un export separado como arriba.)

- [ ] **Paso 4: Extender `EsquemaCircuito`** (en el mismo archivo, dentro del `z.object({...})` de circuito) — agregar después de `cargaW: z.number().positive().optional()`:

```typescript
  canalizacionTipo: z.enum(['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro']).optional(),
  canalizacionDiametroMM: z.number().positive().optional(),
  canalizacionMaterial: z.enum(['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro']).optional(),
  capacidadCorrienteA: z.number().positive().optional(),
  corrienteA: z.number().positive().optional(),
```

- [ ] **Paso 5: Extender `EsquemaComponenteReconciliado`** — agregar antes de `procedencia`:

```typescript
  capacidadCortocircuitoKA: z.number().positive().optional(),
```

- [ ] **Paso 6: Extender `EsquemaTablero`** — agregar después de `espaciosTotales`:

```typescript
  frecuenciaHz: z.number().positive().optional(),
  capacidadNominalA: z.number().positive().optional(),
  notasGenerales: z.string().max(5000).optional(),
  acometida: EsquemaAcometida.optional(),
  alimentadorEntrada: EsquemaAlimentadorEntrada.optional(),
  puestaATierra: EsquemaPuestaATierra.optional(),
  vineta: EsquemaVineta.optional(),
```

- [ ] **Paso 7: Extender `EsquemaTableroEntrada`** — agregar al `.extend({...})` los mismos campos nuevos (para que `actualizarTablero` pueda persistirlos):

```typescript
    frecuenciaHz: z.number().positive().optional(),
    capacidadNominalA: z.number().positive().optional(),
    notasGenerales: z.string().max(5000).optional(),
    acometida: EsquemaAcometida.optional(),
    alimentadorEntrada: EsquemaAlimentadorEntrada.optional(),
    puestaATierra: EsquemaPuestaATierra.optional(),
    vineta: EsquemaVineta.optional()
```

- [ ] **Paso 8: Extender `EsquemaCliente`** en `apps/servidor/src/esquemas/cliente.ts` con los campos predeterminados — agregar al `z.object({...})` antes del cierre:

```typescript
  instaladorPredeterminadoNombre: z.string().max(200).optional(),
  instaladorPredeterminadoRUT: z.string().max(30).optional(),
  instaladorPredeterminadoClaseSEC: z.enum(['A', 'B', 'C', 'D']).optional(),
  proyectoNombrePredeterminado: z.string().max(200).optional(),
```

Y extender `EsquemaClienteEntrada` (o equivalente) con los mismos campos para permitir actualización.

- [ ] **Paso 9: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run
```

Esperado: todos los tests pasan (los 115 previos + 8 nuevos = 123).

- [ ] **Paso 10: Commit**

```bash
git add apps/servidor/src/esquemas/tablero.ts apps/servidor/src/esquemas/cliente.ts apps/servidor/tests/tablero-schema-ric18.test.ts
git commit -m "feat(servidor): schemas Zod para datos RIC N°18 (acometida, alimentador, tierra, viñeta)"
```

---

### Tarea A3: Soporte en `actualizarTablero` y `actualizarCliente`

**Files:**
- Modify: `apps/servidor/src/almacen/tablero.ts` (función `actualizarTablero`)
- Modify: `apps/servidor/src/almacen/cliente.ts` (función `actualizarCliente`)
- Modify: `apps/servidor/tests/almacen-tablero.test.ts`
- Modify: `apps/servidor/tests/almacen-cliente.test.ts`

- [ ] **Paso 1: Test fallido en `almacen-tablero.test.ts`**

Agregar al describe principal:

```typescript
  it('persiste acometida, alimentadorEntrada y vineta vía actualizarTablero', async () => {
    const dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const cliente = await crearCliente({ nombre: 'Foo' });
    const t = await crearTablero(cliente.slug, {
      codigo: 'TG', nombre: 'X', tipo: 'general',
      tensionSistema: 'pendiente', esquemaTierra: 'pendiente'
    });
    const actualizado = await actualizarTablero(cliente.slug, t.slug, {
      frecuenciaHz: 50,
      acometida: { tipo: 'aerea', ubicacion: 'Frontis' },
      alimentadorEntrada: { seccionConductorMM2: 16, longitudM: 12 },
      vineta: { numeroLamina: 'E-01', revision: 'Rev 0' }
    });
    expect(actualizado.acometida?.tipo).toBe('aerea');
    expect(actualizado.alimentadorEntrada?.seccionConductorMM2).toBe(16);
    expect(actualizado.vineta?.numeroLamina).toBe('E-01');
    expect(actualizado.frecuenciaHz).toBe(50);
    const releido = await leerTablero(cliente.slug, t.slug);
    expect(releido.acometida?.tipo).toBe('aerea');
  });
```

- [ ] **Paso 2: Test fallido en `almacen-cliente.test.ts`**

```typescript
  it('persiste instaladorPredeterminado* vía actualizarCliente', async () => {
    const dir = await crearDirTemporal();
    process.env.DIRECTORIO_PROYECTOS = dir;
    const c = await crearCliente({ nombre: 'Acme' });
    const actualizado = await actualizarCliente(c.slug, {
      instaladorPredeterminadoNombre: 'Daniel R.',
      instaladorPredeterminadoRUT: '12.345.678-9',
      instaladorPredeterminadoClaseSEC: 'A',
      proyectoNombrePredeterminado: 'Edificio Acme'
    });
    expect(actualizado.instaladorPredeterminadoClaseSEC).toBe('A');
    expect(actualizado.proyectoNombrePredeterminado).toBe('Edificio Acme');
  });
```

(Si el nombre del helper o el flag de env es distinto, copiar del patrón existente — los tests almacen-cliente.test.ts del Plan 2 ya usan ese helper.)

- [ ] **Paso 3: Ejecutar y confirmar que fallan**

```bash
cd apps/servidor && npx vitest run tests/almacen-tablero.test.ts tests/almacen-cliente.test.ts
```

- [ ] **Paso 4: Actualizar `actualizarTablero` en `apps/servidor/src/almacen/tablero.ts`**

Dentro del spread de la función, junto a los otros `...(parche.X !== undefined && {X: parche.X})`, agregar:

```typescript
    ...(parche.frecuenciaHz !== undefined && { frecuenciaHz: parche.frecuenciaHz }),
    ...(parche.capacidadNominalA !== undefined && { capacidadNominalA: parche.capacidadNominalA }),
    ...(parche.notasGenerales !== undefined && { notasGenerales: parche.notasGenerales }),
    ...(parche.acometida !== undefined && { acometida: parche.acometida }),
    ...(parche.alimentadorEntrada !== undefined && { alimentadorEntrada: parche.alimentadorEntrada }),
    ...(parche.puestaATierra !== undefined && { puestaATierra: parche.puestaATierra }),
    ...(parche.vineta !== undefined && { vineta: parche.vineta }),
```

- [ ] **Paso 5: Actualizar `actualizarCliente` en `apps/servidor/src/almacen/cliente.ts`** análogamente:

```typescript
    ...(parche.instaladorPredeterminadoNombre !== undefined && { instaladorPredeterminadoNombre: parche.instaladorPredeterminadoNombre }),
    ...(parche.instaladorPredeterminadoRUT !== undefined && { instaladorPredeterminadoRUT: parche.instaladorPredeterminadoRUT }),
    ...(parche.instaladorPredeterminadoClaseSEC !== undefined && { instaladorPredeterminadoClaseSEC: parche.instaladorPredeterminadoClaseSEC }),
    ...(parche.proyectoNombrePredeterminado !== undefined && { proyectoNombrePredeterminado: parche.proyectoNombrePredeterminado }),
```

- [ ] **Paso 6: Verificar tests pasan**

```bash
cd apps/servidor && npx vitest run
```

- [ ] **Paso 7: Commit**

```bash
git add apps/servidor/src/almacen/tablero.ts apps/servidor/src/almacen/cliente.ts apps/servidor/tests/almacen-tablero.test.ts apps/servidor/tests/almacen-cliente.test.ts
git commit -m "feat(servidor): actualizarTablero/actualizarCliente soportan campos RIC N°18"
```

---

## Fase B — Empty-state RIC

### Tarea B1: Función pura `tableroEstaVacio`

**Files:**
- Create: `tipos/ric/empty-state.ts`
- Create: `apps/servidor/tests/ric/empty-state.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/servidor/tests/ric/empty-state.test.ts
import { describe, it, expect } from 'vitest';
import { tableroEstaVacio } from '../../../../tipos/ric/empty-state.js';
import type { Tablero } from '../../../../tipos/modelo.js';

function vacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('tableroEstaVacio', () => {
  it('devuelve true para tablero recién creado', () => {
    expect(tableroEstaVacio(vacio())).toBe(true);
  });

  it('false si tiene componentes', () => {
    const t = vacio();
    t.componentes = [{ id: 'c1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tiene circuitos', () => {
    const t = vacio();
    t.circuitos = [{ id: 'c1', numero: 1, proteccionComponenteId: 'p1', destino: 'X', uso: 'iluminacion', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tensionSistema fue definido', () => {
    const t = vacio();
    t.tensionSistema = '220V-mono';
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si esquemaTierra fue definido', () => {
    const t = vacio();
    t.esquemaTierra = 'TT';
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si espaciosTotales fue definido', () => {
    const t = vacio();
    t.espaciosTotales = 24;
    expect(tableroEstaVacio(t)).toBe(false);
  });

  it('false si tiene fotos', () => {
    const t = vacio();
    t.fotos = [{
      id: 'f1', nombreOriginal: 'a.jpg', mimeType: 'image/jpeg',
      calidadFoto: 'buena', problemasFoto: [], subidaEn: '2026-05-12T00:00:00Z'
    }];
    expect(tableroEstaVacio(t)).toBe(false);
  });
});
```

- [ ] **Paso 2: Ejecutar y confirmar que falla**

```bash
cd apps/servidor && npx vitest run tests/ric/empty-state.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// tipos/ric/empty-state.ts
import type { Tablero } from '../modelo.js';

export function tableroEstaVacio(t: Tablero): boolean {
  return (
    t.componentes.length === 0 &&
    t.circuitos.length === 0 &&
    t.fotos.length === 0 &&
    t.tensionSistema === 'pendiente' &&
    t.esquemaTierra === 'pendiente' &&
    t.espaciosTotales === undefined
  );
}
```

- [ ] **Paso 4: Verificar tests pasan**

- [ ] **Paso 5: Commit**

```bash
git add tipos/ric/empty-state.ts apps/servidor/tests/ric/empty-state.test.ts
git commit -m "feat(ric): función pura tableroEstaVacio para empty-state UX"
```

---

### Tarea B2: `PanelAnalisisRIC` respeta empty-state

**Files:**
- Modify: `apps/web/src/componentes/PanelAnalisisRIC.tsx`
- Modify: `apps/web/tests/PanelAnalisisRIC.test.tsx`

- [ ] **Paso 1: Test fallido — agregar al describe existente**:

```typescript
  it('muestra empty-state cuando el tablero está vacío', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getByText(/Tablero sin datos/i)).toBeDefined();
    // No debe mostrar la lista de hallazgos
    expect(screen.queryAllByText(/RIC N°/).length).toBe(0);
  });

  it('muestra hallazgos normales cuando el tablero tiene al menos un dato', () => {
    const t = tableroVacio();
    t.tensionSistema = '220V-mono';   // un solo campo basta
    render(<PanelAnalisisRIC tablero={t} clienteSlug="c" tableroSlug="t" />);
    // Ahora debe mostrar reglas
    expect(screen.queryAllByText(/RIC N°/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tablero sin datos/i)).toBeNull();
  });
```

- [ ] **Paso 2: Ejecutar y confirmar que falla**

```bash
cd apps/web && npx vitest run tests/PanelAnalisisRIC.test.tsx
```

- [ ] **Paso 3: Modificar `PanelAnalisisRIC.tsx`**

Agregar import al inicio:
```typescript
import { tableroEstaVacio } from '../../../../tipos/ric/empty-state.js';
```

Dentro del componente, antes del `return`, agregar:

```typescript
  if (tableroEstaVacio(tablero)) {
    return (
      <div className="bg-white border rounded p-4 h-full">
        <h2 className="font-semibold mb-3">Análisis RIC</h2>
        <div className="text-center py-8 space-y-3">
          <p className="text-slate-700 font-medium">Tablero sin datos</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Para que aparezca el análisis RIC necesitamos al menos uno de:
          </p>
          <ul className="text-sm text-slate-500 list-disc list-inside max-w-md mx-auto text-left">
            <li>Fotos del tablero subidas</li>
            <li>Datos manuales en el tab "Datos generales"</li>
            <li>Componentes o circuitos ingresados manualmente</li>
          </ul>
        </div>
      </div>
    );
  }
```

- [ ] **Paso 4: Verificar tests pasan**

```bash
cd apps/web && npx vitest run
```

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/componentes/PanelAnalisisRIC.tsx apps/web/tests/PanelAnalisisRIC.test.tsx
git commit -m "feat(web): empty-state en PanelAnalisisRIC cuando el tablero está vacío"
```

---

### Tarea B3: `BarraCompletitud` respeta empty-state

**Files:**
- Modify: `apps/web/src/componentes/BarraCompletitud.tsx`

- [ ] **Paso 1: Modificar el bloque de contadores RIC agregado en Plan 4**.

Envolver el bloque IIFE actual (que computa `hallazgosNoCumple` y `terreno`) en un condicional:

```tsx
{tableroEstaVacio(tablero) ? (
  <div className="text-xs text-slate-500 mt-1 italic">
    Tablero sin datos — completa la información para empezar
  </div>
) : (
  (() => {
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
  })()
)}
```

Agregar import:
```tsx
import { tableroEstaVacio } from '../../../../tipos/ric/empty-state.js';
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/componentes/BarraCompletitud.tsx
git commit -m "feat(web): BarraCompletitud respeta empty-state del tablero"
```

---

## Fase C — Workspace en tabs

### Tarea C1: Hook `useTabActiva`

**Files:**
- Create: `apps/web/src/hooks/useTabActiva.ts`
- Create: `apps/web/tests/useTabActiva.test.ts`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/web/tests/useTabActiva.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useTabActiva } from '../src/hooks/useTabActiva.js';

function wrapper({ children, initialEntries }: { children: React.ReactNode; initialEntries: string[] }) {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
}

describe('useTabActiva', () => {
  it('devuelve tab por defecto cuando no hay query param', () => {
    const { result } = renderHook(() => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']), {
      wrapper: ({ children }) => wrapper({ children, initialEntries: ['/'] })
    });
    expect(result.current.tab).toBe('datos-generales');
  });

  it('lee el query param ?tab=', () => {
    const { result } = renderHook(() => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']), {
      wrapper: ({ children }) => wrapper({ children, initialEntries: ['/?tab=diagrama'] })
    });
    expect(result.current.tab).toBe('diagrama');
  });

  it('rechaza valores fuera de la lista permitida y vuelve al default', () => {
    const { result } = renderHook(() => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']), {
      wrapper: ({ children }) => wrapper({ children, initialEntries: ['/?tab=basura'] })
    });
    expect(result.current.tab).toBe('datos-generales');
  });

  it('cambiar la tab actualiza el query param', () => {
    const { result } = renderHook(() => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']), {
      wrapper: ({ children }) => wrapper({ children, initialEntries: ['/?tab=fotos'] })
    });
    act(() => result.current.setTab('ric'));
    expect(result.current.tab).toBe('ric');
  });
});
```

- [ ] **Paso 2: Ejecutar y confirmar que falla**

```bash
cd apps/web && npx vitest run tests/useTabActiva.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// apps/web/src/hooks/useTabActiva.ts
import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useTabActiva<T extends string>(defecto: T, permitidos: readonly T[]) {
  const [params, setParams] = useSearchParams();
  const valor = params.get('tab') as T | null;
  const tab: T = valor && permitidos.includes(valor) ? valor : defecto;

  const setTab = useCallback((nueva: T) => {
    const next = new URLSearchParams(params);
    next.set('tab', nueva);
    setParams(next, { replace: false });
  }, [params, setParams]);

  return { tab, setTab };
}
```

- [ ] **Paso 4: Verificar tests pasan**

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/hooks/useTabActiva.ts apps/web/tests/useTabActiva.test.ts
git commit -m "feat(web): hook useTabActiva sincroniza tab con query param"
```

---

### Tarea C2: Refactor `WorkspaceTablero` con tabs

**Files:**
- Modify: `apps/web/src/pantallas/WorkspaceTablero.tsx`
- Create: `apps/web/src/componentes/tabs/TabDiagrama.tsx` (wrapper temporal)
- Create: `apps/web/src/componentes/tabs/TabAnalisisRIC.tsx` (wrapper temporal)
- Create: `apps/web/src/componentes/tabs/TabFotosComponentes.tsx` (wrapper temporal)
- Create: `apps/web/src/componentes/tabs/TabDatosGenerales.tsx` (wrapper temporal con placeholder)

> Esta tarea introduce **el esqueleto** de los 4 tabs. Los contenidos reales de cada tab vienen en fases D, E, F, G. Los wrappers de esta tarea muestran lo que ya existe en Plan 4 (solo movido) o un placeholder.

- [ ] **Paso 1: Crear `TabDatosGenerales.tsx` (placeholder por ahora)**

```tsx
// apps/web/src/componentes/tabs/TabDatosGenerales.tsx
import type { Tablero, Cliente } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabDatosGenerales(_props: Props) {
  return (
    <div className="bg-white border rounded p-6">
      <p className="text-sm text-slate-500">Formulario de datos generales — en construcción (Fase D del Plan 5).</p>
    </div>
  );
}
```

- [ ] **Paso 2: Crear `TabFotosComponentes.tsx`** que combina los paneles existentes:

```tsx
// apps/web/src/componentes/tabs/TabFotosComponentes.tsx
import type { Tablero } from '@tipos/modelo';
import { PanelFotos } from '../PanelFotos.js';
import { PanelComponentes } from '../PanelComponentes.js';
import { PanelPendientes } from '../PanelPendientes.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
  componenteResaltadoId: string | null;
}

export function TabFotosComponentes({ tablero, clienteSlug, tableroSlug, componenteResaltadoId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4">
          <PanelFotos tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        </div>
        <div className="col-span-8">
          <PanelComponentes
            tablero={tablero}
            clienteSlug={clienteSlug}
            tableroSlug={tableroSlug}
            componenteResaltadoId={componenteResaltadoId}
          />
        </div>
      </div>
      <PanelPendientes tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}
```

- [ ] **Paso 3: Crear `TabDiagrama.tsx`** (wrapper temporal del diagrama existente):

```tsx
// apps/web/src/componentes/tabs/TabDiagrama.tsx
import type { Tablero, Cliente } from '@tipos/modelo';
import { DiagramaSVG } from '../../diagrama/DiagramaSVG.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function TabDiagrama({ tablero, cliente, onClicComponente }: Props) {
  return (
    <div className="bg-white border rounded p-4 h-[700px]">
      <DiagramaSVG
        tablero={tablero}
        nombreCliente={cliente?.nombre}
        onClicComponente={onClicComponente}
      />
    </div>
  );
}
```

- [ ] **Paso 4: Crear `TabAnalisisRIC.tsx`** (wrapper del panel existente):

```tsx
// apps/web/src/componentes/tabs/TabAnalisisRIC.tsx
import type { Tablero } from '@tipos/modelo';
import { PanelAnalisisRIC } from '../PanelAnalisisRIC.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabAnalisisRIC({ tablero, clienteSlug, tableroSlug }: Props) {
  return <PanelAnalisisRIC tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />;
}
```

- [ ] **Paso 5: Reescribir `WorkspaceTablero.tsx`** completo (reemplaza el archivo):

```tsx
// apps/web/src/pantallas/WorkspaceTablero.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTableroStore } from '../estado/tableroStore.js';
import { useClienteStore } from '../estado/clienteStore.js';
import { useTabActiva } from '../hooks/useTabActiva.js';
import { BarraCompletitud } from '../componentes/BarraCompletitud.js';
import { TabDatosGenerales } from '../componentes/tabs/TabDatosGenerales.js';
import { TabFotosComponentes } from '../componentes/tabs/TabFotosComponentes.js';
import { TabDiagrama } from '../componentes/tabs/TabDiagrama.js';
import { TabAnalisisRIC } from '../componentes/tabs/TabAnalisisRIC.js';

type TabId = 'datos-generales' | 'fotos-componentes' | 'diagrama' | 'ric';
const TABS_PERMITIDAS: readonly TabId[] = ['datos-generales', 'fotos-componentes', 'diagrama', 'ric'];

const NOMBRES_TAB: Record<TabId, string> = {
  'datos-generales': 'Datos generales',
  'fotos-componentes': 'Fotos y componentes',
  'diagrama': 'Diagrama',
  'ric': 'Análisis RIC'
};

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  const { tablero, cargando, error, cargar, limpiar } = useTableroStore();
  const { clientes, cargarTodos } = useClienteStore();
  const [componenteResaltadoId, setComponenteResaltadoId] = useState<string | null>(null);
  const { tab, setTab } = useTabActiva<TabId>('fotos-componentes', TABS_PERMITIDAS);

  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  useEffect(() => {
    if (clientes.length === 0) cargarTodos();
  }, [clientes.length, cargarTodos]);

  if (cargando) return <div className="p-8 text-slate-500">Cargando tablero...</div>;
  if (error) return (
    <div className="p-8">
      <Link to="/clientes" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded text-red-900">{error}</div>
    </div>
  );
  if (!tablero) return null;

  const cliente = clientes.find(c => c.slug === clienteSlug);

  return (
    <div className="min-h-full flex flex-col">
      <BarraCompletitud tablero={tablero} />
      <div className="px-6 py-2">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Lista de clientes</Link>
      </div>
      <div className="px-6 border-b">
        <nav className="flex gap-1">
          {TABS_PERMITIDAS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {NOMBRES_TAB[t]}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-6">
        {tab === 'datos-generales' && (
          <TabDatosGenerales
            tablero={tablero}
            cliente={cliente}
            clienteSlug={clienteSlug!}
            tableroSlug={tableroSlug!}
          />
        )}
        {tab === 'fotos-componentes' && (
          <TabFotosComponentes
            tablero={tablero}
            clienteSlug={clienteSlug!}
            tableroSlug={tableroSlug!}
            componenteResaltadoId={componenteResaltadoId}
          />
        )}
        {tab === 'diagrama' && (
          <TabDiagrama
            tablero={tablero}
            cliente={cliente}
            onClicComponente={setComponenteResaltadoId}
          />
        )}
        {tab === 'ric' && (
          <TabAnalisisRIC tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 6: Verificar compilación + tests**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json && npx vitest run
```

- [ ] **Paso 7: Verificación manual rápida**

`npm run dev`, abrir un tablero existente. Debe verse el nav con 4 tabs. Default = "Fotos y componentes" muestra los paneles de Plan 4 movidos. Cambiar de tab debe actualizar URL con `?tab=...` y al recargar conserva.

- [ ] **Paso 8: Commit**

```bash
git add apps/web/src/pantallas/WorkspaceTablero.tsx apps/web/src/componentes/tabs/
git commit -m "feat(web): workspace en 4 tabs horizontales con deep-linking"
```

---

## Fase D — Tab "Datos generales"

Esta fase construye el formulario completo. Patrón: subdividir en sub-componentes pequeños, cada uno con su propio commit. Todos siguen el patrón "state local + guardar" que ya usa `PanelPendientes.tsx`.

### Tarea D1: API frontend para los nuevos campos

**Files:**
- Modify: `apps/web/src/api/cliente.ts`

- [ ] **Paso 1: Extender el tipo del parámetro de `apiTableros.actualizar`** para aceptar los nuevos sub-objetos. Reemplazar la línea actual de `actualizar:` por:

```typescript
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
```

- [ ] **Paso 2: Extender el tipo del parámetro de `apiClientes.actualizar`** análogamente:

```typescript
  actualizar: (slug: string, datos: Partial<{
    nombre: string; rut: string; direccion: string;
    contactoNombre: string; contactoTelefono: string; contactoEmail: string;
    instaladorPredeterminadoNombre: string;
    instaladorPredeterminadoRUT: string;
    instaladorPredeterminadoClaseSEC: 'A' | 'B' | 'C' | 'D';
    proyectoNombrePredeterminado: string;
  }>) =>
    pedir<Cliente>('PUT', `/api/clientes/${slug}`, datos),
```

- [ ] **Paso 3: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/api/cliente.ts
git commit -m "feat(web): api tipada para campos RIC N°18 (tablero + cliente)"
```

---

### Tarea D2: Sub-componente `FormularioDatosElectricos`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioDatosElectricos.tsx`

> Este formulario reemplaza los inputs de tensión/esquema/potencia/corriente/espaciosTotales que actualmente viven dentro de `PanelPendientes.tsx`. **Después de esta fase**, `PanelPendientes` queda sólo con la lista de pendientes (no datos eléctricos).

- [ ] **Paso 1: Crear el componente**

```tsx
// apps/web/src/componentes/datos-generales/FormularioDatosElectricos.tsx
import { useEffect, useState } from 'react';
import type { Tablero, TensionSistema, EsquemaTierra } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioDatosElectricos({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [tension, setTension] = useState<TensionSistema>(tablero.tensionSistema);
  const [esquema, setEsquema] = useState<EsquemaTierra>(tablero.esquemaTierra);
  const [potencia, setPotencia] = useState(tablero.potenciaContratadaKW?.toString() ?? '');
  const [corriente, setCorriente] = useState(tablero.corrienteNominalA?.toString() ?? '');
  const [espacios, setEspacios] = useState(tablero.espaciosTotales?.toString() ?? '');
  const [frecuencia, setFrecuencia] = useState(tablero.frecuenciaHz?.toString() ?? '50');
  const [capacidad, setCapacidad] = useState(tablero.capacidadNominalA?.toString() ?? '');

  useEffect(() => {
    setTension(tablero.tensionSistema);
    setEsquema(tablero.esquemaTierra);
    setPotencia(tablero.potenciaContratadaKW?.toString() ?? '');
    setCorriente(tablero.corrienteNominalA?.toString() ?? '');
    setEspacios(tablero.espaciosTotales?.toString() ?? '');
    setFrecuencia(tablero.frecuenciaHz?.toString() ?? '50');
    setCapacidad(tablero.capacidadNominalA?.toString() ?? '');
  }, [tablero]);

  const num = (s: string) => s ? Number(s) : undefined;

  async function guardar() {
    const pN = num(potencia), cN = num(corriente), eN = num(espacios), fN = num(frecuencia), kN = num(capacidad);
    await actualizarDatos(clienteSlug, tableroSlug, {
      tensionSistema: tension,
      esquemaTierra: esquema,
      ...(pN !== undefined && !Number.isNaN(pN) && { potenciaContratadaKW: pN }),
      ...(cN !== undefined && !Number.isNaN(cN) && { corrienteNominalA: cN }),
      ...(eN !== undefined && !Number.isNaN(eN) && { espaciosTotales: eN }),
      ...(fN !== undefined && !Number.isNaN(fN) && { frecuenciaHz: fN }),
      ...(kN !== undefined && !Number.isNaN(kN) && { capacidadNominalA: kN })
    });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Datos eléctricos</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Tensión del sistema
          <select value={tension} onChange={e => setTension(e.target.value as TensionSistema)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="220V-mono">220V monofásico</option>
            <option value="380V-trif">380V trifásico</option>
            <option value="380V/220V-trif-n">380V/220V trifásico + N</option>
          </select>
        </label>
        <label className="text-sm">
          Esquema de tierra
          <select value={esquema} onChange={e => setEsquema(e.target.value as EsquemaTierra)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="TT">TT</option>
            <option value="TN-S">TN-S</option>
            <option value="TN-C-S">TN-C-S</option>
            <option value="IT">IT</option>
          </select>
        </label>
        <label className="text-sm">
          Frecuencia (Hz)
          <input type="number" value={frecuencia} onChange={e => setFrecuencia(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Potencia contratada (kW)
          <input type="number" step="0.1" value={potencia} onChange={e => setPotencia(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Corriente nominal (A)
          <input type="number" step="0.1" value={corriente} onChange={e => setCorriente(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Capacidad nominal del gabinete (A)
          <input type="number" step="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Espacios totales
          <input type="number" min="1" value={espacios} onChange={e => setEspacios(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar datos eléctricos</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/
git commit -m "feat(web): FormularioDatosElectricos (tensión, esquema, frecuencia, potencia, corriente, capacidad, espacios)"
```

---

### Tarea D3: Sub-componente `FormularioAcometida`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioAcometida.tsx`

- [ ] **Paso 1: Crear**

```tsx
import { useEffect, useState } from 'react';
import type { Tablero, DatosAcometida, TipoAcometida } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioAcometida({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const inicial: DatosAcometida = tablero.acometida ?? { tipo: 'pendiente' };
  const [tipo, setTipo] = useState<TipoAcometida>(inicial.tipo);
  const [ubicacion, setUbicacion] = useState(inicial.ubicacion ?? '');
  const [notas, setNotas] = useState(inicial.notas ?? '');

  useEffect(() => {
    setTipo(inicial.tipo);
    setUbicacion(inicial.ubicacion ?? '');
    setNotas(inicial.notas ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablero.acometida]);

  async function guardar() {
    await actualizarDatos(clienteSlug, tableroSlug, {
      acometida: {
        tipo,
        ...(ubicacion && { ubicacion }),
        ...(notas && { notas })
      }
    });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Acometida</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Tipo
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoAcometida)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="aerea">aérea</option>
            <option value="subterranea">subterránea</option>
            <option value="desde-tablero-superior">desde tablero superior</option>
          </select>
        </label>
        <label className="text-sm">
          Ubicación
          <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" placeholder="Ej. Frontis edificio" />
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar acometida</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/FormularioAcometida.tsx
git commit -m "feat(web): FormularioAcometida (tipo, ubicación, notas)"
```

---

### Tarea D4: Sub-componente `FormularioAlimentadorEntrada`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioAlimentadorEntrada.tsx`

- [ ] **Paso 1: Crear**

```tsx
import { useEffect, useState } from 'react';
import type { Tablero, DatosAlimentadorEntrada, TipoCanalizacion, MaterialCanalizacion } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const CANALIZACIONES: TipoCanalizacion[] = ['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro'];
const MATERIALES: MaterialCanalizacion[] = ['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro'];

export function FormularioAlimentadorEntrada({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const a = tablero.alimentadorEntrada ?? {};
  const [seccion, setSeccion] = useState(a.seccionConductorMM2?.toString() ?? '');
  const [longitud, setLongitud] = useState(a.longitudM?.toString() ?? '');
  const [canTipo, setCanTipo] = useState<TipoCanalizacion | ''>(a.canalizacionTipo ?? '');
  const [canDiam, setCanDiam] = useState(a.canalizacionDiametroMM?.toString() ?? '');
  const [canMat, setCanMat] = useState<MaterialCanalizacion | ''>(a.canalizacionMaterial ?? '');
  const [capacidad, setCapacidad] = useState(a.capacidadCorrienteA?.toString() ?? '');
  const [conductores, setConductores] = useState(a.conductoresPorFase?.toString() ?? '1');

  useEffect(() => {
    const x = tablero.alimentadorEntrada ?? {};
    setSeccion(x.seccionConductorMM2?.toString() ?? '');
    setLongitud(x.longitudM?.toString() ?? '');
    setCanTipo(x.canalizacionTipo ?? '');
    setCanDiam(x.canalizacionDiametroMM?.toString() ?? '');
    setCanMat(x.canalizacionMaterial ?? '');
    setCapacidad(x.capacidadCorrienteA?.toString() ?? '');
    setConductores(x.conductoresPorFase?.toString() ?? '1');
  }, [tablero.alimentadorEntrada]);

  const numOpt = (s: string): number | undefined => s ? Number(s) : undefined;

  async function guardar() {
    const payload: DatosAlimentadorEntrada = {
      ...(numOpt(seccion) !== undefined && { seccionConductorMM2: numOpt(seccion) }),
      ...(numOpt(longitud) !== undefined && { longitudM: numOpt(longitud) }),
      ...(canTipo && { canalizacionTipo: canTipo }),
      ...(numOpt(canDiam) !== undefined && { canalizacionDiametroMM: numOpt(canDiam) }),
      ...(canMat && { canalizacionMaterial: canMat }),
      ...(numOpt(capacidad) !== undefined && { capacidadCorrienteA: numOpt(capacidad) }),
      ...(numOpt(conductores) !== undefined && { conductoresPorFase: numOpt(conductores) })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { alimentadorEntrada: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Alimentador de entrada</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Sección conductor (mm²)
          <input type="number" step="0.5" value={seccion} onChange={e => setSeccion(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Longitud (m)
          <input type="number" step="0.1" value={longitud} onChange={e => setLongitud(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Canalización: tipo
          <select value={canTipo} onChange={e => setCanTipo(e.target.value as TipoCanalizacion)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            {CANALIZACIONES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Canalización: Ø (mm)
          <input type="number" step="1" value={canDiam} onChange={e => setCanDiam(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Canalización: material
          <select value={canMat} onChange={e => setCanMat(e.target.value as MaterialCanalizacion)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            {MATERIALES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Capacidad de corriente (A)
          <input type="number" step="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Conductores por fase
          <input type="number" min="1" value={conductores} onChange={e => setConductores(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar alimentador</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/FormularioAlimentadorEntrada.tsx
git commit -m "feat(web): FormularioAlimentadorEntrada (sección, longitud, canalización, capacidad)"
```

---

### Tarea D5: Sub-componente `FormularioPuestaATierra`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioPuestaATierra.tsx`

- [ ] **Paso 1: Crear**

```tsx
import { useEffect, useState } from 'react';
import type { Tablero, DatosPuestaATierra, TipoElectrodoTierra } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioPuestaATierra({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const p = tablero.puestaATierra ?? {};
  const [rMedida, setRMedida] = useState(p.resistenciaOhmMedida?.toString() ?? '');
  const [rProyectada, setRProyectada] = useState(p.resistenciaOhmProyectada?.toString() ?? '');
  const [instrumento, setInstrumento] = useState(p.instrumentoMedicion ?? '');
  const [fecha, setFecha] = useState(p.fechaMedicion ?? '');
  const [electrodo, setElectrodo] = useState<TipoElectrodoTierra>(p.tipoElectrodo ?? 'pendiente');
  const [notas, setNotas] = useState(p.notas ?? '');

  useEffect(() => {
    const x = tablero.puestaATierra ?? {};
    setRMedida(x.resistenciaOhmMedida?.toString() ?? '');
    setRProyectada(x.resistenciaOhmProyectada?.toString() ?? '');
    setInstrumento(x.instrumentoMedicion ?? '');
    setFecha(x.fechaMedicion ?? '');
    setElectrodo(x.tipoElectrodo ?? 'pendiente');
    setNotas(x.notas ?? '');
  }, [tablero.puestaATierra]);

  const numOpt = (s: string): number | undefined => s ? Number(s) : undefined;

  async function guardar() {
    const payload: DatosPuestaATierra = {
      ...(numOpt(rMedida) !== undefined && { resistenciaOhmMedida: numOpt(rMedida) }),
      ...(numOpt(rProyectada) !== undefined && { resistenciaOhmProyectada: numOpt(rProyectada) }),
      ...(instrumento && { instrumentoMedicion: instrumento }),
      ...(fecha && { fechaMedicion: fecha }),
      tipoElectrodo: electrodo,
      ...(notas && { notas })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { puestaATierra: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Puesta a tierra</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Resistencia medida (Ω)
          <input type="number" step="0.01" value={rMedida} onChange={e => setRMedida(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Resistencia proyectada (Ω)
          <input type="number" step="0.01" value={rProyectada} onChange={e => setRProyectada(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instrumento de medición
          <input type="text" value={instrumento} onChange={e => setInstrumento(e.target.value)} placeholder="Ej. Telurímetro Fluke 1623-2" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Fecha de medición
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Tipo de electrodo
          <select value={electrodo} onChange={e => setElectrodo(e.target.value as TipoElectrodoTierra)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="pendiente">pendiente</option>
            <option value="jabalina">jabalina</option>
            <option value="malla">malla</option>
            <option value="multielectrodo">multielectrodo</option>
          </select>
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar puesta a tierra</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/FormularioPuestaATierra.tsx
git commit -m "feat(web): FormularioPuestaATierra (resistencia, instrumento, electrodo)"
```

---

### Tarea D6: Sub-componente `FormularioVineta`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioVineta.tsx`

- [ ] **Paso 1: Crear**

```tsx
import { useEffect, useState } from 'react';
import type { Tablero, Cliente, DatosVineta, ClaseSEC } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioVineta({ tablero, cliente, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const v = tablero.vineta ?? {};
  const [numeroLamina, setNumeroLamina] = useState(v.numeroLamina ?? '');
  const [revision, setRevision] = useState(v.revision ?? '');
  const [fecha, setFecha] = useState(v.fechaEmision ?? '');
  const [instalador, setInstalador] = useState(v.instaladorNombre ?? '');
  const [rut, setRut] = useState(v.instaladorRUT ?? '');
  const [clase, setClase] = useState<ClaseSEC | ''>(v.instaladorClaseSEC ?? '');
  const [proyecto, setProyecto] = useState(v.proyectoNombre ?? '');

  useEffect(() => {
    const x = tablero.vineta ?? {};
    setNumeroLamina(x.numeroLamina ?? '');
    setRevision(x.revision ?? '');
    setFecha(x.fechaEmision ?? '');
    setInstalador(x.instaladorNombre ?? '');
    setRut(x.instaladorRUT ?? '');
    setClase(x.instaladorClaseSEC ?? '');
    setProyecto(x.proyectoNombre ?? '');
  }, [tablero.vineta]);

  async function guardar() {
    const payload: DatosVineta = {
      ...(numeroLamina && { numeroLamina }),
      ...(revision && { revision }),
      ...(fecha && { fechaEmision: fecha }),
      ...(instalador && { instaladorNombre: instalador }),
      ...(rut && { instaladorRUT: rut }),
      ...(clase && { instaladorClaseSEC: clase }),
      ...(proyecto && { proyectoNombre: proyecto })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { vineta: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Viñeta del plano</h3>
      <p className="text-xs text-slate-500">
        Campos vacíos heredan del cliente: instalador {cliente?.instaladorPredeterminadoNombre ?? '—'},
        clase SEC {cliente?.instaladorPredeterminadoClaseSEC ?? '—'},
        proyecto {cliente?.proyectoNombrePredeterminado ?? '—'}.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Número de lámina
          <input type="text" value={numeroLamina} onChange={e => setNumeroLamina(e.target.value)} placeholder="Ej. E-01" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Revisión
          <input type="text" value={revision} onChange={e => setRevision(e.target.value)} placeholder="Ej. Rev 0" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Fecha de emisión
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Proyecto
          <input type="text" value={proyecto} onChange={e => setProyecto(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instalador (nombre)
          <input type="text" value={instalador} onChange={e => setInstalador(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Instalador (RUT)
          <input type="text" value={rut} onChange={e => setRut(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Clase SEC
          <select value={clase} onChange={e => setClase(e.target.value as ClaseSEC)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar viñeta</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/FormularioVineta.tsx
git commit -m "feat(web): FormularioVineta con herencia visible de cliente"
```

---

### Tarea D7: Sub-componente `FormularioNotasGenerales`

**Files:**
- Create: `apps/web/src/componentes/datos-generales/FormularioNotasGenerales.tsx`

- [ ] **Paso 1: Crear**

```tsx
import { useEffect, useState } from 'react';
import type { Tablero } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function FormularioNotasGenerales({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const [notas, setNotas] = useState(tablero.notasGenerales ?? '');

  useEffect(() => {
    setNotas(tablero.notasGenerales ?? '');
  }, [tablero.notasGenerales]);

  async function guardar() {
    await actualizarDatos(clienteSlug, tableroSlug, { notasGenerales: notas });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-2">
      <h3 className="font-semibold">Notas generales del proyecto</h3>
      <p className="text-xs text-slate-500">Estas notas aparecen en el bloque superior del diagrama unilineal.</p>
      <textarea
        value={notas}
        onChange={e => setNotas(e.target.value)}
        rows={5}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar notas</button>
    </section>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/componentes/datos-generales/FormularioNotasGenerales.tsx
git commit -m "feat(web): FormularioNotasGenerales"
```

---

### Tarea D8: Integrar formularios en `TabDatosGenerales`

**Files:**
- Modify: `apps/web/src/componentes/tabs/TabDatosGenerales.tsx`
- Modify: `apps/web/src/componentes/PanelPendientes.tsx` (remover inputs de datos eléctricos)

- [ ] **Paso 1: Reescribir `TabDatosGenerales.tsx`**

```tsx
// apps/web/src/componentes/tabs/TabDatosGenerales.tsx
import type { Tablero, Cliente } from '@tipos/modelo';
import { FormularioDatosElectricos } from '../datos-generales/FormularioDatosElectricos.js';
import { FormularioAcometida } from '../datos-generales/FormularioAcometida.js';
import { FormularioAlimentadorEntrada } from '../datos-generales/FormularioAlimentadorEntrada.js';
import { FormularioPuestaATierra } from '../datos-generales/FormularioPuestaATierra.js';
import { FormularioVineta } from '../datos-generales/FormularioVineta.js';
import { FormularioNotasGenerales } from '../datos-generales/FormularioNotasGenerales.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabDatosGenerales({ tablero, cliente, clienteSlug, tableroSlug }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormularioDatosElectricos tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioAcometida tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioAlimentadorEntrada tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioPuestaATierra tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioVineta tablero={tablero} cliente={cliente} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioNotasGenerales tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}
```

- [ ] **Paso 2: Limpiar `PanelPendientes.tsx`** — remover el JSX y state de tensión/esquema/potencia/corriente/espacios. Dejar SÓLO la lista de pendientes y la sección de resolución manual. Es decir, eliminar:

- los `useState` para tensionSistema, esquemaTierra, potencia, corriente, espaciosTotales
- el `useEffect` que sincroniza esos states
- la función `guardar` y los `actualizarDatos(...)` derivados (dejar sólo lo relacionado a pendientes)
- los `<label>` y `<select>`/`<input>` correspondientes

> Sugerencia para el implementador: usar `git diff HEAD` para comparar la versión anterior y verificar que sólo se removieron los campos de datos del tablero, no los de pendientes.

- [ ] **Paso 3: Compilar + test + verificación manual**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json && npx vitest run
```

Manual: abrir tab "Datos generales" — debe mostrar las 6 secciones. Editar y guardar cada una. F5 preserva.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/componentes/tabs/TabDatosGenerales.tsx apps/web/src/componentes/PanelPendientes.tsx
git commit -m "feat(web): TabDatosGenerales integra 6 formularios; limpia PanelPendientes"
```

---

## Fase E — Cuadros normativos (componentes puros)

> Esta fase introduce los **cuadros** (cargas, alimentadores, simbología, viñeta, notas) que componen la lámina del diagrama. Cada uno es un componente puro React que recibe el tablero (o sub-objeto) y renderiza HTML/SVG. Los integramos en la lámina en fase G.

### Tarea E1: Función pura `construirArbolUnilineal`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/construir-arbol.ts`
- Create: `apps/web/tests/construir-arbol-unilineal.test.ts`

- [ ] **Paso 1: Definir tipo del árbol y test fallido**

```typescript
// apps/web/tests/construir-arbol-unilineal.test.ts
import { describe, it, expect } from 'vitest';
import { construirArbolUnilineal } from '../src/diagrama/unilineal/construir-arbol.js';
import type { Tablero } from '@tipos/modelo';

function base(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: '380V/220V-trif-n', esquemaTierra: 'TT',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('construirArbolUnilineal', () => {
  it('produce nodo raíz acometida con tensión y frecuencia', () => {
    const t = base();
    t.frecuenciaHz = 50;
    const arbol = construirArbolUnilineal(t);
    expect(arbol.acometida.tipo).toBe('pendiente');
    expect(arbol.tensionSistema).toBe('380V/220V-trif-n');
    expect(arbol.frecuenciaHz).toBe(50);
  });

  it('detecta medidor si existe componente tipo medidor', () => {
    const t = base();
    t.componentes = [{ id: 'm1', tipo: 'medidor', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.tieneMedidor).toBe(true);
  });

  it('detecta IG cuando hay componente interruptor-general', () => {
    const t = base();
    t.componentes = [{ id: 'ig', tipo: 'interruptor-general', calibreA: 63, polos: 3, procedencia: { fuente: 'manual', confianza: 'alta' } }];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.ig?.id).toBe('ig');
  });

  it('agrupa automáticos como ramales con su circuito asociado', () => {
    const t = base();
    t.componentes = [
      { id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    t.circuitos = [
      { id: 'c1', numero: 1, proteccionComponenteId: 'a1', destino: 'Iluminación', uso: 'iluminacion', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.ramales).toHaveLength(1);
    expect(arbol.ramales[0]!.proteccion.id).toBe('a1');
    expect(arbol.ramales[0]!.circuito?.destino).toBe('Iluminación');
  });

  it('incluye DPS y diferenciales como elementos en paralelo a las barras', () => {
    const t = base();
    t.componentes = [
      { id: 'dps1', tipo: 'dps', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'd1', tipo: 'diferencial', sensibilidadMA: 30, procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.protecciones.dps).toHaveLength(1);
    expect(arbol.protecciones.diferenciales).toHaveLength(1);
  });

  it('detecta barras separadas', () => {
    const t = base();
    t.componentes = [
      { id: 'bf', tipo: 'barra-fase', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bn', tipo: 'barra-neutro', procedencia: { fuente: 'manual', confianza: 'alta' } },
      { id: 'bt', tipo: 'barra-tierra', procedencia: { fuente: 'manual', confianza: 'alta' } }
    ];
    const arbol = construirArbolUnilineal(t);
    expect(arbol.barras.tieneFase).toBe(true);
    expect(arbol.barras.tieneNeutro).toBe(true);
    expect(arbol.barras.tieneTierra).toBe(true);
  });

  it('expone datos de puesta a tierra', () => {
    const t = base();
    t.puestaATierra = { resistenciaOhmMedida: 4.2, tipoElectrodo: 'jabalina' };
    const arbol = construirArbolUnilineal(t);
    expect(arbol.tierra.resistenciaOhmMedida).toBe(4.2);
    expect(arbol.tierra.tipoElectrodo).toBe('jabalina');
  });

  it('expone datos del alimentador de entrada', () => {
    const t = base();
    t.alimentadorEntrada = { seccionConductorMM2: 16, longitudM: 12, canalizacionTipo: 'EMT' };
    const arbol = construirArbolUnilineal(t);
    expect(arbol.alimentadorEntrada.seccionConductorMM2).toBe(16);
  });
});
```

- [ ] **Paso 2: Ejecutar y confirmar que falla**

```bash
cd apps/web && npx vitest run tests/construir-arbol-unilineal.test.ts
```

- [ ] **Paso 3: Implementar**

```typescript
// apps/web/src/diagrama/unilineal/construir-arbol.ts
import type {
  Tablero, ComponenteReconciliado, Circuito,
  DatosAcometida, DatosPuestaATierra, DatosAlimentadorEntrada,
  TensionSistema
} from '@tipos/modelo';

export interface NodoRamal {
  proteccion: ComponenteReconciliado;
  diferencialAsociado?: ComponenteReconciliado;
  circuito?: Circuito;
}

export interface ArbolUnilineal {
  tensionSistema: TensionSistema;
  frecuenciaHz: number;             // default 50
  acometida: DatosAcometida;        // si tablero.acometida es undefined, devuelve { tipo: 'pendiente' }
  tieneMedidor: boolean;
  medidor?: ComponenteReconciliado;
  alimentadorEntrada: DatosAlimentadorEntrada;  // {} si no está definido
  ig?: ComponenteReconciliado;
  protecciones: {
    dps: ComponenteReconciliado[];
    diferenciales: ComponenteReconciliado[];      // diferenciales principales (no asociados a circuitos)
  };
  barras: {
    tieneFase: boolean;
    tieneNeutro: boolean;
    tieneTierra: boolean;
  };
  ramales: NodoRamal[];
  tierra: DatosPuestaATierra & { esquema: Tablero['esquemaTierra'] };
}

export function construirArbolUnilineal(t: Tablero): ArbolUnilineal {
  const ig = t.componentes.find(c => c.tipo === 'interruptor-general');
  const medidor = t.componentes.find(c => c.tipo === 'medidor');

  // Diferenciales: separamos los asociados a circuitos (van por ramal) de los principales (van paralelos al IG)
  const diferencialesAsociadosIds = new Set(
    t.circuitos.map(c => c.diferencialComponenteId).filter((x): x is string => !!x)
  );

  const automaticos = t.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const ramales: NodoRamal[] = automaticos.map(a => {
    const circuito = t.circuitos.find(c => c.proteccionComponenteId === a.id);
    const dif = circuito?.diferencialComponenteId
      ? t.componentes.find(c => c.id === circuito.diferencialComponenteId)
      : undefined;
    return {
      proteccion: a,
      ...(dif && { diferencialAsociado: dif }),
      ...(circuito && { circuito })
    };
  });

  return {
    tensionSistema: t.tensionSistema,
    frecuenciaHz: t.frecuenciaHz ?? 50,
    acometida: t.acometida ?? { tipo: 'pendiente' },
    tieneMedidor: !!medidor,
    ...(medidor && { medidor }),
    alimentadorEntrada: t.alimentadorEntrada ?? {},
    ...(ig && { ig }),
    protecciones: {
      dps: t.componentes.filter(c => c.tipo === 'dps'),
      diferenciales: t.componentes.filter(c =>
        c.tipo === 'diferencial' && !diferencialesAsociadosIds.has(c.id)
      )
    },
    barras: {
      tieneFase: t.componentes.some(c => c.tipo === 'barra-fase'),
      tieneNeutro: t.componentes.some(c => c.tipo === 'barra-neutro'),
      tieneTierra: t.componentes.some(c => c.tipo === 'barra-tierra')
    },
    ramales,
    tierra: {
      esquema: t.esquemaTierra,
      ...t.puestaATierra
    }
  };
}
```

- [ ] **Paso 4: Verificar tests pasan**

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/diagrama/unilineal/construir-arbol.ts apps/web/tests/construir-arbol-unilineal.test.ts
git commit -m "feat(web): construirArbolUnilineal (función pura: tablero → estructura del diagrama)"
```

---

### Tarea E2: Componente `CuadroDeCargas`

**Files:**
- Create: `apps/web/src/diagrama/lamina/CuadroDeCargas.tsx`
- Create: `apps/web/tests/CuadroDeCargas.test.tsx`

- [ ] **Paso 1: Test fallido**

```typescript
// apps/web/tests/CuadroDeCargas.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CuadroDeCargas } from '../src/diagrama/lamina/CuadroDeCargas.js';
import type { Tablero } from '@tipos/modelo';

function base(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('CuadroDeCargas', () => {
  it('muestra "sin circuitos" cuando el tablero no tiene circuitos', () => {
    render(<CuadroDeCargas tablero={base()} />);
    expect(screen.getByText(/sin circuitos/i)).toBeDefined();
  });

  it('lista una fila por circuito con destino, uso, sección y protección', () => {
    const t = base();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, polos: 1, curva: 'C', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'Iluminación living', uso: 'iluminacion',
      seccionConductorMM2: 2.5, longitudM: 8, cargaW: 600, corrienteA: 2.7,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    render(<CuadroDeCargas tablero={t} />);
    expect(screen.getByText('Iluminación living')).toBeDefined();
    expect(screen.getByText(/C16/)).toBeDefined();
    expect(screen.getByText('2.5')).toBeDefined();
  });
});
```


- [ ] **Paso 2: Ejecutar y confirmar que falla**

- [ ] **Paso 3: Implementar**

```tsx
// apps/web/src/diagrama/lamina/CuadroDeCargas.tsx
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

function f(v: number | undefined, decimales = 1): string {
  return v === undefined ? '—' : v.toFixed(decimales).replace(/\.0+$/, '');
}

export function CuadroDeCargas({ tablero }: Props) {
  if (tablero.circuitos.length === 0) {
    return <p className="text-xs text-slate-500 italic">Cuadro de cargas — sin circuitos definidos</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b text-left text-slate-700 font-medium">
          <th className="py-1 px-1">Nº</th>
          <th className="py-1 px-1">Destino</th>
          <th className="py-1 px-1">Uso</th>
          <th className="py-1 px-1">P (W)</th>
          <th className="py-1 px-1">I (A)</th>
          <th className="py-1 px-1">mm²</th>
          <th className="py-1 px-1">Long. m</th>
          <th className="py-1 px-1">Canaliz.</th>
          <th className="py-1 px-1">Protección</th>
        </tr>
      </thead>
      <tbody>
        {tablero.circuitos.map(c => {
          const prot = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
          const protTxt = prot
            ? `C${prot.calibreA ?? '?'} ${prot.polos ?? '?'}P${prot.curva ? ` ${prot.curva}` : ''}`
            : '—';
          const canalizTxt = c.canalizacionTipo
            ? `${c.canalizacionTipo}${c.canalizacionDiametroMM ? ` Ø${c.canalizacionDiametroMM}` : ''}`
            : '—';
          return (
            <tr key={c.id} className="border-b">
              <td className="py-1 px-1">{c.numero}</td>
              <td className="py-1 px-1">{c.destino === 'pendiente' || !c.destino ? '—' : c.destino}</td>
              <td className="py-1 px-1">{c.uso === 'pendiente' ? '—' : c.uso}</td>
              <td className="py-1 px-1">{f(c.cargaW, 0)}</td>
              <td className="py-1 px-1">{f(c.corrienteA, 1)}</td>
              <td className="py-1 px-1">{f(c.seccionConductorMM2, 1)}</td>
              <td className="py-1 px-1">{f(c.longitudM, 1)}</td>
              <td className="py-1 px-1">{canalizTxt}</td>
              <td className="py-1 px-1">{protTxt}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Paso 4: Verificar tests pasan, commit**

```bash
git add apps/web/src/diagrama/lamina/CuadroDeCargas.tsx apps/web/tests/CuadroDeCargas.test.tsx
git commit -m "feat(web): CuadroDeCargas (cuadro normativo RIC N°18)"
```

---

### Tarea E3: Componente `CuadroDeAlimentadores`

**Files:**
- Create: `apps/web/src/diagrama/lamina/CuadroDeAlimentadores.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/lamina/CuadroDeAlimentadores.tsx
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
}

function f(v: number | undefined, dec = 1): string {
  return v === undefined ? '—' : v.toFixed(dec).replace(/\.0+$/, '');
}

export function CuadroDeAlimentadores({ tablero }: Props) {
  const a = tablero.alimentadorEntrada ?? {};
  const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b text-left text-slate-700 font-medium">
          <th className="py-1 px-1">Alimentador</th>
          <th className="py-1 px-1">mm²</th>
          <th className="py-1 px-1">Long.</th>
          <th className="py-1 px-1">Canaliz.</th>
          <th className="py-1 px-1">Capac. A</th>
          <th className="py-1 px-1">In</th>
          <th className="py-1 px-1">Icu kA</th>
          <th className="py-1 px-1">Curva</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-1 px-1">Acometida → {tablero.codigo}</td>
          <td className="py-1 px-1">{f(a.seccionConductorMM2)}</td>
          <td className="py-1 px-1">{f(a.longitudM)}</td>
          <td className="py-1 px-1">
            {a.canalizacionTipo
              ? `${a.canalizacionTipo} Ø${a.canalizacionDiametroMM ?? '?'} ${a.canalizacionMaterial ?? ''}`.trim()
              : '—'}
          </td>
          <td className="py-1 px-1">{f(a.capacidadCorrienteA, 0)}</td>
          <td className="py-1 px-1">{ig?.calibreA ?? '—'}A</td>
          <td className="py-1 px-1">{ig?.capacidadCortocircuitoKA ?? '—'}</td>
          <td className="py-1 px-1">{ig?.curva ?? '—'}</td>
        </tr>
      </tbody>
    </table>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/lamina/CuadroDeAlimentadores.tsx
git commit -m "feat(web): CuadroDeAlimentadores (alimentador entrada con datos RIC N°18)"
```

---

### Tarea E4: Componente `CuadroDeSimbologia`

**Files:**
- Create: `apps/web/src/diagrama/lamina/CuadroDeSimbologia.tsx`

- [ ] **Paso 1: Crear**

> Genera leyenda dinámica: por cada tipo de componente presente en el tablero, agrega su entrada. Importa el switch de símbolos existente (`SimboloIEC`).

```tsx
// apps/web/src/diagrama/lamina/CuadroDeSimbologia.tsx
import type { Tablero, TipoComponente } from '@tipos/modelo';
import { SimboloIEC } from '../simbolos/SimboloIEC.js';

interface Props {
  tablero: Tablero;
}

const ETIQUETAS: Record<TipoComponente, string> = {
  'interruptor-automatico': 'Interruptor automático',
  'diferencial': 'Diferencial',
  'interruptor-general': 'Interruptor general',
  'barra-fase': 'Barra de fase',
  'barra-neutro': 'Barra de neutro',
  'barra-tierra': 'Barra de tierra',
  'dps': 'DPS (descargador de sobretensiones)',
  'contactor': 'Contactor',
  'rele-termico': 'Relé térmico',
  'medidor': 'Medidor de energía',
  'borne': 'Borne',
  'otro': 'Otro'
};

export function CuadroDeSimbologia({ tablero }: Props) {
  const tiposPresentes = Array.from(new Set(tablero.componentes.map(c => c.tipo))) as TipoComponente[];
  if (tiposPresentes.length === 0) {
    return <p className="text-xs text-slate-500 italic">Sin componentes para mostrar simbología.</p>;
  }

  return (
    <div className="space-y-2">
      {tiposPresentes.map(t => (
        <div key={t} className="flex items-center gap-3 text-xs">
          <div className="w-12 h-8 border rounded bg-white flex items-center justify-center">
            <svg width="40" height="24" viewBox="0 0 40 24">
              <SimboloIEC tipo={t} x={0} y={0} ancho={40} alto={24} />
            </svg>
          </div>
          <span>{ETIQUETAS[t]}</span>
        </div>
      ))}
    </div>
  );
}
```

> Si el componente `SimboloIEC` actual exige más props (ej. `componente`, `resaltado`), adaptar la llamada usando una versión simplificada. Si no acepta `x/y/ancho/alto` sino otros, ajustar.

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/lamina/CuadroDeSimbologia.tsx
git commit -m "feat(web): CuadroDeSimbologia (leyenda dinámica IEC 60617)"
```

---

### Tarea E5: Renombrar `CuadroRotulacion.tsx` → `Vineta.tsx` y extender

**Files:**
- Rename: `apps/web/src/diagrama/CuadroRotulacion.tsx` → `apps/web/src/diagrama/lamina/Vineta.tsx`
- Modify: imports en `DiagramaSVG.tsx`

- [ ] **Paso 1: Renombrar con git**

```bash
git mv apps/web/src/diagrama/CuadroRotulacion.tsx apps/web/src/diagrama/lamina/Vineta.tsx
```

- [ ] **Paso 2: Reescribir el contenido de `Vineta.tsx`** con los datos de Plan 5 (con fallback a cliente):

```tsx
// apps/web/src/diagrama/lamina/Vineta.tsx
import type { Tablero, Cliente } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
}

function val(...candidatos: (string | undefined)[]): string {
  for (const c of candidatos) if (c && c.trim()) return c;
  return '—';
}

export function Vineta({ tablero, cliente }: Props) {
  const v = tablero.vineta ?? {};
  return (
    <div className="border rounded p-3 bg-white text-xs space-y-1 w-full">
      <div className="font-semibold text-sm border-b pb-1 mb-1">Viñeta</div>
      <div><span className="text-slate-500">Proyecto:</span> {val(v.proyectoNombre, cliente?.proyectoNombrePredeterminado)}</div>
      <div><span className="text-slate-500">Propietario:</span> {val(cliente?.nombre)}</div>
      <div><span className="text-slate-500">Instalador:</span> {val(v.instaladorNombre, cliente?.instaladorPredeterminadoNombre)}</div>
      <div><span className="text-slate-500">RUT:</span> {val(v.instaladorRUT, cliente?.instaladorPredeterminadoRUT)}</div>
      <div><span className="text-slate-500">Clase SEC:</span> {val(v.instaladorClaseSEC, cliente?.instaladorPredeterminadoClaseSEC)}</div>
      <div><span className="text-slate-500">Fecha emisión:</span> {val(v.fechaEmision)}</div>
      <div><span className="text-slate-500">Lámina:</span> {val(v.numeroLamina)}   <span className="text-slate-500">Rev:</span> {val(v.revision)}</div>
      <div><span className="text-slate-500">Tablero:</span> {tablero.codigo}</div>
    </div>
  );
}
```

- [ ] **Paso 3: Actualizar imports** donde se usaba `CuadroRotulacion`. Búsqueda:

```bash
grep -rln "CuadroRotulacion" apps/web/src/
```

Editar cada referencia para importar `Vineta` desde `./lamina/Vineta.js` y usar el componente con los nuevos props (`tablero`, `cliente`).

- [ ] **Paso 4: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/
git commit -m "feat(web): renombra CuadroRotulacion → Vineta y extiende con datos RIC N°18"
```

---

### Tarea E6: Componente `NotasGenerales` y `NormativaAplicada`

**Files:**
- Create: `apps/web/src/diagrama/lamina/NotasGenerales.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/lamina/NotasGenerales.tsx
import type { Tablero } from '@tipos/modelo';
import { evaluarRIC } from '../../../../../tipos/ric/motor.js';

interface Props {
  tablero: Tablero;
}

const NORMATIVAS_BASE = ['Pliego Técnico RIC N°18 (SEC Chile)', 'NCh 13 Of. 93', 'IEC 60617'];

export function NotasGenerales({ tablero }: Props) {
  const hallazgos = evaluarRIC(tablero);
  const partesRIC = Array.from(new Set(hallazgos.map(h => h.parteRIC))).sort();
  const normativa = [...NORMATIVAS_BASE, ...partesRIC.map(p => `Pliego Técnico ${p}`)];

  const linea1 = [
    tablero.tensionSistema !== 'pendiente' ? `Tensión: ${tablero.tensionSistema}` : null,
    tablero.frecuenciaHz ? `${tablero.frecuenciaHz} Hz` : null,
    tablero.esquemaTierra !== 'pendiente' ? `Esquema tierra: ${tablero.esquemaTierra}` : null,
    tablero.puestaATierra?.resistenciaOhmMedida !== undefined
      ? `R medida: ${tablero.puestaATierra.resistenciaOhmMedida} Ω`
      : null
  ].filter((x): x is string => !!x).join(' · ');

  return (
    <div className="border rounded bg-white p-3 text-xs space-y-2">
      <h4 className="font-semibold text-sm">Notas generales</h4>
      {linea1 && <div className="text-slate-700">{linea1}</div>}
      {tablero.notasGenerales && (
        <p className="whitespace-pre-line text-slate-700">{tablero.notasGenerales}</p>
      )}
      <div className="text-slate-500">
        <span className="font-medium">Normativa aplicada:</span> {normativa.join(', ')}.
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/lamina/NotasGenerales.tsx
git commit -m "feat(web): NotasGenerales con normativa derivada de reglas RIC evaluadas"
```

---

## Fase F — Sub-componentes del diagrama unilineal extendido

> Cada sub-componente recibe una porción del árbol y dibuja una región del SVG. Patrón común: recibe `x, y, ancho, alto` y datos específicos, dibuja con primitives SVG.

> Para mantener el plan acotado, esta fase consolida 6 commits en uno solo por sub-componente. El plan deja libertad al implementador de seguir el patrón de `apps/web/src/diagrama/simbolos/` (símbolos IEC existentes).

### Tarea F1: Sub-componente `Acometida.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/Acometida.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/Acometida.tsx
import type { DatosAcometida, TensionSistema } from '@tipos/modelo';

interface Props {
  acometida: DatosAcometida;
  tensionSistema: TensionSistema;
  frecuenciaHz: number;
  x: number;
  y: number;
}

export function Acometida({ acometida, tensionSistema, frecuenciaHz, x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Flecha hacia abajo simbolizando entrada de energía */}
      <line x1="0" y1="0" x2="0" y2="40" stroke="black" strokeWidth="2" />
      <polygon points="-5,35 5,35 0,45" fill="black" />
      {/* Etiqueta */}
      <text x="10" y="15" fontSize="11" fill="black" fontFamily="sans-serif">
        ACOMETIDA {acometida.tipo !== 'pendiente' ? `(${acometida.tipo})` : ''}
      </text>
      <text x="10" y="30" fontSize="9" fill="#666">
        {tensionSistema !== 'pendiente' ? tensionSistema : '—'} · {frecuenciaHz} Hz
      </text>
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/unilineal/Acometida.tsx
git commit -m "feat(web): símbolo SVG Acometida"
```

---

### Tarea F2: Sub-componente `Medidor.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/Medidor.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/Medidor.tsx
interface Props {
  x: number;
  y: number;
}

export function Medidor({ x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="18" fill="white" stroke="black" strokeWidth="1.5" />
      <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif">kWh</text>
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
git add apps/web/src/diagrama/unilineal/Medidor.tsx
git commit -m "feat(web): símbolo SVG Medidor"
```

---

### Tarea F3: Sub-componente `AlimentadorEntradaSVG.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/AlimentadorEntradaSVG.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/AlimentadorEntradaSVG.tsx
import type { DatosAlimentadorEntrada } from '@tipos/modelo';

interface Props {
  alimentador: DatosAlimentadorEntrada;
  x: number;
  yInicio: number;
  yFin: number;
}

export function AlimentadorEntradaSVG({ alimentador, x, yInicio, yFin }: Props) {
  const a = alimentador;
  const tieneDatos = a.seccionConductorMM2 || a.longitudM || a.canalizacionTipo;
  return (
    <g>
      <line x1={x} y1={yInicio} x2={x} y2={yFin} stroke="black" strokeWidth="2" />
      {tieneDatos && (
        <g transform={`translate(${x + 10}, ${(yInicio + yFin) / 2 - 16})`}>
          <rect x="0" y="0" width="160" height="44" fill="#fffbe6" stroke="#999" strokeWidth="0.5" />
          <text x="6" y="14" fontSize="10" fontFamily="sans-serif">
            {a.seccionConductorMM2 ? `${a.seccionConductorMM2} mm²` : 'mm² —'}
            {a.conductoresPorFase && a.conductoresPorFase > 1 ? ` × ${a.conductoresPorFase}` : ''}
            {a.longitudM ? ` · ${a.longitudM} m` : ''}
          </text>
          <text x="6" y="28" fontSize="9" fill="#555">
            {a.canalizacionTipo ?? '—'}{a.canalizacionDiametroMM ? ` Ø${a.canalizacionDiametroMM}` : ''}
            {a.canalizacionMaterial ? ` ${a.canalizacionMaterial}` : ''}
          </text>
          <text x="6" y="40" fontSize="9" fill="#555">
            Capac. {a.capacidadCorrienteA ?? '—'} A
          </text>
        </g>
      )}
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
git add apps/web/src/diagrama/unilineal/AlimentadorEntradaSVG.tsx
git commit -m "feat(web): SVG del alimentador de entrada con etiqueta RIC"
```

---

### Tarea F4: Sub-componente `InterruptorGeneralSVG.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/InterruptorGeneralSVG.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/InterruptorGeneralSVG.tsx
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  ig: ComponenteReconciliado;
  x: number;
  y: number;
  onClick?: () => void;
}

export function InterruptorGeneralSVG({ ig, x, y, onClick }: Props) {
  const polos = ig.polos ?? 3;
  const barras = Array.from({ length: polos }, (_, i) => i);
  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <rect x="-30" y="-20" width="60" height="40" fill="white" stroke="black" strokeWidth="2" />
      {barras.map(i => (
        <line
          key={i}
          x1={-20 + i * 12}
          y1={-15}
          x2={-12 + i * 12}
          y2={15}
          stroke="black"
          strokeWidth="2"
        />
      ))}
      <text x="35" y="-5" fontSize="11" fontFamily="sans-serif">
        IG · {ig.calibreA ?? '?'}A · {polos}P
      </text>
      <text x="35" y="8" fontSize="9" fill="#555">
        {ig.curva ?? '?'} · {ig.capacidadCortocircuitoKA ?? '?'} kA
      </text>
      <text x="35" y="20" fontSize="9" fill="#555">
        {ig.marca ?? ''} {ig.modelo ?? ''}
      </text>
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
git add apps/web/src/diagrama/unilineal/InterruptorGeneralSVG.tsx
git commit -m "feat(web): SVG InterruptorGeneral con datos RIC (In, Icu, curva, marca/modelo)"
```

---

### Tarea F5: Sub-componente `BarrasSVG.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/BarrasSVG.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/BarrasSVG.tsx
import type { DatosPuestaATierra } from '@tipos/modelo';

interface Props {
  xInicio: number;
  xFin: number;
  y: number;          // centro vertical del grupo de barras
  tieneFase: boolean;
  tieneNeutro: boolean;
  tieneTierra: boolean;
  tierra?: DatosPuestaATierra;
}

export function BarrasSVG({ xInicio, xFin, y, tieneFase, tieneNeutro, tieneTierra, tierra }: Props) {
  return (
    <g>
      {tieneFase && (
        <>
          <line x1={xInicio} y1={y} x2={xFin} y2={y} stroke="black" strokeWidth="3" />
          <text x={xInicio - 8} y={y + 4} fontSize="9" textAnchor="end" fill="black">F</text>
        </>
      )}
      {tieneNeutro && (
        <>
          <line x1={xInicio} y1={y + 12} x2={xFin} y2={y + 12} stroke="#3b82f6" strokeWidth="2" />
          <text x={xInicio - 8} y={y + 16} fontSize="9" textAnchor="end" fill="#3b82f6">N</text>
        </>
      )}
      {tieneTierra && (
        <>
          <line x1={xInicio} y1={y + 24} x2={xFin} y2={y + 24} stroke="#22c55e" strokeWidth="2" strokeDasharray="2 2" />
          <text x={xInicio - 8} y={y + 28} fontSize="9" textAnchor="end" fill="#22c55e">⏚</text>
          {tierra?.resistenciaOhmMedida !== undefined && (
            <text x={xFin + 6} y={y + 28} fontSize="9" fill="#22c55e">
              R = {tierra.resistenciaOhmMedida} Ω ({tierra.tipoElectrodo ?? '—'})
            </text>
          )}
        </>
      )}
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
git add apps/web/src/diagrama/unilineal/BarrasSVG.tsx
git commit -m "feat(web): SVG Barras (fase/neutro/tierra) con resistencia de tierra"
```

---

### Tarea F6: Sub-componente `RamalSVG.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/RamalSVG.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/RamalSVG.tsx
import type { NodoRamal } from './construir-arbol.js';

interface Props {
  ramal: NodoRamal;
  x: number;
  yBarra: number;     // donde se conecta a la barra
  yFin: number;       // dónde termina el circuito final
  onClick?: (id: string) => void;
}

export function RamalSVG({ ramal, x, yBarra, yFin, onClick }: Props) {
  const a = ramal.proteccion;
  const dif = ramal.diferencialAsociado;
  const c = ramal.circuito;

  const yAutomatico = yBarra + 30;
  const yDif = dif ? yAutomatico + 50 : yAutomatico;
  const yCondInicio = yDif + 15;

  return (
    <g>
      {/* Línea hacia abajo desde la barra */}
      <line x1={x} y1={yBarra} x2={x} y2={yCondInicio} stroke="black" strokeWidth="1.5" />

      {/* Automático */}
      <g transform={`translate(${x}, ${yAutomatico})`} onClick={() => onClick?.(a.id)} style={{ cursor: onClick ? 'pointer' : undefined }}>
        <rect x="-15" y="-10" width="30" height="20" fill="white" stroke="black" strokeWidth="1.5" />
        <line x1="-10" y1="-7" x2="-4" y2="7" stroke="black" strokeWidth="1.5" />
        <text x="20" y="0" fontSize="9" fontFamily="sans-serif">
          {a.calibreA ?? '?'}A {a.curva ?? ''}
        </text>
        <text x="20" y="10" fontSize="8" fill="#666">
          {a.polos ?? 1}P{a.capacidadCortocircuitoKA ? ` · ${a.capacidadCortocircuitoKA}kA` : ''}
        </text>
      </g>

      {/* Diferencial asociado al circuito (si existe) */}
      {dif && (
        <g transform={`translate(${x}, ${yDif})`}>
          <rect x="-15" y="-10" width="30" height="20" fill="white" stroke="black" strokeWidth="1.5" />
          <text x="0" y="2" textAnchor="middle" fontSize="9">Δ</text>
          <text x="20" y="0" fontSize="9" fontFamily="sans-serif">
            {dif.sensibilidadMA ?? '?'}mA
          </text>
        </g>
      )}

      {/* Conductor + etiqueta del circuito */}
      <line x1={x} y1={yCondInicio} x2={x} y2={yFin} stroke="black" strokeWidth="1" />
      {c && (
        <g transform={`translate(${x + 8}, ${(yCondInicio + yFin) / 2})`}>
          <text fontSize="9" fontFamily="sans-serif">
            C{c.numero}: {c.destino === 'pendiente' || !c.destino ? '—' : c.destino}
          </text>
          <text fontSize="8" y="11" fill="#666">
            {c.seccionConductorMM2 ?? '—'} mm²
            {c.longitudM ? ` · ${c.longitudM} m` : ''}
            {c.canalizacionTipo ? ` · ${c.canalizacionTipo}` : ''}
          </text>
        </g>
      )}

      {/* Terminal final */}
      <line x1={x - 5} y1={yFin} x2={x + 5} y2={yFin} stroke="black" strokeWidth="1.5" />
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/src/diagrama/unilineal/RamalSVG.tsx
git commit -m "feat(web): SVG Ramal (automático + diferencial asociado + circuito con sección/longitud)"
```

---

### Tarea F7: Sub-componente `PuestaATierraSVG.tsx`

**Files:**
- Create: `apps/web/src/diagrama/unilineal/PuestaATierraSVG.tsx`

- [ ] **Paso 1: Crear**

```tsx
// apps/web/src/diagrama/unilineal/PuestaATierraSVG.tsx
import type { DatosPuestaATierra } from '@tipos/modelo';

interface Props {
  tierra: DatosPuestaATierra & { esquema: string };
  x: number;
  y: number;
}

export function PuestaATierraSVG({ tierra, x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="-20" x2="0" y2="0" stroke="#22c55e" strokeWidth="2" />
      {/* Símbolo de tierra: tres líneas horizontales descendentes */}
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#22c55e" strokeWidth="2" />
      <line x1="-8" y1="5" x2="8" y2="5" stroke="#22c55e" strokeWidth="2" />
      <line x1="-4" y1="10" x2="4" y2="10" stroke="#22c55e" strokeWidth="2" />
      <text x="18" y="0" fontSize="9" fill="#22c55e" fontFamily="sans-serif">
        Tierra · {tierra.esquema} {tierra.resistenciaOhmMedida !== undefined ? ` · ${tierra.resistenciaOhmMedida} Ω` : ''}
      </text>
      {tierra.tipoElectrodo && (
        <text x="18" y="12" fontSize="8" fill="#16a34a">
          {tierra.tipoElectrodo}
        </text>
      )}
    </g>
  );
}
```

- [ ] **Paso 2: Compilar y commit**

```bash
git add apps/web/src/diagrama/unilineal/PuestaATierraSVG.tsx
git commit -m "feat(web): SVG PuestaATierra (electrodo + resistencia + esquema)"
```

---

## Fase G — Diagrama y lámina ensamblados

### Tarea G1: Refactor `DiagramaSVG.tsx` para usar el árbol

**Files:**
- Modify: `apps/web/src/diagrama/DiagramaSVG.tsx`

> En lugar del layout actual (basado en `layout/`), el nuevo `DiagramaSVG` consume `construirArbolUnilineal(tablero)` y renderiza acometida → medidor → IG → barras → ramales → tierra usando los sub-componentes de la Fase F.

- [ ] **Paso 1: Reescribir `DiagramaSVG.tsx`** así (reemplazo completo del archivo):

```tsx
// apps/web/src/diagrama/DiagramaSVG.tsx
import { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Tablero, Cliente } from '@tipos/modelo';
import { construirArbolUnilineal } from './unilineal/construir-arbol.js';
import { Acometida } from './unilineal/Acometida.js';
import { Medidor } from './unilineal/Medidor.js';
import { AlimentadorEntradaSVG } from './unilineal/AlimentadorEntradaSVG.js';
import { InterruptorGeneralSVG } from './unilineal/InterruptorGeneralSVG.js';
import { BarrasSVG } from './unilineal/BarrasSVG.js';
import { RamalSVG } from './unilineal/RamalSVG.js';
import { PuestaATierraSVG } from './unilineal/PuestaATierraSVG.js';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function DiagramaSVG({ tablero, onClicComponente }: Props) {
  const arbol = useMemo(() => construirArbolUnilineal(tablero), [tablero]);

  // Layout vertical simple. Coordenadas en píxeles SVG.
  const xCentro = 400;
  const yAcometida = 30;
  const yMedidor = arbol.tieneMedidor ? 110 : null;
  const yIG = (yMedidor ?? yAcometida) + 90;
  const yBarra = yIG + 60;
  const yBarraTierra = yBarra + 24;
  const espacioRamal = 110;
  const totalRamales = arbol.ramales.length;
  const xRamalInicio = xCentro - ((totalRamales - 1) * espacioRamal) / 2;
  const xBarraInicio = Math.min(xCentro - 60, xRamalInicio - 20);
  const xBarraFin = Math.max(xCentro + 60, xRamalInicio + (totalRamales - 1) * espacioRamal + 20);
  const yFinCircuito = yBarra + 220;
  const yTierra = yBarraTierra + 260;
  const altoSVG = yTierra + 80;
  const anchoSVG = xBarraFin + 200;

  return (
    <TransformWrapper minScale={0.3} maxScale={3} initialScale={0.8} centerOnInit>
      <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
        <svg width={anchoSVG} height={altoSVG} viewBox={`0 0 ${anchoSVG} ${altoSVG}`} fontFamily="sans-serif">
          <Acometida acometida={arbol.acometida} tensionSistema={arbol.tensionSistema} frecuenciaHz={arbol.frecuenciaHz} x={xCentro} y={yAcometida} />

          {arbol.tieneMedidor && yMedidor !== null && (
            <Medidor x={xCentro} y={yMedidor} />
          )}

          <AlimentadorEntradaSVG
            alimentador={arbol.alimentadorEntrada}
            x={xCentro}
            yInicio={(yMedidor ?? yAcometida) + 30}
            yFin={yIG - 20}
          />

          {arbol.ig && (
            <InterruptorGeneralSVG ig={arbol.ig} x={xCentro} y={yIG} onClick={() => onClicComponente(arbol.ig!.id)} />
          )}

          {/* Conexión IG → barra */}
          <line x1={xCentro} y1={yIG + 20} x2={xCentro} y2={yBarra} stroke="black" strokeWidth="2" />

          <BarrasSVG
            xInicio={xBarraInicio}
            xFin={xBarraFin}
            y={yBarra}
            tieneFase={arbol.barras.tieneFase || true}    // si no se detectaron, dibujamos las 3 igual a modo guía
            tieneNeutro={arbol.barras.tieneNeutro || true}
            tieneTierra={arbol.barras.tieneTierra || true}
            tierra={arbol.tierra}
          />

          {/* DPS y diferenciales principales en paralelo */}
          {arbol.protecciones.dps.map((d, i) => (
            <g key={d.id} transform={`translate(${xBarraInicio - 60 - i * 50}, ${yBarra})`}>
              <line x1="0" y1="0" x2="60" y2="0" stroke="black" strokeWidth="1" />
              <rect x="-20" y="-20" width="20" height="20" fill="white" stroke="black" strokeWidth="1.5" />
              <text x="-10" y="-3" textAnchor="middle" fontSize="9">DPS</text>
              <line x1="-10" y1="-3" x2="-10" y2="3" stroke="black" strokeWidth="1" />
              <polygon points="-13,3 -7,3 -10,8" fill="black" />
            </g>
          ))}

          {arbol.ramales.map((r, i) => (
            <RamalSVG
              key={r.proteccion.id}
              ramal={r}
              x={xRamalInicio + i * espacioRamal}
              yBarra={yBarraTierra}
              yFin={yFinCircuito}
              onClick={onClicComponente}
            />
          ))}

          <PuestaATierraSVG tierra={arbol.tierra} x={xBarraInicio - 30} y={yTierra} />
        </svg>
      </TransformComponent>
    </TransformWrapper>
  );
}
```

> Nota: el algoritmo de layout determinístico de Plan 3 (`apps/web/src/diagrama/layout/`) **queda inutilizado por este refactor**. Decisión: dejarlo en su lugar pero sin importar. Documento en el commit que el layout viejo se reemplaza con un layout más simple por verticalidad RIC. Si en algún futuro se necesita un layout más complejo, se puede reactivar.

- [ ] **Paso 2: Compilar (puede haber warnings de imports no usados en layout viejo — está bien)**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Paso 3: Verificación manual** — abrir un tablero existente con varios automáticos en tab "Diagrama". Debe verse la nueva representación con acometida → IG → barras → ramales → tierra.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/diagrama/DiagramaSVG.tsx
git commit -m "feat(web): DiagramaSVG re-implementado con árbol unilineal y sub-componentes RIC"
```

---

### Tarea G2: Componente `Lamina` que ensambla todo

**Files:**
- Create: `apps/web/src/diagrama/lamina/Lamina.tsx`
- Modify: `apps/web/src/componentes/tabs/TabDiagrama.tsx`

- [ ] **Paso 1: Crear `Lamina.tsx`**

```tsx
// apps/web/src/diagrama/lamina/Lamina.tsx
import type { Tablero, Cliente } from '@tipos/modelo';
import { DiagramaSVG } from '../DiagramaSVG.js';
import { NotasGenerales } from './NotasGenerales.js';
import { CuadroDeCargas } from './CuadroDeCargas.js';
import { CuadroDeAlimentadores } from './CuadroDeAlimentadores.js';
import { CuadroDeSimbologia } from './CuadroDeSimbologia.js';
import { Vineta } from './Vineta.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function Lamina({ tablero, cliente, onClicComponente }: Props) {
  return (
    <div className="space-y-3">
      <NotasGenerales tablero={tablero} />

      <div className="bg-white border rounded h-[600px]">
        <DiagramaSVG tablero={tablero} cliente={cliente} onClicComponente={onClicComponente} />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <section className="col-span-6 bg-white border rounded p-3">
          <h4 className="font-semibold text-sm mb-2">Cuadro de cargas</h4>
          <CuadroDeCargas tablero={tablero} />
        </section>
        <section className="col-span-3 bg-white border rounded p-3">
          <h4 className="font-semibold text-sm mb-2">Simbología</h4>
          <CuadroDeSimbologia tablero={tablero} />
        </section>
        <section className="col-span-3">
          <Vineta tablero={tablero} cliente={cliente} />
        </section>
      </div>

      <section className="bg-white border rounded p-3">
        <h4 className="font-semibold text-sm mb-2">Resumen de alimentadores</h4>
        <CuadroDeAlimentadores tablero={tablero} />
      </section>
    </div>
  );
}
```

- [ ] **Paso 2: Reescribir `TabDiagrama.tsx`** para usar `Lamina`:

```tsx
// apps/web/src/componentes/tabs/TabDiagrama.tsx
import type { Tablero, Cliente } from '@tipos/modelo';
import { Lamina } from '../../diagrama/lamina/Lamina.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function TabDiagrama({ tablero, cliente, onClicComponente }: Props) {
  return <Lamina tablero={tablero} cliente={cliente} onClicComponente={onClicComponente} />;
}
```

- [ ] **Paso 3: Verificación**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json && npx vitest run
```

Manual: tab "Diagrama" muestra notas arriba, diagrama centro, cuadros + viñeta abajo, resumen de alimentadores al final.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/diagrama/lamina/Lamina.tsx apps/web/src/componentes/tabs/TabDiagrama.tsx
git commit -m "feat(web): Lamina ensambla notas + diagrama + cuadros + viñeta (RIC N°18)"
```

---

## Fase H — Plantilla de resultados E2E

### Tarea H1: Crear `plan-5-resultados.md`

**Files:**
- Create: `docs/superpowers/plans/2026-05-12-plan-5-resultados.md`

- [ ] **Paso 1: Crear**

```markdown
# Plan 5 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual del Plan 5.

**Fecha:** _pendiente_

---

## Pasos

1. `npm run dev` — backend y frontend.
2. Abrir un tablero existente o crear uno nuevo.
3. Recorrer cada tab y validar lo siguiente.

---

## Tabs y navegación
- [ ] Las 4 tabs aparecen en el header (Datos generales · Fotos y componentes · Diagrama · Análisis RIC).
- [ ] Cambiar tabs actualiza el query param `?tab=`.
- [ ] Refrescar el navegador en cualquier tab conserva la tab activa.
- [ ] Default (sin `?tab=`) es "Fotos y componentes".

## Tab "Datos generales"
- [ ] Las 6 secciones aparecen (Datos eléctricos, Acometida, Alimentador de entrada, Puesta a tierra, Viñeta, Notas generales).
- [ ] Cada formulario guarda al hacer clic en su botón.
- [ ] Recargar el navegador preserva todo.
- [ ] La viñeta muestra los datos heredados del cliente cuando los campos del tablero están vacíos.

## Tab "Fotos y componentes"
- [ ] Misma funcionalidad que en Plan 4 (subir fotos, ver componentes, ver circuitos, ver pendientes).
- [ ] PanelPendientes ya no muestra los inputs de tensión/esquema/potencia/corriente/espacios (esos migraron al tab Datos generales).

## Tab "Diagrama"
- [ ] Se muestra el bloque de notas con tensión, frecuencia, esquema, resistencia, normativa.
- [ ] El diagrama unilineal incluye: acometida, medidor (si aplica), alimentador con etiqueta, IG con polos/curva/Icu/marca, barras (fase + neutro + tierra), DPS si existe, ramales con automático + diferencial asociado + circuito (sección/longitud/canalización/destino), terminal de tierra.
- [ ] Cuadro de cargas tiene 1 fila por circuito con todos los campos RIC.
- [ ] Cuadro resumen de alimentadores muestra acometida → tablero con sección, longitud, canalización, capacidad, In, Icu, curva.
- [ ] Cuadro de simbología lista los tipos presentes con sus símbolos IEC.
- [ ] Viñeta muestra proyecto/propietario/instalador/lámina con fallback a datos del cliente.

## Tab "Análisis RIC"
- [ ] Cuando el tablero está vacío (recién creado), muestra empty-state con CTA a tabs.
- [ ] En cuanto se agrega un dato (componente, foto, o campo manual), vuelve a mostrar la lista de hallazgos como en Plan 4.
- [ ] Las acciones (no aplica, →terreno, nota) siguen funcionando como en Plan 4.

## Barra superior
- [ ] Muestra mensaje "Tablero sin datos" cuando el tablero está vacío.
- [ ] Cuando tiene datos, muestra los contadores RIC habituales.

## Fotos / tableros probados

| # | Descripción | Tabs probadas | Observaciones |
|---|-------------|---------------|---------------|
| 1 | _pendiente_ |               |               |

## Hallazgos para Plan 6 / 7
- _pendiente_

---

## Criterios de aceptación del Plan 5

- [ ] `npm test` ejecuta ~160 tests, todos pasan.
- [ ] El workspace está dividido en 4 tabs horizontales con URL deep-linkable.
- [ ] Tab "Análisis RIC" muestra empty-state cuando el tablero está vacío.
- [ ] Tab "Datos generales" permite editar todos los campos nuevos (acometida, alimentador, tierra, viñeta, notas).
- [ ] Tab "Diagrama" muestra el unilineal con acometida → última protección, cuadros normativos y viñeta.
- [ ] Refrescar el navegador preserva la tab activa y todos los datos nuevos.
```

- [ ] **Paso 2: Verificar tests globales**

```bash
npm test
```

- [ ] **Paso 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-12-plan-5-resultados.md
git commit -m "docs: plantilla de resultados E2E del Plan 5"
```

---

## Criterios de aceptación finales

- [ ] `npm test` ejecuta ~160 tests, todos pasan (115 baseline + ~46 nuevos).
- [ ] Las 4 tabs (`?tab=datos-generales|fotos-componentes|diagrama|ric`) funcionan y son deep-linkables.
- [ ] Empty-state en "Análisis RIC" cuando el tablero está vacío.
- [ ] Las 6 secciones del tab "Datos generales" guardan y persisten correctamente.
- [ ] El tab "Diagrama" muestra notas + diagrama (con todos los sub-componentes) + cuadros + viñeta.
- [ ] El modelo `Tablero` tiene los campos RIC N°18 (acometida, alimentadorEntrada, puestaATierra, vineta, notasGenerales, frecuenciaHz, capacidadNominalA).
- [ ] El modelo `Circuito` tiene canalización + corriente; `ComponenteReconciliado` tiene `capacidadCortocircuitoKA`.
- [ ] El modelo `Cliente` tiene campos predeterminados (instalador, proyecto) heredables a la viñeta.
- [ ] Refrescar el navegador en cualquier tab y con cualquier campo nuevo preserva todo.

---

## Lo que NO resuelve Plan 5

- PDF profesional con corte exacto A3/A4, márgenes y simbología completa (Plan 7).
- Vista inter-tablero TG + TDs en la misma lámina (Plan 8).
- Validación de "cargas futuras = 0 W" (Plan 4.5 o futuro).
- Tensiones de paso y contacto MT (cuando aparezca proyecto MT).
- Cotización (Plan 6, spec ya escrito).
