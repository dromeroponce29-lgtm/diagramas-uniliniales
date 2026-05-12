# Plan 5 — Workspace modular y diagrama unilineal compliant RIC N°18

> Spec de Plan 5. Re-trabajo del workspace y del diagrama unilineal para cumplir Pliego Técnico Normativo **RIC N°18 (SEC Chile)** y simbología **IEC 60617**. Incluye parches UX detectados al testear Plan 4.
>
> El motor de cotización (catálogo + plan de normalización) se mueve a Plan 6.

**Fecha:** 2026-05-12
**Autor:** Daniel Romero (con asistencia de Claude)

---

## 1. Objetivo

Al terminar Plan 5, la aplicación entrega:

1. **Workspace dividido en tabs horizontales** (Datos generales · Fotos y componentes · Diagrama · Análisis RIC). Cada tab es su propio "módulo" en una sola URL del tablero — no se mezclan responsabilidades en una sola pantalla apilada.
2. **Empty-state correcto** en el panel "Análisis RIC": cuando el tablero está vacío (sin componentes ni datos manuales) el panel muestra un mensaje guía en lugar de la lista de reglas no-cumple, que actualmente confunde al usuario.
3. **Diagrama unilineal compliant con RIC N°18** que muestra **desde acometida hasta última protección** con:
   - Acometida (representación + datos: tipo, ubicación)
   - Tablero principal con código + capacidad nominal + sistema de barras
   - Alimentador con sección, longitud, canalización (tipo, diámetro, material)
   - Interruptor general con In, Icu, curva, polos, marca, modelo
   - Diferenciales y DPS conectados
   - Ramas (automáticos) con etiquetado completo
   - Conductores con sección por circuito
   - Sistema de puesta a tierra completo (electrodo + conductor + resistencia medida)
4. **Cuadros normativos**, todos generados a partir del modelo del tablero:
   - **Cuadro de cargas** (por circuito: N°, destino, P, I, sección, longitud, protección).
   - **Cuadro resumen de alimentadores** (alimentador: sección, longitud, canalización, capacidad, In, Icu, curva).
   - **Cuadro de simbología** (leyenda IEC 60617 de los símbolos usados).
   - **Viñeta** (proyecto, propietario, instalador, fecha, revisión, lámina) — datos del cliente + del tablero.
   - **Notas generales** (texto libre + normativa aplicada).
5. **Modelo extendido** para sostener los datos que RIC N°18 exige (longitud alimentador, canalización, Icu, curva, marca/modelo, resistencia de tierra, etc.).

**Lo que NO entrega Plan 5** (queda para planes posteriores):

- **PDF exportable** profesional (Plan 7). Plan 5 deja la pantalla en HTML/SVG; el PDF normativo (con vineta, todos los cuadros, simbología en formato lámina) se construye en Plan 7 a partir del mismo modelo.
- **Diagrama inter-tablero** (TG + TDs en la misma lámina) — Plan 5 hace una lámina por tablero. Plan 8 agrega la vista del sistema completo del cliente.
- **Verificación SEC firmable** (Plan 10).
- **Cotización** (Plan 6).

---

## 2. Re-secuenciación del backlog

| Plan | Estado | Contenido |
|---|---|---|
| Plan 4 | ✓ Hecho | Verificación RIC + Circuito |
| **Plan 5 (ESTE)** | En diseño | Workspace tabs + empty state + diagrama RIC N°18 + modelo extendido |
| Plan 6 | Spec listo | Cotización: catálogo + plan de normalización (era Plan 5 original) |
| Plan 7 | Pendiente | PDF profesional del diagrama + cuadros + vineta |
| Plan 8 | Pendiente | ZIP portable cliente; vista inter-tablero |
| Plan 10+ | Pendiente | Verificación SEC firmable, multi-usuario, etc. |

---

## 3. Modelo de datos — adiciones

Plan 4 dejó `Tablero` con `componentes`, `circuitos`, `anotacionesHallazgos`. Plan 5 extiende para soportar los datos que RIC N°18 exige documentar.

### 3.1 Tipo `Tablero` — campos nuevos

