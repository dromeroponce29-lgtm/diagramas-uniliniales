# Plan 4 — Verificación RIC y entidad Circuito

> Spec de diseño para Plan 4. Deriva del spec principal del proyecto ([2026-05-12-diagramas-uniliniales-design.md](2026-05-12-diagramas-uniliniales-design.md)) sección 3.4, 3.6 y 6.2.
> **No incluye cotización ni catálogo de materiales** — eso queda para Plan 5.

**Fecha:** 2026-05-12
**Autor:** Daniel Romero (con asistencia de Claude)

---

## 1. Objetivo

Al terminar Plan 4, el usuario que abre un tablero con componentes ya cargados puede:

1. **Asignar componentes a circuitos** mediante una tabla editable.
2. **Ver dos listas vivas** que se recalculan en cada cambio:
   - **Hallazgos RIC** — condiciones sub-estándar del tablero según las 9 reglas del spec.
   - **Levantamientos en terreno** — datos que la app no puede saber por foto + datos que requieren medición física para verificar.
3. **Actuar sobre cada hallazgo**: silenciarlo con justificación ("no aplica"), convertirlo en un levantamiento de terreno, o adjuntarle nota libre.

**Lo que NO entrega Plan 4** (queda para planes posteriores):

- Cotización: materiales, precios, mano de obra (Plan 5).
- PDF profesional con diagrama + tablas + simbología (Plan 6).
- Diagrama general inter-tableros (Plan 7).
- Importación/exportación ZIP (Plan 8).

---

## 2. Decisiones de scope (resumen del brainstorming)

| Decisión | Elegido | Alternativa descartada |
|---|---|---|
| Reglas RIC | Las 9 del spec | MVP de 5 reglas componentes-only |
| Entidad Circuito | Sí, como entidad propia | Subcampo dentro de Componente |
| Asignación componentes→circuitos | Tabla editable por tablero | Inline en panel de componentes; o auto-parseo de rotulaciones |
| Acciones sobre hallazgo | Marcar "no aplica" con justificación, convertir a levantamiento, agregar nota libre | Solo lectura |
| UI para las dos listas | Nuevo panel "Análisis RIC" en workspace (reemplaza el panel inferior derecho de HALLAZGOS RIC que era placeholder de Plan 2) | Vista dedicada; modal |
| Origen de los hallazgos generados | Recalculados en vivo (no se persisten); las anotaciones del usuario sí se persisten | Persistir el array completo |
| Cotización | **No en Plan 4** — Plan 5 separado, con catálogo semilla + editable | Todo junto en Plan 4 (2 semanas, demasiado) |

---

## 3. Modelo de datos

### 3.1 Adiciones al tipo `Tablero`

```typescript
// tipos/modelo.ts
export interface Tablero {
  // ... (campos existentes de Plan 2)

  // NUEVO en Plan 4
  circuitos: Circuito[];
  anotacionesHallazgos: AnotacionHallazgo[];
}
```

**Decisión clave**: los hallazgos RIC (`HallazgoRIC[]`) **no se persisten** — se recalculan en frontend desde el resto del tablero. Lo que sí se persiste son las anotaciones del usuario sobre hallazgos específicos (silenciar, nota, conversión a levantamiento).

Esto evita que los hallazgos queden stale después de editar componentes/circuitos. La función de recálculo es pura y barata (operación sobre JSON en memoria).

### 3.2 `Circuito`

```typescript
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
  destino: string;                     // texto libre: "Ampolletas living", "Refrigerador", "pendiente"
  uso: UsoCircuito;
  seccionConductorMM2?: number;        // 1.5, 2.5, 4, 6, 10, 16, 25...
  longitudM?: number;
  cargaW?: number;
  rotulacionLeida?: string;            // copia del texto que leyó el agente para auditoría
  procedencia: Procedencia;
}
```

**Inicialización automática**: cuando el usuario abre la tabla por primera vez, la app crea **una fila por cada automático detectado** en `componentes` (filtrando `tipo === 'interruptor-automatico'`). Las filas se generan con `numero` correlativo, `proteccionComponenteId` apuntando al automático, y el resto en `pendiente`. El usuario puede borrar/agregar filas a mano.

### 3.3 `HallazgoRIC` (generado en vivo, no persistido)

