# Diagramas Uniliniales — Documento de diseño

- **Fecha:** 2026-05-12
- **Autor:** Daniel Romero (con asistencia de Claude)
- **Estado:** Aprobado para implementación

---

## 1. Objetivo y alcance

Construir una aplicación web local que, a partir de fotografías de tableros eléctricos, genere diagramas unilineales profesionales conformes a la norma chilena **RIC** (Reglamento de Instalaciones de Consumo, SEC) y a los símbolos **IEC 60617** (estándar al que adhieren tanto el catálogo de ABB como el currículum nacional chileno).

**Alcance funcional:**

- Subida de hasta 20 fotografías por tablero.
- Extracción asistida por dos agentes de IA (Claude y OpenAI) operando en paralelo, con reconciliación posterior.
- Modelo de datos jerárquico **Cliente → Tableros → Interconexiones**.
- Diagramas unilineales por tablero individual y, opcionalmente, un diagrama general del sistema completo cuando el usuario aporta los datos de interconexión.
- Verificación activa de cumplimiento RIC con resultados ✓ cumple / ⚠ pendiente / ❌ no cumple.
- Exportación a PDF (A4 o A3 seleccionable) y a archivo ZIP portable del cliente completo.

**Principio rector:** la aplicación **no asume ni estima nada**. Todo dato que no sea directamente observable en las fotografías queda como **pendiente de levantamiento en terreno**, resoluble por foto adicional o por entrada manual del usuario.

**Fuera de alcance (no se construye en esta versión):**

- Autenticación multi-usuario.
- Despliegue en nube.
- Edición libre del diagrama tipo Lucidchart (el layout es determinístico).
- Exportación a DXF/DWG.
- Cobertura de media tensión.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  NAVEGADOR — Vite + React + TypeScript + Tailwind           │
│  Pantallas: lista de clientes, workspace de tablero,        │
│  editor de interconexiones, vista del diagrama general.     │
│  Estado: Zustand.                                           │
└────────────────────────────┬────────────────────────────────┘
                             │  HTTP (localhost)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND — Node + Express + TypeScript                      │
│  Rutas:                                                     │
│   POST /api/extract       orquesta Claude + OpenAI          │
│   POST /api/reconcile     consolida resultados              │
│   GET/PUT /api/proyectos  lee/escribe sistema de archivos   │
│   POST /api/export-zip    arma ZIP del cliente              │
│   POST /api/import-zip    restaura desde ZIP                │
│  Claves API en .env — nunca tocan el navegador.             │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌────────────────┐         ┌────────────────────────┐
     │ APIs externas  │         │  Sistema de archivos   │
     │ • Anthropic    │         │  proyectos/...         │
     │ • OpenAI       │         └────────────────────────┘
     └────────────────┘
```

### 2.1 Estructura del repositorio

```
diagramas-uniliniales/
├── apps/
│   ├── web/                  # Vite + React (frontend)
│   │   ├── src/
│   │   │   ├── pantallas/    # ClienteLista, TableroWorkspace, etc.
│   │   │   ├── componentes/  # UI reutilizable
│   │   │   ├── diagrama/     # motor SVG, símbolos IEC
│   │   │   ├── ric/          # reglas y verificador RIC
│   │   │   ├── estado/       # stores Zustand
│   │   │   ├── api/          # cliente HTTP
│   │   │   └── tipos/        # tipos TS compartidos
│   │   └── package.json
│   └── servidor/             # Node + Express (backend)
│       ├── src/
│       │   ├── rutas/        # endpoints HTTP
│       │   ├── agentes/      # clientes Anthropic + OpenAI + reconciliador
│       │   ├── almacen/      # lectura/escritura FS, ZIP
│       │   └── tipos/        # tipos TS compartidos
│       ├── .env.example
│       └── package.json
├── docs/superpowers/specs/   # documentos de diseño
├── proyectos/                # datos del usuario — gitignored
└── package.json              # workspace raíz con scripts
```

### 2.2 Decisiones técnicas

- **Monorepo simple** con `apps/web` y `apps/servidor`. Tipos TypeScript compartidos por referencia de carpeta, sin paquete npm interno.
- **Zustand** sobre Redux para el estado: más simple, sin boilerplate, suficiente para el tamaño esperado.
- **Carpeta `proyectos/` en `.gitignore`**: los datos del usuario nunca van al repositorio del código.
- **Convenciones del proyecto** (CLAUDE.md): comentarios en español, componentes en PascalCase, funciones en camelCase.

---

## 3. Modelo de datos

Tres entidades en jerarquía, persistidas como JSON en el sistema de archivos.

### 3.1 Cliente

```typescript
interface Cliente {
  id: string;                    // ULID
  nombre: string;
  rut?: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  creadoEn: string;              // ISO date
  actualizadoEn: string;
  tableros: ResumenTablero[];    // referencias (id + código + completitud)
  interconexiones: Interconexion[];
}
```

### 3.2 Tablero

```typescript
interface Tablero {
  id: string;
  clienteId: string;
  codigo: string;                // "TG", "TD-1", "TD-Cocina"
  nombre: string;
  tipo: 'general' | 'distribucion' | 'comando' | 'otro';
  ubicacion?: string;