```typescript
export type TipoCanalizacion = 'EMT' | 'PVC-rigido' | 'PVC-flexible' | 'bandeja' | 'libre' | 'subterranea' | 'otro';
export type MaterialCanalizacion = 'acero' | 'PVC' | 'aluminio' | 'fibrocemento' | 'otro';
export type TipoAcometida = 'aerea' | 'subterranea' | 'desde-tablero-superior' | 'pendiente';

export interface DatosAcometida {
  tipo: TipoAcometida;
  ubicacion?: string;
  tableroOrigenId?: string;             // si tipo === 'desde-tablero-superior', referencia a otro tablero del cliente
  notas?: string;
}

export interface DatosAlimentadorEntrada {
  // El alimentador es el cable que llega al tablero desde la acometida (o desde el tablero superior).
  seccionConductorMM2?: number;
  longitudM?: number;
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;          // capacidad de transporte calculada/declarada
  conductoresPorFase?: number;           // típicamente 1; si paralelo, 2+
}

export interface DatosPuestaATierra {
  // El esquema sigue viviendo en Tablero.esquemaTierra (Plan 2) — las reglas RIC ya lo consumen.
  // Este sub-doc agrega solo metadata complementaria.
  resistenciaOhmMedida?: number;
  resistenciaOhmProyectada?: number;
  instrumentoMedicion?: string;          // ej. "Telurímetro Fluke 1623-2"
  fechaMedicion?: string;                // ISO date
  tipoElectrodo?: 'jabalina' | 'malla' | 'multielectrodo' | 'pendiente';
  notas?: string;
}

export interface DatosViñeta {
  // La vineta lleva datos cliente + tablero. Plan 5 los persiste por tablero.
  // (En Plan 7 algunos campos del cliente se podrán heredar.)
  numeroLamina?: string;                 // ej. "E-01"
  revision?: string;                     // ej. "Rev 0", "Rev A"
  fechaEmision?: string;                 // ISO date
  instaladorNombre?: string;
  instaladorRUT?: string;
  instaladorClaseSEC?: 'A' | 'B' | 'C' | 'D';
  proyectoNombre?: string;
}

export interface Tablero {
  // ... (campos existentes)
  frecuenciaHz?: number;                 // default 50 — exigido por RIC N°18
  capacidadNominalA?: number;            // capacidad del gabinete (puede diferir de corrienteNominalA)
  notasGenerales?: string;               // notas que aparecen en el bloque de notas del plano
  acometida?: DatosAcometida;
  alimentadorEntrada?: DatosAlimentadorEntrada;
  puestaATierra?: DatosPuestaATierra;    // sub-doc complementario; el esquema sigue en esquemaTierra (Plan 2)
  vineta?: DatosViñeta;
}
```

### 3.2 `Circuito` — campos nuevos (RIC N°18 los exige por circuito)

```typescript
export interface Circuito {
  // ... (campos existentes de Plan 4)
  canalizacionTipo?: TipoCanalizacion;
  canalizacionDiametroMM?: number;
  canalizacionMaterial?: MaterialCanalizacion;
  capacidadCorrienteA?: number;          // capacidad de transporte del conductor del circuito
  potenciaW?: number;                    // ya existe (cargaW) — renombrar a potenciaW para alinear con RIC; alias retrocompatible
  corrienteA?: number;                   // calculada: P / (V * cos φ) o ingresada manualmente
}
```

### 3.3 `ComponenteReconciliado` — campos nuevos

```typescript
export interface ComponenteReconciliado {
  // ... (campos existentes)
  capacidadCortocircuitoKA?: number;     // Icu / Icn — exigido por RIC N°18 para protecciones
  // marca, modelo, calibreA, polos, curva ya existen
}
```

### 3.4 Cliente — campos nuevos para la vineta (heredables)

```typescript
export interface Cliente {
  // ... (campos existentes)
  instaladorPredeterminadoNombre?: string;
  instaladorPredeterminadoRUT?: string;
  instaladorPredeterminadoClaseSEC?: 'A' | 'B' | 'C' | 'D';
  proyectoNombrePredeterminado?: string;
}
```

Cuando un tablero no define su propia vineta, la UI muestra los predeterminados del cliente. Al editar la vineta del tablero, se pueden sobrescribir.

---

## 4. Workspace en tabs — refactor UI

