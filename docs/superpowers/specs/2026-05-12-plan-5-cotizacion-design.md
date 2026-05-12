# Plan 5 — Cotización: catálogo y plan de normalización

> Spec de Plan 5. Continúa Plan 4 (verificación RIC) agregando el motor de cotización.

**Fecha:** 2026-05-12
**Autor:** Daniel Romero (con asistencia de Claude)

---

## 1. Objetivo

Al terminar Plan 5, el usuario que abre un tablero con hallazgos RIC `no-cumple` puede:

1. **Mantener un catálogo de materiales y mano de obra por cliente**, con precios CLP editables. La app provee un set semilla con precios referenciales 2026.
2. **Generar un plan de normalización** que, a partir de los hallazgos sub-estándar del tablero, sugiere las partidas (materiales + mano de obra) y cantidades necesarias para resolverlos, usando recetas declarativas mapeadas regla→materiales.
3. **Editar el plan inline**: agregar, modificar o quitar partidas; cambiar cantidades; notas.
4. **Snapshot al generar**: los precios del catálogo se congelan dentro del plan al momento de generarlo. Cambios futuros al catálogo no alteran cotizaciones pasadas. Cada tablero puede tener N planes (versiones, históricos).
5. **Ver totales calculados**: subtotal, IVA (19% Chile, toggleable), total general.
6. **Marcar estado** de cada plan: `borrador` / `enviado` / `aceptado` / `rechazado`.

**Lo que NO entrega Plan 5** (queda para planes posteriores):

- PDF profesional de la cotización (Plan 6).
- ZIP portable con catálogo + cotizaciones (Plan 8).
- Comparativa entre planes / análisis de varianza.
- Recetas editables por el usuario (las recetas son declarativas en código; el usuario edita el plan resultante, no la receta). Refinamiento posible en planes futuros si genera fricción.

---

## 2. Decisiones de scope (resumen del brainstorming)

| Decisión | Elegido | Alternativa descartada |
|---|---|---|
| Snapshot vs vivo | Snapshot al generar (cada plan congela precios) | Cálculo en vivo desde catálogo actual |
| Múltiples planes por tablero | Sí (versiones) | Plan único regenerable |
| Alcance del catálogo | Por cliente (cada cliente tiene su `catalogo.json`) | Global de la app; global + override |
| Recetas regla→materiales | Hardcoded declarativas (en `tipos/ric/recetas.ts`) | Editables en UI |
| IVA | Toggle opcional en el plan (default ON, 19%) | Siempre incluido / siempre excluido |

---

## 3. Modelo de datos

### 3.1 Adiciones a `tipos/modelo.ts`

```typescript
// ============================================================================
// Catálogo de materiales y mano de obra (Plan 5)
// ============================================================================

export type UnidadCatalogo = 'ud' | 'm' | 'kg' | 'h' | 'gl';

export type CategoriaCatalogo =
  | 'proteccion'        // automáticos, diferenciales, DPS
  | 'conductor'         // cables
  | 'ducteria'          // canalizaciones, cajas
  | 'accesorio'         // barras, terminales, bornes
  | 'mano-de-obra'      // HH instalador, electricista, ayudante
  | 'servicio'          // visita técnica, medición megger
  | 'otro';

export interface ItemCatalogo {
  id: string;                          // ULID
  codigo: string;                      // 'DPS-1P-T2-25KA', 'HH-electricista'
  descripcion: string;
  tipo: 'material' | 'labor';
  unidad: UnidadCatalogo;
  precioUnitarioCLP: number;
  categoria: CategoriaCatalogo;
  notas?: string;
}

// ============================================================================
// Plan de normalización (Plan 5) — snapshot persistido
// ============================================================================

export type EstadoPlan = 'borrador' | 'enviado' | 'aceptado' | 'rechazado';

export interface PartidaPlan {
  id: string;                          // ULID
  itemCodigo: string;                  // referencia estable al item del catálogo
  itemDescripcion: string;             // snapshot del catálogo
  unidad: UnidadCatalogo;              // snapshot
  precioUnitarioCLP: number;           // snapshot
  cantidad: number;
  totalCLP: number;                    // cantidad * precioUnitario
  // Referencias opcionales al hallazgo que originó esta partida
  hallazgoReglaId?: string;
  hallazgoComponenteId?: string;
  hallazgoCircuitoId?: string;
  notas?: string;
}

export interface PlanNormalizacion {
  id: string;                          // ULID
  numero: number;                      // correlativo dentro del tablero (1, 2, 3, ...)
  creadoEn: string;                    // ISO
  actualizadoEn: string;
  estado: EstadoPlan;
  partidas: PartidaPlan[];
  incluyeIVA: boolean;                 // default true
  ivaPct: number;                      // default 19
  subtotalCLP: number;                 // calculado: suma de partidas.totalCLP
  ivaCLP: number;                      // calculado: subtotal * ivaPct/100 si incluyeIVA, sino 0
  totalCLP: number;                    // calculado: subtotal + iva
  notas?: string;
}
```