  // Datos eléctricos del sistema (mayoritariamente manuales)
  tensionSistema: '220V-mono' | '380V-trif' | '380V/220V-trif-n' | 'pendiente';
  esquemaTierra: 'TT' | 'TN-S' | 'TN-C-S' | 'IT' | 'pendiente';
  potenciaContratadaKW?: number;
  corrienteNominalA?: number;

  fotos: Foto[];                 // hasta 20
  componentes: Componente[];
  circuitos: Circuito[];
  pendientes: Pendiente[];
  hallazgosRIC: HallazgoRIC[];
  porcentajeCompletitud: number;

  creadoEn: string;
  actualizadoEn: string;
}
```

### 3.3 Componente

```typescript
interface Componente {
  id: string;
  tipo: 'interruptor-automatico' | 'diferencial' | 'interruptor-general'
      | 'barra-fase' | 'barra-neutro' | 'barra-tierra'
      | 'dps' | 'contactor' | 'rele-termico' | 'medidor' | 'borne' | 'otro';
  marca?: string;
  modelo?: string;
  calibreA?: number;
  polos?: 1 | 2 | 3 | 4;
  curva?: 'B' | 'C' | 'D' | 'K';
  sensibilidadMA?: number;
  posicionEnTablero?: { fila: number; columna: number };

  procedencia: {
    fuente: 'foto-claude' | 'foto-openai' | 'foto-ambos' | 'manual' | 'pendiente';
    confianza: 'alta' | 'media' | 'baja' | 'discrepancia';
    fotoId?: string;
    notas?: string;              // ej: "Claude leyó 16A, OpenAI leyó 10A"
  };
}
```

### 3.4 Circuito

```typescript
interface Circuito {
  id: string;
  numero: number;
  proteccionComponenteId: string;
  destino: string | 'pendiente';
  uso: 'iluminacion' | 'enchufes' | 'fuerza' | 'calefaccion' | 'otro' | 'pendiente';
  seccionConductorMM2?: number;
  longitudM?: number;
  cargaW?: number;
  procedencia: {
    fuente: 'foto-claude' | 'foto-openai' | 'foto-ambos' | 'manual' | 'pendiente';
    confianza: 'alta' | 'media' | 'baja' | 'discrepancia';
    fotoId?: string;
    notas?: string;
  };
}
```

### 3.5 Interconexión

```typescript
interface Interconexion {
  id: string;
  origen: {
    tableroId: string;
    terminal: string;              // "Salida circuito 3" / "Barra principal"
    rol: 'fuente';
  };
  destino: {
    tableroId: string;
    terminal: string;              // "Entrada interruptor general"
    rol: 'carga';
  };
  seccionConductorMM2?: number;
  longitudM?: number;
  notasUsuario?: string;
}
```

### 3.6 Pendiente y HallazgoRIC

```typescript
interface Pendiente {
  id: string;
  categoria: 'dato-no-observable' | 'discrepancia-agentes' | 'foto-baja-calidad';
  descripcion: string;
  componenteId?: string;
  circuitoId?: string;
  resoluble: 'foto-nueva' | 'entrada-manual' | 'medicion-terreno';
}