```typescript
export type ResultadoRegla = 'cumple' | 'no-cumple' | 'pendiente-verificar';

export interface HallazgoRIC {
  reglaId: string;                     // ej. 'ric.tablero.dps-presente'
  parteRIC: string;                    // ej. 'RIC N°09'
  descripcionRegla: string;            // legible para humano
  resultado: ResultadoRegla;
  detalle: string;                     // por qué dio ese resultado (ej. "No se encontró componente tipo 'dps'")
  componenteId?: string;
  circuitoId?: string;
  // anotaciones se hacen por separado (ver AnotacionHallazgo); no van aquí porque
  // los hallazgos se regeneran en cada render.
}
```

### 3.4 `AnotacionHallazgo` (persistido)

```typescript
export type TipoAnotacionHallazgo =
  | 'no-aplica'              // el usuario justifica que la regla no aplica
  | 'levantamiento-terreno'  // el hallazgo se convierte en una medición que se hace en terreno
  | 'nota-libre';            // simple comentario adjunto, no cambia el estado

export interface AnotacionHallazgo {
  id: string;                          // ULID
  reglaId: string;                     // referencia a la regla
  componenteId?: string;               // si la anotación es específica a un componente
  circuitoId?: string;                 // si es específica a un circuito
  tipo: TipoAnotacionHallazgo;
  justificacion: string;               // obligatorio para 'no-aplica' y 'levantamiento-terreno'; opcional para 'nota-libre'
  creadoEn: string;                    // ISO
  creadoPor?: string;                  // futura multi-usuario; por ahora vacío o "local"
}
```

**Matching anotación↔hallazgo**: por (`reglaId` + `componenteId?` + `circuitoId?`). Cuando se evalúan reglas, cada `HallazgoRIC` se cruza con las anotaciones para construir el estado visible:

- Si hay anotación `no-aplica` con misma tripleta → el hallazgo se renderiza tachado/silenciado, justificación visible al expandir.
- Si hay anotación `levantamiento-terreno` → el hallazgo aparece también en la lista de levantamientos en terreno.
- Si hay anotación `nota-libre` → el hallazgo se renderiza normal pero con la nota visible.

### 3.5 Levantamientos en terreno — derivación

La lista de "levantamientos en terreno" **no es una entidad nueva**. Se deriva uniendo:

1. **`Pendiente[]` con `resoluble === 'medicion-terreno'`** — los que ya genera Plan 2 cuando un dato es no-observable o cuando hay foto-baja-calidad.
2. **`HallazgoRIC[]` con `resultado === 'pendiente-verificar'`** — reglas que la app no puede evaluar con confianza desde JSON (ej. "verificar continuidad de tierra con megger").
3. **`HallazgoRIC[]` con anotación `levantamiento-terreno`** — hallazgos `no-cumple` que el usuario marcó para verificación física.

Función pura `derivarLevantamientosTerreno(tablero) → LevantamientoTerreno[]` los une, deduplica y ordena.

```typescript
export interface LevantamientoTerreno {
  id: string;                          // estable: derivado de la fuente
  origen: 'pendiente' | 'regla-ric' | 'anotacion-usuario';
  descripcion: string;
  componenteId?: string;
  circuitoId?: string;
  parteRIC?: string;                   // si viene de regla
  prioridad: 'alta' | 'media' | 'baja';
}
```

---

## 4. Motor de reglas RIC

### 4.1 Ubicación

**Módulo compartido**: `tipos/ric/` (al lado de `tipos/modelo.ts`). Las reglas son funciones puras `(tablero) => HallazgoRIC[]`, sin dependencias de React ni de Express. Esto permite:

- Frontend las llama en cada render del workspace (operación barata).
- Backend las puede llamar al exportar (Plan 6) para el PDF/ZIP.
- Tests unitarios directos en Vitest con tableros sintéticos.

Estructura:

```
tipos/ric/
├── tipos.ts                # HallazgoRIC, AnotacionHallazgo, ResultadoRegla, LevantamientoTerreno
├── motor.ts                # función orquestadora: evaluarRIC(tablero) → HallazgoRIC[]
├── reglas/
│   ├── int-general-presente.ts
│   ├── diferencial-presente.ts
│   ├── diferencial-sensibilidad-enchufes.ts
│   ├── barras-tierra-neutro-separadas.ts
│   ├── dps-presente.ts
│   ├── calibre-vs-seccion.ts
│   ├── identificacion-circuitos.ts
│   ├── reserva-minima.ts
│   ├── selectividad.ts
│   └── index.ts            # array de todas las reglas
└── derivar-levantamientos.ts
```