### 3.2 Extensión de `Tablero`

```typescript
export interface Tablero {
  // ... (campos existentes hasta Plan 4)
  planesNormalizacion: PlanNormalizacion[];   // NUEVO en Plan 5
}
```

Los planes viven dentro del `tablero.json` para mantener escritura atómica. Si en futuros planes el array crece demasiado, se podrá mover a archivos separados (`planes/<id>.json`).

### 3.3 Estructura en disco

```
proyectos/
└── <slug-cliente>/
    ├── cliente.json
    ├── catalogo.json                   # NUEVO en Plan 5
    └── tableros/
        └── <slug-tablero>/
            └── tablero.json            # gana planesNormalizacion[]
```

`catalogo.json` es un array `ItemCatalogo[]`. Si no existe al leer un cliente, se inicializa con el set semilla (sección 4) y se escribe a disco.

---

## 4. Catálogo semilla (precios CLP referenciales 2026)

```typescript
// tipos/catalogo/semilla.ts
export const CATALOGO_SEMILLA: Omit<ItemCatalogo, 'id'>[] = [
  // Protección
  { codigo: 'AUT-1P-10A-C',     descripcion: 'Automático 1P 10A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4200, categoria: 'proteccion' },
  { codigo: 'AUT-1P-16A-C',     descripcion: 'Automático 1P 16A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4500, categoria: 'proteccion' },
  { codigo: 'AUT-1P-20A-C',     descripcion: 'Automático 1P 20A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4800, categoria: 'proteccion' },
  { codigo: 'AUT-1P-25A-C',     descripcion: 'Automático 1P 25A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  5200, categoria: 'proteccion' },
  { codigo: 'AUT-2P-40A-C',     descripcion: 'Automático 2P 40A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP: 12500, categoria: 'proteccion' },
  { codigo: 'AUT-3P-63A-C',     descripcion: 'Automático 3P 63A curva C (IG típico)',     tipo: 'material', unidad: 'ud', precioUnitarioCLP: 28000, categoria: 'proteccion' },
  { codigo: 'DIF-2P-25A-30MA',  descripcion: 'Diferencial 2P 25A 30mA',                   tipo: 'material', unidad: 'ud', precioUnitarioCLP: 42000, categoria: 'proteccion' },
  { codigo: 'DIF-4P-40A-30MA',  descripcion: 'Diferencial 4P 40A 30mA',                   tipo: 'material', unidad: 'ud', precioUnitarioCLP: 78000, categoria: 'proteccion' },
  { codigo: 'DPS-1P-T2',        descripcion: 'DPS monofásico tipo 2 (clase II) 25kA',     tipo: 'material', unidad: 'ud', precioUnitarioCLP: 35000, categoria: 'proteccion' },
  { codigo: 'DPS-3P-T2',        descripcion: 'DPS trifásico+N tipo 2 25kA',               tipo: 'material', unidad: 'ud', precioUnitarioCLP: 95000, categoria: 'proteccion' },

  // Accesorios
  { codigo: 'BARRA-N',          descripcion: 'Barra de neutro aislada 12 vías',           tipo: 'material', unidad: 'ud', precioUnitarioCLP:  8500, categoria: 'accesorio' },
  { codigo: 'BARRA-T',          descripcion: 'Barra de tierra 1.5x10x100mm',              tipo: 'material', unidad: 'ud', precioUnitarioCLP:  8500, categoria: 'accesorio' },
  { codigo: 'BORNERA-12',       descripcion: 'Bornera 12 polos riel DIN',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  6800, categoria: 'accesorio' },

  // Conductor
  { codigo: 'CABLE-25-THHN',    descripcion: 'Conductor THHN cobre 2.5mm² (#14 AWG)',     tipo: 'material', unidad: 'm',  precioUnitarioCLP:   850, categoria: 'conductor' },
  { codigo: 'CABLE-4-THHN',     descripcion: 'Conductor THHN cobre 4mm² (#12 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  1300, categoria: 'conductor' },
  { codigo: 'CABLE-6-THHN',     descripcion: 'Conductor THHN cobre 6mm² (#10 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  1850, categoria: 'conductor' },
  { codigo: 'CABLE-10-THHN',    descripcion: 'Conductor THHN cobre 10mm² (#8 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  3100, categoria: 'conductor' },

  // Mano de obra
  { codigo: 'HH-electricista',  descripcion: 'Hora-hombre electricista certificado',      tipo: 'labor',    unidad: 'h',  precioUnitarioCLP: 25000, categoria: 'mano-de-obra' },
  { codigo: 'HH-ayudante',      descripcion: 'Hora-hombre ayudante',                      tipo: 'labor',    unidad: 'h',  precioUnitarioCLP: 12000, categoria: 'mano-de-obra' },

  // Servicios
  { codigo: 'VISITA',           descripcion: 'Visita técnica y diagnóstico',              tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 50000, categoria: 'servicio' },
  { codigo: 'MEDICION-MEGGER',  descripcion: 'Medición de aislamiento (megger)',          tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 35000, categoria: 'servicio' },
  { codigo: 'MEDICION-TIERRA',  descripcion: 'Medición de puesta a tierra',               tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 40000, categoria: 'servicio' }
];
```