El workspace actual ([apps/web/src/pantallas/WorkspaceTablero.tsx](apps/web/src/pantallas/WorkspaceTablero.tsx)) apila 5 paneles en una sola pantalla. Re-organizamos en **4 tabs horizontales** en una sola URL `/clientes/<c>/tableros/<t>`:

### 4.1 Tab 1 — "Datos generales"

Formulario con todos los datos manuales del tablero:
- Identificación: código, nombre, tipo (general/distribución/comando/otro), ubicación
- Eléctricos: tensión sistema, frecuencia (default 50 Hz), esquema tierra, potencia contratada, corriente nominal, capacidad nominal, espacios totales
- Acometida: tipo, ubicación, tablero origen (si aplica)
- Alimentador de entrada: sección, longitud, canalización (tipo, diámetro, material), capacidad de corriente, conductores por fase
- Puesta a tierra: esquema, electrodo, resistencia medida/proyectada, instrumento, fecha, notas
- Viñeta: número lámina, revisión, fecha emisión, instalador (nombre, RUT, clase SEC), proyecto
- Notas generales

Layout: un solo formulario en grid 2 columnas con secciones colapsables.

### 4.2 Tab 2 — "Fotos y componentes"

Une los paneles que en Plan 4 eran `PanelFotos`, `PanelComponentes` y `PanelPendientes`. Layout:

```
┌──────────────┬────────────────────────────────────────────┐
│ FOTOS        │  COMPONENTES / CIRCUITOS                   │
│ [+ Subir]    │  [Componentes][Circuitos]                  │
│ miniaturas   │  ...                                       │
│              │                                            │
├──────────────┴────────────────────────────────────────────┤
│ PENDIENTES                                                │
└───────────────────────────────────────────────────────────┘
```

Las pestañas internas Componentes/Circuitos de Plan 4 se mantienen.

### 4.3 Tab 3 — "Diagrama"

Vista del diagrama unilineal RIC N°18 compliant. Sección 5 detalla.

### 4.4 Tab 4 — "Análisis RIC"

Lo que en Plan 4 era `PanelAnalisisRIC`, ahora con **empty-state**:

- Si `componentes.length === 0 && circuitos.length === 0 && tensionSistema === 'pendiente' && esquemaTierra === 'pendiente' && espaciosTotales === undefined`, muestra:

  > **Tablero sin datos**
  >
  > Para que aparezca el análisis RIC necesitamos al menos uno de:
  > - Fotos del tablero subidas (van al tab "Fotos y componentes")
  > - Datos manuales en el tab "Datos generales"
  > - Componentes o circuitos ingresados manualmente
  >
  > [→ Ir a Fotos y componentes]   [→ Ir a Datos generales]

- En cuanto cualquier campo se llena, el empty-state desaparece y aparece la lista de hallazgos como en Plan 4 (las dos sub-tabs Hallazgos / Levantamientos terreno se conservan).

### 4.5 Header común del workspace

Por encima de los tabs, una barra horizontal:

```
┌────────────────────────────────────────────────────────────────────┐
│ <Tablero TG> · <Cliente Acme>    Completitud: 78%   [Exportar ▼]   │
│ 4 hallazgos RIC sin resolver · 3 levantamientos terreno pendientes │
├────────────────────────────────────────────────────────────────────┤
│ [Datos generales] [Fotos y componentes] [Diagrama] [Análisis RIC]  │
└────────────────────────────────────────────────────────────────────┘
```

La URL del tablero conserva la tab activa via query param `?tab=diagrama` para deep-linking y back/forward del navegador.

---

## 5. Diagrama unilineal RIC N°18 — contenido visual

El nuevo `DiagramaSVG` representa una lámina A4/A3 con cuatro zonas:

```
┌──────────────────────────────────────────────────────────────────┐
│  NOTAS GENERALES + NORMATIVA APLICADA                            │
│  ・ Tensión: 380V/220V trifásica + neutro 50 Hz                  │
│  ・ Esquema tierra: TT · R medida: 4.2 Ω · Telurímetro Fluke...  │
│  ・ Normativa: RIC N°02, N°04, N°06, N°08, N°09, N°18; IEC 60617 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                  DIAGRAMA UNILINEAL                              │
│         (acometida → IG → barras → DPS / dif → ramas)            │
│                                                                  │
├─────────────────────────────────┬────────────────────────────────┤
│  CUADRO DE CARGAS               │  SIMBOLOGÍA                    │
│  N° Dest. P  I  mm² m Prot.     │  ━━ Bus de fase                │
│  ...                            │  ╱ Automático                  │
│                                 │  Δ Diferencial                 │
│                                 │  ⏚ Tierra                       │
├─────────────────────────────────┴────────────────────────────────┤
│  CUADRO RESUMEN DE ALIMENTADORES        │  VIÑETA                │
│  Alim  mm²  m   Canaliz.  Capac.  In  ... │ Proyecto: ...        │
│  AE-1  16   12  EMT 25/ac 80A     63A  │ Propietario: ...        │
│                                          │ Instalador: ...        │
│                                          │ Lámina: E-01 · Rev 0  │
└──────────────────────────────────────────┴────────────────────────┘
```

### 5.1 Zona central — diagrama unilineal

Estructura de arriba hacia abajo (lectura natural):

```
              ▲
              │  ACOMETIDA (aérea / subterránea)
              │  Tensión / Sistema / R tierra
              │
        ╔═════╧═════╗
        ║  MEDIDOR  ║  (si existe)
        ╚═════╤═════╝
              │  Alimentador entrada: 16mm² Cu · 12 m
              │  Canalización EMT Ø25mm acero
              │  Capacidad 80A
              ▼
        ┌───────────┐
        │ IG 3P 63A │  C · 10 kA · Marca/Modelo
        │  ╱  ╱  ╱  │
        └─────╤─────┘
              │
       ═══════╪═══════  Barra de fases (R-S-T)
       ──────────────   Barra de neutro
       ──────────────   Barra de tierra ⏚ R: 4.2 Ω
              │
   ┌────┬────┼────┬────┬────┬────┐
   │    │    │    │    │    │    │
   DPS  Dif. Ramal Ramal Ramal Ramal ...
   1P   4P40A 16A   16A   20A   25A
        30mA C    C     C     C
              │     │     │     │
            C-1   C-2   C-3   C-4
            2.5   2.5   4.0   4.0 mm²
            8m    6m    10m   12m
            Ilum. Ench. Cocina Fuerza
```

Reglas visuales:

- **Acometida**: símbolo de entrada (flecha hacia abajo) con etiqueta de tensión, sistema y frecuencia.
- **Medidor**: círculo con "kWh" si existe componente tipo `medidor`.
- **Alimentador entrada**: línea con caja de etiqueta a su derecha listando sección, longitud, canalización (tipo Ø material) y capacidad de corriente.
- **IG**: rectángulo grande con calibre, número de polos, curva, Icu y marca/modelo cuando disponibles. Polos representados con tantas barras inclinadas como polos.
- **Barras**: tres líneas horizontales paralelas (fase, neutro, tierra) con colores diferenciados (negro/azul/verde-amarillo). Símbolo ⏚ al lado de la barra de tierra con valor de resistencia medida.
- **DPS, diferencial principal**: ramas en paralelo a las protecciones de circuitos, conectadas a las barras.
- **Ramales**: cada automático colgando de la barra con sus etiquetas; debajo, la línea del circuito con sección, longitud y destino.
- **Circuitos finales**: nombre del destino + uso (iluminación/enchufes/...) debajo de cada ramal.
- **Tierra**: electrodo simbólico al pie del diagrama, conectado a barra de tierra, con etiqueta de resistencia y tipo de electrodo.

### 5.2 Zona superior — Notas generales

Bloque de texto multi-línea con:
- Tensión / fases / frecuencia / esquema
- Esquema tierra + R medida + instrumento + fecha
- Acometida + tipo
- Normativa aplicada: lista compuesta automáticamente a partir de las reglas RIC evaluadas (`RIC N°06, N°08, N°09, N°18, N°02, IEC 60617`).
- Notas particulares del proyecto (campo `tablero.notasGenerales`).

### 5.3 Zona inferior izquierda — Cuadro de cargas

Tabla generada del array `tablero.circuitos`:

| N° | Destino | Uso | P (W) | I (A) | Sección mm² | Long. m | Canalización | Protección |
|----|---------|-----|-------|-------|-------------|---------|--------------|------------|
| 1 | Ilum. living | iluminación | 600 | 2.7 | 2.5 | 8 | EMT Ø20 | C16 1P C |
| 2 | Enchufes living | enchufes | 1500 | 6.8 | 2.5 | 6 | EMT Ø20 | C16 1P C + Δ30mA |

Si un campo no está poblado, se muestra `—` (no se inventa).

### 5.4 Zona inferior centro — Cuadro de simbología

Leyenda IEC 60617 condensada con los símbolos efectivamente usados en el diagrama. Si no hay DPS, no se incluye su símbolo. Genera la lista dinámicamente.

### 5.5 Zona inferior derecha — Cuadro resumen de alimentadores

Por ahora una sola fila: el alimentador de entrada al tablero. (En Plan 8, cuando aparecen interconexiones entre tableros, esta tabla se llena con todos los alimentadores del sistema.)

| Alim. | mm² | Long. m | Canalización | Capacidad A | In Prot. A | Icu kA | Curva |
|-------|-----|---------|--------------|-------------|------------|--------|-------|
| AE-1 (acometida → TG) | 16 | 12 | EMT Ø25 acero | 80 | 63 | 10 | C |

### 5.6 Zona inferior derecha (esquina) — Viñeta

Bloque inferior derecho del plano. Datos:

```
┌────────────────────────────────────┐
│ Proyecto: Edificio Acme            │
│ Propietario: Acme SpA              │
│ Instalador: Daniel Romero          │
│ RUT: 12.345.678-9                  │
│ Clase SEC: A                       │
│ Fecha emisión: 12/05/2026          │
│ Lámina: E-01    Rev: 0             │
└────────────────────────────────────┘
```

Cada campo desde `tablero.vineta` (con fallback a campos predeterminados del cliente).

---

## 6. Empty-state RIC — detalle

Bug confirmado en Plan 4: el panel "Análisis RIC" muestra hallazgos `no-cumple` (Falta IG, Falta DPS, Falta diferencial) en tableros recién creados sin datos, lo cual confunde al usuario que piensa que son hallazgos heredados del tablero anterior.

**Fix** ([apps/web/src/componentes/PanelAnalisisRIC.tsx](apps/web/src/componentes/PanelAnalisisRIC.tsx)):

Función `tableroEstaVacio(t: Tablero): boolean` (en `tipos/ric/empty-state.ts`, para que sea compartida) — devuelve `true` cuando:

```typescript
t.componentes.length === 0 &&
t.circuitos.length === 0 &&
t.tensionSistema === 'pendiente' &&
t.esquemaTierra === 'pendiente' &&
t.espaciosTotales === undefined &&
t.fotos.length === 0
```

Si `tableroEstaVacio(tablero)` → mostrar el empty-state con CTAs hacia las tabs "Datos generales" y "Fotos y componentes" (sección 4.4). Si no, mostrar la lista de hallazgos normal.

El contador de la barra superior **también respeta el empty-state**: si el tablero está vacío, muestra "Tablero sin datos — completa la información para empezar" en lugar de los contadores.

---

## 7. Persistencia y API

### 7.1 Endpoints nuevos

```
PUT  /api/clientes/:c/tableros/:t/acometida           { acometida }
PUT  /api/clientes/:c/tableros/:t/alimentador-entrada { alimentadorEntrada }
PUT  /api/clientes/:c/tableros/:t/puesta-a-tierra     { puestaATierra }
PUT  /api/clientes/:c/tableros/:t/vineta              { vineta }
PUT  /api/clientes/:c/tableros/:t/notas               { notasGenerales }
```

Cada uno reemplaza el subdocumento completo. Patrón idéntico al de `PUT /circuitos` y `PUT /anotaciones-ric` de Plan 4.

Para evitar 5 endpoints separados, alternativa: usar el endpoint existente `PUT /api/clientes/:c/tableros/:t` (de Plan 2) extendiendo `EsquemaTableroActualizacion` para aceptar los nuevos sub-objetos opcionales. **Decisión**: usar el endpoint existente extendido. Más simple. Sólo `vineta` y `puestaATierra` se vuelven `Partial` opcionales en el schema de actualización.