interface HallazgoRIC {
  id: string;
  parteRIC: string;                // "RIC N°06"
  regla: string;
  resultado: 'cumple' | 'no-cumple' | 'pendiente-verificar';
  componenteId?: string;
  circuitoId?: string;
  detalle: string;
}
```

### 3.7 Estructura en disco

```
proyectos/
└── <slug-cliente>/
    ├── cliente.json
    └── tableros/
        └── <slug-tablero>/
            ├── tablero.json
            ├── fotos/
            │   ├── 001.jpg
            │   └── 002.jpg
            └── extracciones/
                ├── 001-claude.json
                ├── 001-openai.json
                └── 001-reconciliado.json
```

### 3.8 Principios del modelo

- **Cada dato lleva su `procedencia`**: fuente (qué agente o manual), confianza, notas. Materializa la regla "no asumir nada": cualquier dato con `procedencia.fuente === 'pendiente'` se renderiza distinto y bloquea exportación.
- **Discrepancias entre agentes se preservan**: el usuario las resuelve manualmente, no se promedia ni se elige al azar.
- **Extracciones crudas se guardan** para auditoría a largo plazo.

---

## 4. Flujo del usuario

### 4.1 Pantalla 1 — Lista de clientes

Lista plegable de clientes, cada uno con su porcentaje de completitud global y sus tableros. Acciones por cliente: editar interconexiones, exportar ZIP, exportar todos los diagramas. Botón global: importar ZIP.

### 4.2 Pantalla 2 — Workspace del tablero

Pantalla principal, layout en cuatro paneles + barra superior de completitud:

```
┌────────────────────────────────────────────────────────────────────────┐
│ <Tablero> · <Cliente>   Completitud: 78%        [Exportar ▼]           │
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱  4 pendientes · 2 hallazgos RIC sin resolver        │
├────────────────┬───────────────────────────────┬───────────────────────┤
│ FOTOS (5/20)   │ COMPONENTES Y CIRCUITOS       │ DIAGRAMA UNILINEAL    │
│ [+ Subir foto] │ (lista navegable; cada ítem   │ (SVG en vivo con      │
│ miniaturas...  │ muestra procedencia, confianza│ zoom/pan; clic en     │
│                │ y, si aplica, discrepancia    │ componente hace       │
│                │ resoluble)                    │ scroll al panel       │
│                │                               │ central)              │
├────────────────┴───────────────────────────────┴───────────────────────┤
│ PENDIENTES (4)             │ HALLAZGOS RIC                             │
│ • Sección C3 (manual)      │ ✓ Diferencial principal presente          │
│ • Discrepancia calibre C3  │ ❌ Falta DPS (RIC N°09)                   │
└────────────────────────────┴───────────────────────────────────────────┘
```

### 4.3 Secuencia típica

1. Crear/abrir cliente → crear/abrir tablero.
2. Subir fotos (hasta 20). Cada foto va al backend → Claude y OpenAI en paralelo → reconciliador → resultado al panel central.
3. Revisar componentes; resolver discrepancias con el botón inline (que muestra las dos lecturas lado a lado).
4. Resolver pendientes por entrada manual o foto adicional.
5. El diagrama de la derecha se actualiza en vivo. Componentes con datos pendientes se dibujan con borde punteado naranja.
6. Hallazgos RIC se recalculan en cada cambio; clic en un hallazgo hace zoom al componente involucrado.
7. Exportar (PDF del tablero / PDFs de todos los tableros / diagrama general / ZIP).

Si hay pendientes sin resolver, la exportación pide confirmación explícita y el PDF lleva marca de agua **"BORRADOR — PENDIENTE LEVANTAMIENTO DE TERRENO"**.

### 4.4 Pantalla 3 — Editor de interconexiones

Disponible cuando el cliente tiene ≥2 tableros. El usuario crea cada interconexión declarando explícitamente: tablero origen, terminal origen, tablero destino, terminal destino, sección de conductor (opcional). La aplicación no infiere conexiones.

### 4.5 Pantalla 4 — Diagrama general del sistema

Visible solo si hay ≥1 interconexión registrada. Muestra cada tablero como bloque cerrado y las interconexiones como líneas etiquetadas con calibre/sección.

---

## 5. Pipeline de extracción dual-agent

### 5.1 Flujo por foto

```
Foto subida (JPEG/PNG/HEIC, máx 10 MB)
  │
  ▼