### 4.2 Interfaz de una regla

```typescript
export interface ReglaRIC {
  id: string;                          // 'ric.tablero.dps-presente'
  parteRIC: string;                    // 'RIC N°09'
  descripcion: string;
  evaluar: (tablero: Tablero) => HallazgoRIC[];   // puede devolver 1 o N hallazgos
}
```

Cada regla devuelve un array porque algunas evalúan **por componente o por circuito** y pueden generar múltiples hallazgos (ej. `calibre-vs-seccion` genera uno por circuito).

### 4.3 Las 9 reglas

| reglaId | Implementación |
|---|---|
| `ric.tablero.int-general-presente` | Busca componente tipo `interruptor-general`. Si no existe → `no-cumple`. Si existe sin calibre → `pendiente-verificar`. Si calibre presente y `corrienteNominalA` ausente → `pendiente-verificar`. Si ambos presentes y `calibreA ≥ corrienteNominalA` → `cumple`. |
| `ric.tablero.diferencial-presente` | Busca al menos un componente tipo `diferencial`. Si ninguno → `no-cumple`. |
| `ric.tablero.diferencial-sensibilidad-enchufes` | Por cada circuito con `uso === 'enchufes'`, verifica que tenga un diferencial asociado y que su `sensibilidadMA ≤ 30`. Si falta diferencial o sensibilidad > 30 → `no-cumple`. Si circuito sin uso definido → `pendiente-verificar`. |
| `ric.tablero.barras-tierra-neutro-separadas` | Solo evalúa si `tablero.esquemaTierra === 'TT'`. Cuenta barras tipo `barra-neutro` y `barra-tierra`. Si no son al menos 1 de cada → `no-cumple`. Si esquema = 'pendiente' → `pendiente-verificar`. |
| `ric.tablero.dps-presente` | Solo aplica si `tablero.tipo === 'general'` o si lo definimos siempre obligatorio (por ahora: siempre). Busca componente tipo `dps`. Si no existe → `no-cumple`. |
| `ric.tablero.calibre-vs-seccion` | Por cada circuito con `seccionConductorMM2` definido + componente protección con `calibreA` definido, aplica tabla mínima (1.5mm² → ≤16A, 2.5mm² → ≤20A, 4mm² → ≤25A, 6mm² → ≤40A, 10mm² → ≤63A). Si calibre > máximo permitido → `no-cumple`. Si falta sección o calibre → `pendiente-verificar`. |
| `ric.tablero.identificacion-circuitos` | Por cada circuito: si `destino === 'pendiente'` o vacío → `no-cumple` (un hallazgo por circuito sin rotular). |
| `ric.tablero.reserva-minima` | Cuenta automáticos vs total de espacios. La app no sabe el total de espacios físicos del tablero. Por ahora, dato manual `tablero.espaciosTotales` (lo agregamos en Plan 4): si está presente, verifica `(espaciosTotales - automaticos) / espaciosTotales ≥ 0.20`. Si dato ausente → `pendiente-verificar`. |
| `ric.tablero.selectividad` | Compara `calibreA` del interruptor general vs el max `calibreA` de los automáticos ramales. Si general < max ramal → `no-cumple`. Si general ausente → `pendiente-verificar`. |

**Nota sobre tablas de calibre/sección**: la tabla anterior es referencial. Se documenta en una constante en `tipos/ric/reglas/calibre-vs-seccion.ts` con comentario citando RIC N°02 para que sea fácil de actualizar.

### 4.4 Adición al modelo del tablero

Para la regla de reserva mínima:

```typescript
export interface Tablero {
  // ...
  espaciosTotales?: number;            // NUEVO en Plan 4 — manual del usuario
}
```

---

## 5. UI — Panel "Análisis RIC"

### 5.1 Reemplazo en el workspace

El panel inferior derecho del workspace, que en Plan 3 era placeholder "HALLAZGOS RIC", ahora aloja:

```
┌────────────────────────────────────────────────────────────┐
│  ANÁLISIS RIC                                              │
│  ┌─[Hallazgos (4)]──[Levantamientos terreno (3)]────────┐  │
│  │                                                       │  │
│  │  ❌ Falta DPS                              RIC N°09   │  │
│  │     "No se encontró componente DPS"                   │  │
│  │     [No aplica] [→ Terreno] [Nota]                    │  │
│  │                                                       │  │
│  │  ❌ C5 sin rotulación                      RIC N°04   │  │
│  │     "Circuito #5 no tiene destino definido"           │  │
│  │     [No aplica] [→ Terreno] [Nota]                    │  │
│  │                                                       │  │
│  │  ⏳ Verificar selectividad                 RIC N°06   │  │
│  │     "Interruptor general sin calibre asignado"        │  │
│  │     [No aplica] [→ Terreno] [Nota]                    │  │
│  │                                                       │  │
│  │  ✓ Diferencial principal presente          RIC N°06   │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Tabs

- **Hallazgos**: lista de todos los `HallazgoRIC` con badges de resultado (✓/❌/⏳). Los silenciados aparecen al final, tachados, con badge "No aplica" y la justificación visible al hover. Cada hallazgo es clickeable y resalta el componente/circuito en el diagrama (igual que Plan 3).
- **Levantamientos en terreno**: lista derivada (sección 3.5). Cada item muestra origen, descripción, prioridad. Es read-mostly — el usuario solo puede marcarlos como "hecho" (lo cual los oculta).

### 5.3 Acciones inline en cada hallazgo

- **[No aplica]** abre un mini-modal pidiendo justificación obligatoria. Al confirmar, se crea una `AnotacionHallazgo` tipo `no-aplica`.
- **[→ Terreno]** convierte el hallazgo en un levantamiento. Crea `AnotacionHallazgo` tipo `levantamiento-terreno` con justificación libre opcional.
- **[Nota]** agrega texto libre como `AnotacionHallazgo` tipo `nota-libre`.

Cada acción es deshacer-able: hay un menú "⋯" que muestra anotaciones existentes y permite eliminarlas.

### 5.4 Tabla de circuitos

Ubicación: **nueva pestaña dentro del panel central** (el que en Plan 3 tenía "Componentes y circuitos"). El panel pasa a tener dos tabs: `Componentes` y `Circuitos`.

Columnas de la tabla de circuitos:

| Nº | Protección | Diferencial | Destino | Uso | Sección mm² | Longitud m | Carga W | Rotulación leída |
|---|---|---|---|---|---|---|---|---|
| 1 | C16 (id: 01J...) | RCBO 30mA | Iluminación living | iluminacion | 2.5 | _ | _ | "C1 Ilum" |
| 2 | C20 | — | _pendiente_ | _pendiente_ | _ | _ | _ | "" |
| ...

- Cada celda editable inline (text o select según tipo).
- Auto-inicialización: al abrir la pestaña por primera vez, se generan filas para cada automático sin circuito asignado.
- Validación: `numero` único por tablero, `proteccionComponenteId` único entre circuitos.
- Botón **[+ Agregar circuito]** y **[Eliminar]** por fila.

### 5.5 Dato manual nuevo: espacios totales

Para que la regla `reserva-minima` pueda evaluarse, agregamos un input numérico en el **panel inferior izquierdo** ("Datos del tablero", el mismo donde Plan 2 puso tensión/esquema-tierra/potencia/corriente): "Espacios totales del tablero". Si el usuario lo deja vacío, la regla devuelve `pendiente-verificar`.

### 5.6 Barra superior

Se actualiza el contador en la barra superior del workspace (la que muestra "4 pendientes · 2 hallazgos RIC sin resolver"):

```
Completitud: 78%     ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱
4 hallazgos RIC sin resolver · 3 levantamientos terreno pendientes
```

---

## 6. API backend

### 6.1 Endpoints nuevos

```
PUT  /api/clientes/:c/tableros/:t/circuitos        { circuitos: Circuito[] }
PUT  /api/clientes/:c/tableros/:t/anotaciones-ric  { anotaciones: AnotacionHallazgo[] }
PUT  /api/clientes/:c/tableros/:t/espacios-totales { espaciosTotales: number }
```

Cada uno reemplaza el array completo (no patch) por simplicidad. La validación con Zod es estricta. Persistencia con `escribirJsonAtomico` (ya existe desde Plan 2).

### 6.2 Sin endpoint para evaluar reglas

Las reglas se ejecutan en el frontend importando el módulo `tipos/ric`. Sin round-trip al backend. Esto mantiene la UI reactiva sin latencia.

El backend solo necesita poder evaluar las reglas para el **PDF de exportación** (Plan 6) — para entonces ya estarán disponibles vía el mismo módulo importado.

---

## 7. Tests

### 7.1 Cobertura objetivo

- **Cada regla RIC**: 100% — un test por escenario `cumple`, `no-cumple`, `pendiente-verificar`. Tableros sintéticos como fixture. Total: ~30 tests.
- **`derivarLevantamientosTerreno`**: tableros con diferentes mezclas de Pendientes, HallazgosRIC pendientes-verificar, y anotaciones de usuario. ~6 tests.
- **API endpoints nuevos**: integración con supertest, igual que Plan 2. ~6 tests.
- **Inicialización automática de circuitos**: dado un tablero con N automáticos, la tabla genera N filas con valores pendientes. ~3 tests.
- **Componente React `PanelAnalisisRIC`**: test mínimo con React Testing Library — renderiza listas, click ejecuta callback. ~3 tests.

**Total nuevo**: ~50 tests. Sumado a los actuales (~60), llegamos a ~110 tests al cierre de Plan 4.

### 7.2 No-tests

Estos NO se testean automáticamente y se verifican manualmente en `plan-4-resultados.md`:

- Apariencia visual del panel y la tabla.
- Que el clic en un hallazgo realmente resalte el componente correcto en el SVG.
- Comportamiento con datos reales de un tablero recién subido.

---

## 8. Migración de datos existentes

Tableros creados en Plan 2/3 no tienen `circuitos`, `anotacionesHallazgos`, ni `espaciosTotales`. El backend los completa en `leerTablero` con valores por defecto (`[]`, `[]`, `undefined`) y los escribe la próxima vez que el usuario guarda. No requiere migración separada.

Schema Zod del backend ([apps/servidor/src/esquemas/tablero.ts](apps/servidor/src/esquemas/tablero.ts)) se actualiza con campos opcionales que defaultan a array vacío vía `.default([])`.

---

## 9. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Inicialización automática de circuitos genera ruido si la foto detectó automáticos falsos | El usuario puede borrar filas; la regla `identificacion-circuitos` les pone hallazgo `no-cumple` hasta que se asigne destino, lo que las hace visibles. |
| Tabla mínima calibre/sección puede quedar obsoleta cuando se actualice RIC | Constante separada con cita de la parte RIC; fácil de revisar/actualizar en un solo archivo. |
| Hallazgos `pendiente-verificar` explotan en número y saturan al usuario | El panel los muestra en tab separada (Levantamientos terreno) y agrupa por tipo. Si en práctica son muchos, considerar consolidación post-Plan 4. |
| La regla `dps-presente` no distingue qué tipo de tablero exige DPS | Por ahora exige DPS siempre. El usuario puede marcar "no aplica" con justificación. Refinar en Plan 5+ si genera fricción. |
| Reglas dependen de campos manuales (esquemaTierra, espaciosTotales) que pueden estar en "pendiente" | Las reglas devuelven `pendiente-verificar` en vez de fallar; el usuario ve qué le falta completar. |

---

## 10. Lo que NO resuelve Plan 4 (queda para planes posteriores)

- Catálogo de materiales con precios CLP (Plan 5).
- Motor de cotización: dado un hallazgo, calcular materiales + mano de obra (Plan 5).
- PDF profesional con diagrama + tablas + simbología (Plan 6).
- Importación/exportación ZIP del cliente completo (Plan 8).
- Diagrama general inter-tableros con interconexiones (Plan 7).
- Reglas RIC adicionales (selectividad fina, coordinación con curvas, secciones de conductor de tierra, etc.). El motor es extensible; agregar reglas es lineal.
- Edición directa del componente al clic en el diagrama. Sigue para Plan 6+.

---

## 11. Criterios de aceptación

- [ ] `npm test` ejecuta los ~110 tests, todos pasan.
- [ ] El workspace muestra el panel "Análisis RIC" con sus dos tabs.
- [ ] La tabla de circuitos en el panel central permite crear/editar/borrar filas.
- [ ] Las 9 reglas devuelven `cumple` / `no-cumple` / `pendiente-verificar` correctamente sobre tableros sintéticos.
- [ ] Acciones sobre hallazgos (no-aplica, →terreno, nota) persisten en disco y sobreviven a F5.
- [ ] El contador de la barra superior se actualiza en vivo.
- [ ] Levantamientos en terreno se derivan correctamente de las 3 fuentes (pendientes, reglas pendientes-verificar, anotaciones).
- [ ] Refrescar el navegador preserva circuitos + anotaciones.