> Disclaimer: los valores son orientativos. El usuario debe revisarlos antes de cotizar a un cliente real.

---

## 5. Recetas regla → partidas sugeridas

`tipos/ric/recetas.ts` mapea cada `reglaId` con un patrón sugerido. Cuando el usuario genera un plan, la app recorre los hallazgos `no-cumple` (y opcionalmente `pendiente-verificar`) y emite partidas sugeridas.

```typescript
// tipos/ric/recetas.ts
import type { HallazgoRIC, ResultadoRegla } from './tipos.js';

export interface PartidaSugerida {
  itemCodigo: string;     // referencia al catálogo
  cantidad: number;
  notas?: string;
}

export interface Receta {
  reglaId: string;
  aplicaA: ResultadoRegla[];        // típicamente ['no-cumple']
  partidas: PartidaSugerida[];
}

export const RECETAS: Receta[] = [
  {
    reglaId: 'ric.tablero.dps-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DPS-1P-T2', cantidad: 1, notas: 'Verificar si la instalación requiere DPS trifásico' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.diferencial-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DIF-2P-25A-30MA', cantidad: 1, notas: 'Ajustar polos/calibre según corriente nominal' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.diferencial-sensibilidad-enchufes',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'DIF-2P-25A-30MA', cantidad: 1, notas: 'Sustituir diferencial existente por uno 30mA' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.barras-tierra-neutro-separadas',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'BARRA-T', cantidad: 1 },
      { itemCodigo: 'BARRA-N', cantidad: 1 },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  },
  {
    reglaId: 'ric.tablero.int-general-presente',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-3P-63A-C', cantidad: 1, notas: 'Calibre según corriente nominal real' },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  },
  {
    reglaId: 'ric.tablero.calibre-vs-seccion',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-1P-16A-C', cantidad: 1, notas: 'Reemplazar automático por uno acorde a la sección, o aumentar sección' },
      { itemCodigo: 'HH-electricista', cantidad: 0.5 }
    ]
  },
  {
    reglaId: 'ric.tablero.identificacion-circuitos',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'HH-ayudante', cantidad: 0.25, notas: 'Etiquetar circuitos según destino real' }
    ]
  },
  {
    reglaId: 'ric.tablero.reserva-minima',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'HH-electricista', cantidad: 2.0, notas: 'Ampliar gabinete o redistribuir' }
    ]
  },
  {
    reglaId: 'ric.tablero.selectividad',
    aplicaA: ['no-cumple'],
    partidas: [
      { itemCodigo: 'AUT-3P-63A-C', cantidad: 1, notas: 'Cambiar IG por uno con calibre adecuado a la cascada' },
      { itemCodigo: 'HH-electricista', cantidad: 1.0 }
    ]
  }
];

// Función pura: a partir de hallazgos y catálogo, genera partidas iniciales.
// No depende de IDs (genera nuevos al construir el plan).
export function sugerirPartidasDesdeHallazgos(
  hallazgos: HallazgoRIC[],
  catalogo: ItemCatalogo[]
): Array<{
  itemCatalogo: ItemCatalogo;
  cantidad: number;
  hallazgo: HallazgoRIC;
  notasReceta?: string;
}> {
  // ... implementación: por cada hallazgo, busca su receta, resuelve cada itemCodigo
  // contra el catálogo. Si el itemCodigo no existe en el catálogo (cliente lo eliminó),
  // omite la partida con un warning.
}
```

**Importante**: la sugerencia es solo eso — una propuesta. El usuario puede aceptarla tal cual, modificarla, o ignorarla y construir el plan a mano partida por partida.