Pre-procesamiento (backend): re-encode JPEG q85, lado mayor ≤ 2048 px,
EXIF stripped, persistida en proyectos/.../fotos/NNN.jpg
  │
  ├─────────────┬─────────────┐
  ▼             ▼             │
Claude vision   OpenAI vision │ (en paralelo)
(opus-4-7)      (gpt-4o)      │
  │             │             │
  └─────────────┴─────────────┘
                │
                ▼
        Reconciliador (Claude)
        Inputs: foto + ambos JSON
                │
                ▼
        JSON reconciliado → revisión humana → fusión al tablero
```

### 5.2 Prompt común a ambos agentes

Instruye al agente a:

1. Identificar componentes visibles.
2. Reportar solo lo que efectivamente lee: marca, modelo, calibre, polos, curva, sensibilidad, posición. Si un campo no es legible → `null`. **Nunca inferir**.
3. Reportar texto literal de etiquetas y rotulaciones.
4. Reportar calidad de la foto (`buena | aceptable | mala`) y razones.
5. Devolver JSON estricto validado con Zod.

Regla explícita en el prompt: *"Si tienes la menor duda sobre un valor, devuélvelo como null. Esta aplicación no asume ni estima nada."* — reforzada con ejemplos positivo y negativo.

### 5.3 Schema de salida

```typescript
const SchemaExtraccion = z.object({
  calidadFoto: z.enum(['buena', 'aceptable', 'mala']),
  problemasFoto: z.array(z.string()),
  componentesDetectados: z.array(z.object({
    tipoSugerido: z.enum([
      'interruptor-automatico', 'diferencial', 'interruptor-general',
      'barra-fase', 'barra-neutro', 'barra-tierra',
      'dps', 'contactor', 'rele-termico', 'medidor', 'borne', 'otro'
    ]),
    marca: z.string().nullable(),
    modelo: z.string().nullable(),
    calibreA: z.number().nullable(),
    polos: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
    curva: z.enum(['B','C','D','K']).nullable(),
    sensibilidadMA: z.number().nullable(),
    posicion: z.object({ fila: z.number(), columna: z.number() }).nullable(),
    textoLeido: z.string().nullable(),
    confianzaAgente: z.enum(['alta','media','baja']),
    notas: z.string().nullable()
  })),
  rotulacionCircuitosLeida: z.array(z.object({
    numero: z.number().nullable(),
    textoOriginal: z.string()
  }))
});
```

Si la respuesta no parsea contra el schema, **no se usa**: se registra como error.

### 5.4 Reconciliador

Segundo prompt ejecutado por Claude. Recibe la foto + ambos JSON. Lógica explícita en prompt:

- **Coincidencia en un campo** → `confianza: 'alta'`, `procedencia.fuente: 'foto-ambos'`.
- **Solo uno reportó valor** → `confianza: 'media'`, `procedencia.fuente: 'foto-claude' | 'foto-openai'`.
- **Valores distintos** → `confianza: 'discrepancia'`, ambas lecturas conservadas en `procedencia.notas`.
- **Ambos `null`** → no aparece; se genera `Pendiente`.

El reconciliador no inventa valores.

### 5.5 Manejo de errores del pipeline

| Situación | Respuesta |
|---|---|
| Una API falla (red, rate-limit, 5xx) | 2 reintentos con backoff. Si persiste, se usa solo el otro agente; todo lo extraído queda con `confianza: 'media'`. |
| Ambas APIs fallan | Foto subida sin extracción. Botón "Reintentar extracción" en UI. |
| JSON no parsea contra Zod | Crudo guardado en `extracciones/NNN-<agente>-error.json`. Toast: "Datos inválidos — reintenta". |
| Foto reportada como `mala` | Advertencia visible en miniatura. No bloquea: el usuario decide. |
| Timeout > 60 s | Abortar, tratar como error. |

### 5.6 Costo y rendimiento

- Por foto: ~4 s extracción paralela + ~3 s reconciliador ≈ **7 s**.
- 20 fotos en cola: **~2–3 min**.
- Costo aproximado: USD 0,05–0,10 por foto; ~USD 1,50 por tablero. La UI muestra estimación antes de procesar.

### 5.7 Punto de control humano

Antes de fusionar al estado del tablero: diálogo *"Se identificaron N componentes. Discrepancias: M. ¿Aceptar e integrar?"*. La IA nunca modifica el estado sin click humano.

---

## 6. Motor de diagrama, verificación RIC y exportación

### 6.1 Motor del diagrama unilineal

**Filosofía:** layout determinístico y estructurado. El unilineal tiene topología regular y se beneficia de un algoritmo simple, no de fuerza dirigida.

**Capas verticales fijas:** acometida → medidor → interruptor general → diferencial principal → barra → automáticos → destinos. DPS y transformadores se posicionan en zonas laterales reservadas.

**Grilla SVG en unidades milimétricas** mapeada al tamaño de página seleccionado. Regla práctica de auto-sugerencia: >12 circuitos en un tablero → la app propone A3. El usuario siempre puede sobrescribir la sugerencia.

**Biblioteca de símbolos:** SVG vectoriales propios siguiendo **IEC 60617**. Catálogo inicial ~25 símbolos: interruptor automático, diferencial, fusible, contactor, relé térmico, transformador, motor, generador, medidor, DPS, barras, tierra, neutro, conexión, flecha de acometida, banco de medidas, sub-tablero, etc.

**Resaltado en el diagrama:**
- `procedencia.confianza === 'pendiente'` → trazo punteado naranja.
- Discrepancia → trazo doble rojo con ⚠ en una esquina.
- Clic en componente → scroll/highlight del item en el panel central.

**Diagrama general del sistema:** cada tablero como bloque cerrado con código, tipo y cantidad de circuitos; interconexiones como líneas etiquetadas; topología jerárquica con TG arriba y TDs en filas por nivel.

### 6.2 Verificación RIC

Módulo `apps/web/src/ric/` con reglas declarativas. Cada regla es función pura `(tablero, cliente) => HallazgoRIC`. Se ejecutan todas en cada cambio de estado (operación barata sobre JSON en memoria).

**Conjunto inicial de reglas:**

| Código interno | Verifica | Parte RIC |
|---|---|---|
| `ric.tablero.int-general-presente` | Interruptor general dimensionado a corriente nominal | RIC N°06 |
| `ric.tablero.diferencial-presente` | Existe diferencial principal y/o por circuitos | RIC N°06 |
| `ric.tablero.diferencial-sensibilidad-enchufes` | Circuitos de enchufes con diferencial ≤30 mA | RIC N°06 |
| `ric.tablero.barras-tierra-neutro-separadas` | En TT, barras de tierra y neutro separadas | RIC N°08 |
| `ric.tablero.dps-presente` | DPS donde RIC lo exige | RIC N°09 |
| `ric.tablero.calibre-vs-seccion` | Calibre del automático coherente con sección del conductor | RIC N°02 |
| `ric.tablero.identificacion-circuitos` | Cada circuito tiene rótulo/destino declarado | RIC N°04 |
| `ric.tablero.reserva-minima` | Reserva ≥20% de espacios libres | RIC N°04 |
| `ric.tablero.selectividad` | Calibres en cascada coherentes (general ≥ ramales) | RIC N°06 |

Salidas por regla: `cumple` / `no-cumple` / `pendiente-verificar`. Ningún hallazgo se silencia automáticamente; el usuario puede agregar nota o marcar "no aplica" con justificación (queda registrado).

### 6.3 Exportación

**PDF por tablero** (generación con `pdf-lib` desde el backend, usando el SVG ya renderizado):

- Hoja 1: diagrama unilineal + leyenda + simbología.
- Hoja 2: tabla de circuitos.
- Hoja 3: resumen de verificación RIC.
- Cuadro de rotulación normalizado en cada hoja.
- A4 o A3, orientación horizontal por defecto.
- Marca de agua **"BORRADOR — PENDIENTE LEVANTAMIENTO DE TERRENO"** si hay pendientes/hallazgos sin resolver (el usuario debió confirmar).

**ZIP portable del cliente:**

```
<cliente>-<fecha>.zip
├── cliente.json
├── interconexiones.json
├── tableros/
│   └── <tablero>/
│       ├── tablero.json
│       ├── fotos/
│       └── extracciones/
└── pdf/
    ├── <tablero>-unilineal.pdf
    └── general-sistema.pdf