### 7.2 Schema Zod

Extender `EsquemaTableroEntrada` y `EsquemaTablero` en [apps/servidor/src/esquemas/tablero.ts](apps/servidor/src/esquemas/tablero.ts) con los sub-schemas para `DatosAcometida`, `DatosAlimentadorEntrada`, `DatosPuestaATierra`, `DatosViñeta`.

### 7.3 Migración de datos

- Tableros existentes (Plan 4) sin estos campos: schema los acepta como `optional()` — no rompe nada. Al editarlos por primera vez en la nueva UI, el backend los persiste.
- `frecuenciaHz`: schema lo defaultea a `50` si está ausente; el frontend muestra 50 Hz en la vineta cuando se deja vacío.

---

## 8. Diseño de componentes frontend

Estructura nueva en `apps/web/src/diagrama/`:

```
diagrama/
├── DiagramaSVG.tsx           # contenedor principal (mantiene zoom/pan)
├── CuadroRotulacion.tsx      # YA EXISTE — se renombra a Viñeta.tsx
├── tipos.ts
├── layout/                   # ya existe — algoritmo de layout determinístico
├── simbolos/                 # ya existe — símbolos IEC
├── lamina/                   # NUEVO en Plan 5
│   ├── NotasGenerales.tsx
│   ├── CuadroDeCargas.tsx
│   ├── CuadroDeAlimentadores.tsx
│   ├── CuadroDeSimbologia.tsx
│   └── Viñeta.tsx            # (renombrado desde CuadroRotulacion)
├── unilineal/                # NUEVO en Plan 5 — el diagrama propiamente tal
│   ├── Acometida.tsx
│   ├── Medidor.tsx
│   ├── AlimentadorEntrada.tsx
│   ├── InterruptorGeneral.tsx
│   ├── Barras.tsx
│   ├── RamalProteccion.tsx
│   ├── CircuitoFinal.tsx
│   ├── PuestaATierra.tsx
│   └── construir-arbol.ts    # función pura: tablero → árbol del unilineal
```

Las tabs nuevas viven en `apps/web/src/pantallas/WorkspaceTablero.tsx` reorganizado, con sub-componentes en `apps/web/src/componentes/tabs/`:

```
componentes/tabs/
├── TabDatosGenerales.tsx
├── TabFotosComponentes.tsx
├── TabDiagrama.tsx
└── TabAnalisisRIC.tsx        # mueve y adapta el PanelAnalisisRIC existente con empty-state
```

`PanelAnalisisRIC`, `PanelFotos`, `PanelComponentes`, `PanelPendientes`, `TablaCircuitos`, `AccionesHallazgo` se conservan como sub-componentes — sólo cambia dónde se renderizan.

---

## 9. Tests

| Área | Tests aprox |
|---|---|
| Schemas Zod (DatosAcometida, AlimentadorEntrada, PuestaATierra, Viñeta) | 8 |
| Persistencia: leer/escribir tablero con campos nuevos | 4 |
| API: PUT /tableros/:t con nuevos sub-objetos | 6 |
| Frontend `tableroEstaVacio` (función pura, 6 casos) | 6 |
| Frontend `construir-arbol` (función pura: tablero → árbol unilineal) | 8 |
| Frontend `CuadroDeCargas` renderiza filas correctamente desde circuitos | 4 |
| Frontend `CuadroDeAlimentadores` renderiza alimentador entrada | 2 |
| Frontend `Viñeta` muestra fallback a datos del cliente cuando no hay datos en tablero | 2 |
| Frontend `TabAnalisisRIC` muestra empty-state cuando tablero vacío | 3 |
| Frontend tabs routing (?tab=X funciona, deep-link, back/forward) | 3 |
| **Total estimado** | **~46 tests** |

Total acumulado al cierre de Plan 5: ~160 tests (115 actuales + 46 nuevos).

---