**Hallazgos con anotación `no-aplica`**: NO se sugieren partidas (se filtran antes).
**Hallazgos `pendiente-verificar`**: NO se sugieren por default — primero hay que confirmar en terreno. Toggle opcional para incluirlos como "estimados".

---

## 6. UI

### 6.1 Vista del catálogo (por cliente)

Nueva ruta: `/clientes/<slug>/catalogo`.

Layout:

```
┌────────────────────────────────────────────────────────────────────┐
│  Catálogo — <Cliente>                       [+ Item] [Restaurar]   │
├────────────────────────────────────────────────────────────────────┤
│  Filtrar por categoría: [todos ▼]   Buscar: [_________]            │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Código          Descripción              Unidad  CLP   ✎ ✕ │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ AUT-1P-16A-C   Automático 1P 16A C       ud      4.500 ✎ ✕ │   │
│  │ ...                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

- Tabla CRUD: agregar, editar inline (clic en lápiz), eliminar (clic en ×).
- Botón "Restaurar semilla" sobrescribe el catálogo con la semilla. Pide confirmación.
- Filtro por categoría + búsqueda por código/descripción.

### 6.2 Generar plan de normalización

Botón visible en el `PanelAnalisisRIC` del workspace (junto al título o como segundo CTA en la tab "Hallazgos"): **"Generar plan de normalización →"**.

Al clic:

1. La app recorre los hallazgos `no-cumple` sin anotación `no-aplica`.
2. Aplica recetas → propone partidas con precios actuales del catálogo del cliente.
3. Crea un nuevo `PlanNormalizacion` con `estado: 'borrador'`, persiste y abre la vista.

### 6.3 Vista del plan de normalización

Nueva ruta: `/clientes/<slug-cliente>/tableros/<slug-tablero>/planes/<id-plan>`.

Layout:

```
┌────────────────────────────────────────────────────────────────────┐
│  Plan #3 · Tablero TG · Cliente Acme       Estado: [borrador ▼]    │
│  Creado: 2026-05-12   IVA: [✓] 19%        [Eliminar plan] [← Volver]│
├────────────────────────────────────────────────────────────────────┤
│  Partidas                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Item                Cant  Unidad  P.Unit.   Total    ✕      │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ DPS-1P-T2          [1]   ud     35.000   35.000      ✕     │   │
│  │  └ Hallazgo: DPS presente (RIC N°09)                       │   │
│  │ HH-electricista    [0.5] h      25.000   12.500      ✕     │   │
│  │  └ Hallazgo: DPS presente (RIC N°09)                       │   │
│  │  ...                                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [+ Agregar partida (autocompletar desde catálogo)]                │
│  [Re-sugerir desde hallazgos] (regenera; pide confirmación)        │
├────────────────────────────────────────────────────────────────────┤
│  Subtotal:                                              CLP 47.500 │
│  IVA 19%:                                                CLP 9.025 │
│  Total:                                                 CLP 56.525 │
│                                                                    │
│  Notas: [_____________________________________________________]    │
│                                                  [Guardar cambios] │
└────────────────────────────────────────────────────────────────────┘
```

- Cada partida editable inline: cantidad (number input), notas (text). Item no es editable directamente — para cambiarlo: eliminar + agregar nueva.
- "+ Agregar partida": dropdown buscable de items del catálogo + cantidad. Al confirmar, agrega partida con snapshot del precio actual.
- "Re-sugerir desde hallazgos": **reemplaza todas las partidas** del plan por las que sugiere la receta actual. Pide confirmación explícita ("perderás los cambios manuales en este plan"). El usuario que quiere mantener cambios manuales debe crear un plan nuevo en vez de re-sugerir.
- Cambios autoguardan con debounce 1s, o el botón "Guardar cambios" fuerza el guardado.
- "Estado" es dropdown: borrador → enviado → aceptado/rechazado.

### 6.4 Lista de planes en el workspace

En el panel `PanelAnalisisRIC` del workspace, debajo de los dos tabs existentes, una sección compacta:

```
─────────────────────────────────────────
 Planes de normalización (3)
  · Plan #3  56.525 CLP   borrador  →
  · Plan #2  64.200 CLP   enviado   →
  · Plan #1  58.900 CLP   rechazado →
 [+ Nuevo plan]
─────────────────────────────────────────
```

Cada item es link a su vista. El "+ Nuevo plan" es la misma acción de generar plan (sección 6.2).

---

## 7. API backend

```
GET    /api/clientes/:c/catalogo                          → ItemCatalogo[]
PUT    /api/clientes/:c/catalogo                          → reemplaza todo el catálogo
POST   /api/clientes/:c/catalogo/semilla                  → restaura desde semilla (sobrescribe)