```

**Importación:** validación Zod completa antes de fusionar al estado local. Si el ZIP rompe el schema, falla con error específico (no se intenta reparar).

---

## 7. Manejo de errores transversal

**Errores recuperables** (red, rate-limit, timeout): reintento con backoff (3 máx), spinner localizado, botón "Reintentar manualmente". El estado en disco no se sobreescribe hasta que la operación complete (patrón `write-to-tmp → rename`).

**Errores de datos** (JSON inválido, ZIP corrupto, schema fallido): se rechaza el dato completo, nunca rescate parcial. Blob crudo guardado en `extracciones/<foto>-<agente>-error.json` para auditoría. Mensaje claro al usuario.

**Errores no recuperables** (disco lleno, permisos, claves API ausentes): modal bloqueante con instrucciones específicas (qué archivo editar, qué línea agregar). La app no se cae: cae al estado anterior y el usuario sigue trabajando.

**Bitácora del backend** en `servidor/logs/YYYY-MM-DD.log`: cada request, cada llamada externa con duración y costo estimado, cada error. Rotación diaria.

---

## 8. Estrategia de testing

**Tests unitarios (Vitest):**

- Cada regla RIC con tableros sintéticos como fixture (cobertura objetivo 100%).
- Algoritmo de layout del diagrama: dado un tablero, verificar coordenadas esperadas en el SVG.
- Reconciliador: dados dos JSON, verificar lógica de consolidación.
- Validadores Zod.

**Tests de integración (Vitest + supertest):**

- Endpoints del backend con stubs de las APIs externas (interfaz `ClienteAgenteIA` permite inyectar fixtures pre-grabados).
- Flujo: subir foto → `/extract` → fusión → persistencia → leer de vuelta.
- Flujo ZIP: exportar → eliminar carpeta → importar → comparar.

**Tests E2E manuales con checklist** (`docs/superpowers/specs/checklist-pruebas-manuales.md`):

- SVG legible (sin traslapes, líneas correctas).
- PDF abre y se imprime bien en A4 y A3.
- Sesión completa: crear cliente → 3 tableros con fotos reales → interconexión → exportar.

**Fixtures de fotos reales** en `apps/servidor/tests/fixtures/fotos-reales/` con `extraccion-esperada.json`: sirven para tests de integración con stubs y como golden tests cuando cambia el prompt.

No se automatiza render visual con Playwright en MVP (costo/beneficio no se justifica).

---

## 9. Dependencias principales

**Frontend:**
- `react`, `react-dom`
- `vite`
- `typescript`
- `tailwindcss`
- `zustand` (estado)
- `zod` (validación)
- `jszip` (exportación)
- `react-zoom-pan-pinch` o equivalente ligero (zoom del diagrama)

**Backend:**
- `express`
- `typescript`, `tsx` (runtime dev)
- `@anthropic-ai/sdk`
- `openai`
- `zod`
- `pdf-lib` (generación PDF)
- `archiver` / `unzipper` (ZIP server-side)
- `pino` (logs)

**Dev:**
- `vitest`, `supertest`
- `eslint`, `prettier`

---

## 10. Riesgos identificados y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Los modelos vision leen mal etiquetas pequeñas o a contraluz | Dual-agent + procedencia explícita + pendientes manuales. La app es honesta sobre lo que no puede leer. |
| Costo de API se dispara con uso intensivo | Estimación de costo visible antes de procesar. Bitácora con costo real por sesión. |
| Cambios futuros en los modelos cambian la calidad de extracción | Golden tests con fotos fijas detectan regresiones de prompt. |
| Diagrama no cabe en A4 ni A3 | Detección automática de "no cabe" → mensaje claro al usuario para dividir en sub-diagramas. |
| RIC se actualiza (la norma cambia) | Reglas declarativas en `apps/web/src/ric/` facilitan agregar/modificar reglas sin tocar el resto. |
| Usuario edita JSON a mano y rompe la estructura | Validación Zod estricta a la entrada, sin auto-reparación, error claro. |

---

## 11. Próximo paso

Generar el plan de implementación detallado (fase de `writing-plans`), con tareas ordenadas, criterios de aceptación, y secuenciamiento.