## 10. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| El diagrama SVG con todos los cuadros se vuelve ilegible en pantallas pequeñas | El diagrama soporta zoom/pan (ya existe en Plan 3). En Plan 7 (PDF) tendremos el control completo del tamaño A3/A4. |
| Datos manuales nuevos (canalización, longitud, Icu, etc.) son muchos campos por completar | UI de "Datos generales" usa secciones colapsables. Campos faltantes salen como `—` en el plano, no bloquean visualización. Las reglas RIC ya marcan como `pendiente-verificar` cuando faltan datos. |
| Modelo `Tablero` se vuelve grande y propenso a regresiones | Sub-documentos opcionales (Acometida, Viñeta, etc.) — schemas Zod aislados por sub-doc. Tests unitarios por schema. |
| Cambio de UI rompe muscle memory del usuario | Se documenta el cambio en el plan de resultados; el contenido de los paneles antiguos no cambia, sólo se mueven a tabs. |
| El renombre `CuadroRotulacion.tsx` → `Viñeta.tsx` rompe imports | El componente lo importan pocas referencias; búsqueda + reemplazo cubre. |

---

## 11. Lo que NO resuelve Plan 5

- PDF exportable (Plan 7) — la lámina vive en HTML/SVG, no exportable a A3/A4 con corte exacto y todas las garantías visuales. Plan 7 toma el SVG y lo renderiza con `pdf-lib` (o similar) respetando vineta, simbología y márgenes RIC.
- Vista inter-tablero (sistema completo del cliente con todas las interconexiones) — Plan 8.
- Validación que la vineta esté completa antes de exportar — Plan 7.
- Verificación firmable SEC — Plan 10+.
- Generación automática del cuadro de cargas a partir de catálogo de aparatos eléctricos (estimación por tipo de uso) — fuera de scope; los datos los entra el usuario.
- Importación de datos eléctricos desde planos AutoCAD/Revit — fuera de scope para siempre, probablemente.
- **Validación "cargas futuras = 0 W"** (último item del checklist RIC N°18) — se puede agregar como regla RIC en Plan 4.5 o futuro; no se modela en Plan 5.
- **Tensiones de paso y contacto** para empalmes en MT — se requieren sólo cuando hay empalme en MT; este flujo es minoritario. Defer hasta que aparezca un proyecto MT que lo demande.

---

## 12. Criterios de aceptación

- [ ] `npm test` ejecuta ~160 tests, todos pasan.
- [ ] El workspace está dividido en 4 tabs horizontales con URL deep-linkable.
- [ ] Tab "Análisis RIC" muestra empty-state cuando el tablero está vacío; en cuanto haya algún dato, vuelve a la lista de hallazgos.
- [ ] Tab "Datos generales" permite editar todos los campos nuevos (acometida, alimentador, puesta a tierra, vineta, notas).
- [ ] Tab "Diagrama" muestra el unilineal con acometida, medidor (si aplica), IG, barras, DPS/dif, ramales con sus etiquetas RIC.
- [ ] Cuadro de cargas se genera desde `circuitos`; cuadro de alimentadores desde `alimentadorEntrada`; vineta desde `tablero.vineta` con fallback a cliente.
- [ ] Notas generales y normativa aplicada se muestran en bloque superior del diagrama.
- [ ] Refrescar el navegador preserva la tab activa.
- [ ] Refrescar el navegador preserva todos los datos nuevos del modelo.

---

## 13. Referencias normativas aplicadas

- **SEC RIC N°18** — Presentación de Proyectos (formato planos, vineta, cuadros, simbología, unilineal)
- **SEC RIC N°19** — Puesta en Servicio (documentación verificable)
- **SEC RIC N°01** — Empalmes (acometida)
- **SEC RIC N°02** — Conductores y secciones
- **SEC RIC N°03** — Alimentadores y demanda
- **SEC RIC N°04** — Identificación de circuitos, reserva
- **SEC RIC N°06** — Protecciones (IG, diferencial, selectividad)
- **SEC RIC N°08** — Puesta a tierra (separación de barras TT)
- **SEC RIC N°09** — DPS
- **DS N°8/2019** Ministerio de Energía — Reglamento de Seguridad
- **NCh 13 Of. 93** — Dibujo técnico chileno
- **IEC 60617** — Símbolos gráficos para diagramas eléctricos
- **IEC 61082** — Preparación de documentos electrotécnicos
- **IEC 60364** — Instalaciones eléctricas de baja tensión (referencia complementaria)