GET    /api/clientes/:c/tableros/:t/planes                → PlanNormalizacion[]
POST   /api/clientes/:c/tableros/:t/planes                → genera nuevo plan
           body: { autoSugerir: boolean }                   (si true, aplica recetas; si false, plan vacío)
PUT    /api/clientes/:c/tableros/:t/planes/:p             → actualiza plan (reemplaza partidas, notas, estado, incluyeIVA)
DELETE /api/clientes/:c/tableros/:t/planes/:p             → elimina plan
```

Todos los endpoints validan con Zod estricto. `POST /planes` genera ULID, calcula totales en backend (no confiar en frontend), y persiste.

**Cálculo de totales** vive en una función pura `calcularTotalesPlan(plan: PlanNormalizacion): { subtotalCLP, ivaCLP, totalCLP }` en `tipos/cotizacion/calcular.ts`. Llamada por el backend al persistir y por el frontend para preview en vivo.

---

## 8. Tests

| Área | Tests aprox |
|---|---|
| Schemas Zod (ItemCatalogo, PlanNormalizacion, PartidaPlan) | 6 |
| Recetas: cada una resuelve correctamente sobre catálogo semilla | 9 |
| `sugerirPartidasDesdeHallazgos` (incluyendo filtros de no-aplica y pendiente-verificar) | 5 |
| `calcularTotalesPlan` (con/sin IVA, partidas vacías, totales correctos) | 5 |
| Almacén: catalogo (leer/escribir/semilla), planes (CRUD) | 8 |
| API endpoints (4 endpoints catálogo y planes) | 10 |
| Frontend: vista catálogo (render + edición básica) | 3 |
| Frontend: vista plan (render + edición de cantidad + total recalcula) | 4 |
| **Total estimado** | **~50 tests** |

Total acumulado al cierre de Plan 5: ~165 tests.

---

## 9. Migración de datos

- Tableros existentes (Plan 4) sin `planesNormalizacion`: schema lo defaultea a `[]` vía `.default([])`. No requiere migración explícita.
- Clientes existentes sin `catalogo.json`: la primera lectura (GET /catalogo) lo crea desde la semilla.
- Las recetas viven en código, no en disco — se actualizan con código.

---

## 10. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Precios semilla se vuelven obsoletos | El usuario los edita por cliente. Documentar fecha de actualización en el catálogo (campo `actualizadoEn` por item — opcional, no agregar todavía). |
| Recetas no encajan con la realidad del tablero | El usuario edita el plan después de generarlo. Las recetas son sólo punto de partida. |
| Plan referencia item que el usuario eliminó del catálogo | El snapshot conserva descripción + precio + unidad — el plan sigue siendo legible aunque el catálogo cambie. Solo `itemCodigo` queda "huérfano" pero no rompe nada. |
| Múltiples planes saturan el `tablero.json` | Si crece >100KB, mover a `planes/<id>.json`. Por ahora, los planes son livianos (~1-2KB c/u). |
| Cálculos de IVA / totales se hacen tanto en backend como en frontend (riesgo de divergencia) | Función pura compartida en `tipos/cotizacion/calcular.ts`. Backend siempre recalcula al persistir. |

---

## 11. Lo que NO resuelve Plan 5 (queda para planes posteriores)

- PDF de cotización profesional (Plan 6 — junto con PDF de diagrama).
- ZIP portable que empaqueta cliente + tableros + cotizaciones (Plan 8).
- Comparativa entre planes / diff de versiones.
- Recetas editables por usuario.
- Item del catálogo con histórico de precios.
- Recálculo automático al cambiar el catálogo (snapshot por diseño).
- Aprobaciones / firmas digitales.

---

## 12. Criterios de aceptación

- [ ] `npm test` ejecuta ~165 tests, todos pasan.
- [ ] Cliente sin `catalogo.json`: al abrirlo, GET /catalogo devuelve el set semilla y queda persistido.
- [ ] Usuario puede agregar, editar y eliminar items del catálogo desde la UI.
- [ ] "Generar plan de normalización" produce un plan con partidas sugeridas a partir de los hallazgos `no-cumple` activos.
- [ ] El plan generado tiene precios snapshot — cambiar el catálogo después no altera el plan.
- [ ] Usuario puede editar cantidades y agregar/eliminar partidas; los totales recalculan en vivo.
- [ ] Cambiar el estado del plan (borrador → enviado, etc.) persiste.
- [ ] Eliminar un plan funciona y refresca la lista del workspace.
- [ ] Refrescar el navegador preserva todo.
