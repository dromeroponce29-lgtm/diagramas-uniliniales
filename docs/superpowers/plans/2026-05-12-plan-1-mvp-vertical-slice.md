# Plan 1 — MVP Vertical Slice

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Objetivo:** Conseguir un flujo end-to-end mínimo: un monorepo funcionando con frontend (Vite+React+TS+Tailwind+Zustand) y backend (Node+Express+TS) donde el usuario puede subir una foto de un tablero, el backend la procesa con Claude + OpenAI en paralelo, las consolida con un reconciliador, y el frontend muestra los componentes detectados en pantalla.

**Arquitectura:** Monorepo con workspaces npm. `apps/servidor` expone `/api/extract`. `apps/web` consume ese endpoint. Tipos TypeScript compartidos en `tipos/` (sin paquete npm). Las claves API viven solo en `.env` del backend.

**Stack:** Node 20+, TypeScript 5, Express 4, Vite 5, React 18, Tailwind 3, Zustand 4, Zod 3, Vitest 1, `@anthropic-ai/sdk`, `openai`.

**Alcance (qué NO incluye):**
- CRUD completo de clientes/tableros (Plan 2).
- Persistencia robusta (en Plan 1 solo guardamos la foto en disco y devolvemos JSON; el almacén completo es Plan 2).
- Motor de diagrama SVG (Plan 3).
- Verificación RIC (Plan 4).
- Interconexiones (Plan 5).
- Exportación PDF/ZIP (Plan 6).

---

## Estructura de archivos al terminar el Plan 1

```
diagramas-uniliniales/
├── package.json                          # workspaces, scripts dev
├── tsconfig.base.json                    # config TS compartida
├── .gitignore                            # incluye proyectos/, .env, node_modules
├── tipos/
│   └── modelo.ts                         # interfaces TS compartidas
├── apps/
│   ├── servidor/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── index.ts                  # entry point
│   │   │   ├── app.ts                    # factory de Express
│   │   │   ├── rutas/
│   │   │   │   └── extraer.ts            # POST /api/extract
│   │   │   ├── agentes/
│   │   │   │   ├── interfaz.ts           # ClienteAgenteIA
│   │   │   │   ├── claude.ts             # agente Anthropic
│   │   │   │   ├── openai.ts             # agente OpenAI
│   │   │   │   ├── reconciliador.ts      # consolida ambos JSONs
│   │   │   │   └── prompts.ts            # prompts de extracción y reconciliación
│   │   │   ├── esquemas/
│   │   │   │   └── extraccion.ts         # schemas Zod
│   │   │   └── util/
│   │   │       └── ulid.ts               # generador de IDs
│   │   └── tests/
│   │       ├── reconciliador.test.ts
│   │       └── fixtures/
│   │           ├── claude-foto-01.json
│   │           └── openai-foto-01.json
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css
│           ├── api/
│           │   └── cliente.ts            # wrapper fetch
│           └── estado/
│               └── extraccionStore.ts    # store Zustand
└── proyectos/                            # creado en runtime, gitignored
```

---

## Tarea 1 — Inicializar monorepo y configuración raíz

**Archivos:**
- Crear: `package.json` (raíz, con workspaces)
- Crear: `tsconfig.base.json`
- Modificar: `.gitignore`

- [ ] **Paso 1: Verificar versión de Node**

Ejecutar: `node --version`
Esperado: `v20.x.x` o superior. Si es menor, instalar Node 20+.

- [ ] **Paso 2: Sobrescribir `package.json` raíz**

Reemplazar el contenido actual de `/Users/mac/Projects/diagramas-uniliniales/package.json` por:

```json
{
  "name": "diagramas-uniliniales",
  "version": "0.1.0",
  "description": "Generador de diagramas unilineales eléctricos a partir de fotografías del tablero.",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev:servidor": "npm --workspace apps/servidor run dev",
    "dev:web": "npm --workspace apps/web run dev",
    "dev": "npm-run-all --parallel dev:servidor dev:web",
    "build": "npm-run-all --sequential build:servidor build:web",
    "build:servidor": "npm --workspace apps/servidor run build",
    "build:web": "npm --workspace apps/web run build",
    "test": "npm --workspace apps/servidor run test"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20"
  },
  "author": "Daniel Romero",
  "license": "ISC"
}
```

- [ ] **Paso 3: Crear `tsconfig.base.json`**

Crear `/Users/mac/Projects/diagramas-uniliniales/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@tipos/*": ["tipos/*"]
    }
  }
}
```

- [ ] **Paso 4: Actualizar `.gitignore`**

Sobrescribir `/Users/mac/Projects/diagramas-uniliniales/.gitignore`:

```
# Dependencias
node_modules/

# Build outputs
dist/
build/
.cache/

# Variables de entorno
.env
.env.local
.env.*.local

# Datos del usuario (proyectos guardados en disco)
proyectos/

# Logs
logs/
*.log
npm-debug.log*

# Sistema
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/extensions.json
.idea/

# Tests
coverage/
.nyc_output/
```

- [ ] **Paso 5: Instalar dependencias raíz**

Ejecutar: `npm install`
Esperado: descarga `npm-run-all` y `typescript`. Sin errores.

- [ ] **Paso 6: Commit**

```bash
git add package.json tsconfig.base.json .gitignore package-lock.json
git commit -m "chore: inicializa monorepo con workspaces y tsconfig base"
```

---

## Tarea 2 — Tipos compartidos del modelo

**Archivos:**
- Crear: `tipos/modelo.ts`

- [ ] **Paso 1: Crear directorio y archivo de tipos**

Crear `/Users/mac/Projects/diagramas-uniliniales/tipos/modelo.ts`:

```typescript
// Tipos compartidos entre apps/servidor y apps/web.
// Para Plan 1 se incluyen solo los tipos necesarios para el flujo de extracción
// de una foto. Los tipos completos (Cliente, Tablero, etc.) se agregarán
// en planes posteriores.

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

// Salida de un solo agente (Claude o OpenAI) tras analizar una foto.
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

// Salida del reconciliador: la verdad consolidada que ve el usuario.
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

export interface ResultadoExtraccion {
  fotoId: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentes: ComponenteReconciliado[];
  rotulacionesLeidas: RotulacionCircuito[];
  // Discrepancias y datos no leídos quedan reflejados como confianza/notas
  // en los componentes — no requieren un campo separado en Plan 1.
}
```

- [ ] **Paso 2: Commit**

```bash
git add tipos/modelo.ts
git commit -m "feat(tipos): agrega tipos compartidos del modelo"
```

---

## Tarea 3 — Scaffolding del backend (Express + TypeScript)

**Archivos:**
- Crear: `apps/servidor/package.json`
- Crear: `apps/servidor/tsconfig.json`
- Crear: `apps/servidor/.env.example`
- Crear: `apps/servidor/src/index.ts`
- Crear: `apps/servidor/src/app.ts`

- [ ] **Paso 1: Crear `apps/servidor/package.json`**

```json
{
  "name": "@diagramas/servidor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.50.0",
    "ulid": "^2.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.0",
    "@types/node": "^20.12.0",
    "@types/supertest": "^6.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Paso 2: Crear `apps/servidor/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "..",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"]
  },
  "include": [
    "src/**/*",
    "tests/**/*",
    "../../tipos/**/*"
  ]
}
```

- [ ] **Paso 3: Crear `apps/servidor/.env.example`**

```
# Copiar a .env y completar con claves reales (nunca commitear .env).
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PUERTO=3001

# Modelo de Claude a usar para extracción y reconciliación.
# claude-opus-4-7 (1M context) es el más capaz al momento del Plan 1.
CLAUDE_MODEL=claude-opus-4-7

# Modelo OpenAI para extracción.
OPENAI_MODEL=gpt-4o
```

- [ ] **Paso 4: Crear `apps/servidor/src/app.ts`**

```typescript
import express, { type Express } from 'express';
import cors from 'cors';

export function crearApp(): Express {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
```

- [ ] **Paso 5: Crear `apps/servidor/src/index.ts`**

```typescript
import 'dotenv/config';
import { crearApp } from './app.js';

const PUERTO = Number(process.env.PUERTO ?? 3001);
const app = crearApp();

app.listen(PUERTO, () => {
  console.log(`[servidor] escuchando en http://localhost:${PUERTO}`);
});
```

- [ ] **Paso 6: Instalar dependencias del workspace**

Ejecutar desde la raíz: `npm install`
Esperado: instala las dependencias del workspace `apps/servidor`. Sin errores.

- [ ] **Paso 7: Verificar que arranca**

Ejecutar: `npm run dev:servidor`
Esperado: imprime `[servidor] escuchando en http://localhost:3001`.

En otra terminal: `curl http://localhost:3001/api/salud`
Esperado: `{"estado":"ok","timestamp":"..."}`

Detener el servidor con Ctrl+C.

- [ ] **Paso 8: Commit**

```bash
git add apps/servidor/package.json apps/servidor/tsconfig.json apps/servidor/.env.example apps/servidor/src/ package-lock.json
git commit -m "feat(servidor): scaffolding Express + TypeScript + endpoint salud"
```

---

## Tarea 4 — Schemas Zod de extracción

**Archivos:**
- Crear: `apps/servidor/src/esquemas/extraccion.ts`

- [ ] **Paso 1: Crear el archivo de schemas**

`apps/servidor/src/esquemas/extraccion.ts`:

```typescript
import { z } from 'zod';

export const EsquemaTipoComponente = z.enum([
  'interruptor-automatico',
  'diferencial',
  'interruptor-general',
  'barra-fase',
  'barra-neutro',
  'barra-tierra',
  'dps',
  'contactor',
  'rele-termico',
  'medidor',
  'borne',
  'otro'
]);

export const EsquemaComponenteDetectado = z.object({
  tipoSugerido: EsquemaTipoComponente,
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  calibreA: z.number().positive().nullable(),
  polos: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
  curva: z.enum(['B', 'C', 'D', 'K']).nullable(),
  sensibilidadMA: z.number().positive().nullable(),
  posicion: z.object({
    fila: z.number().int().nonnegative(),
    columna: z.number().int().nonnegative()
  }).nullable(),
  textoLeido: z.string().nullable(),
  confianzaAgente: z.enum(['alta', 'media', 'baja']),
  notas: z.string().nullable()
});

export const EsquemaRotulacion = z.object({
  numero: z.number().int().positive().nullable(),
  textoOriginal: z.string()
});

export const EsquemaExtraccionAgente = z.object({
  calidadFoto: z.enum(['buena', 'aceptable', 'mala']),
  problemasFoto: z.array(z.string()),
  componentesDetectados: z.array(EsquemaComponenteDetectado),
  rotulacionCircuitosLeida: z.array(EsquemaRotulacion)
});

export type ExtraccionAgente = z.infer<typeof EsquemaExtraccionAgente>;
```

- [ ] **Paso 2: Verificar compilación**

Ejecutar desde la raíz: `npm --workspace apps/servidor exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/servidor/src/esquemas/extraccion.ts
git commit -m "feat(servidor): agrega schemas Zod de extracción IA"
```

---

## Tarea 5 — Interfaz `ClienteAgenteIA` y prompts

**Archivos:**
- Crear: `apps/servidor/src/agentes/interfaz.ts`
- Crear: `apps/servidor/src/agentes/prompts.ts`

- [ ] **Paso 1: Crear `interfaz.ts`**

`apps/servidor/src/agentes/interfaz.ts`:

```typescript
import type { ExtraccionAgente } from '../esquemas/extraccion.js';

// Abstracción sobre cualquier agente de visión.
// Permite inyectar stubs en tests sin pegarle a las APIs reales.
export interface ClienteAgenteIA {
  nombre: 'claude' | 'openai';
  extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente>;
}
```

- [ ] **Paso 2: Crear `prompts.ts`**

`apps/servidor/src/agentes/prompts.ts`:

```typescript
// Prompts usados por ambos agentes de extracción y por el reconciliador.
// El texto del prompt está pensado para que ambos agentes apliquen
// el principio "no asumir, no estimar".

export const PROMPT_EXTRACCION = `Analiza esta fotografía de un tablero eléctrico chileno y extrae la información de los componentes visibles.

REGLA FUNDAMENTAL: si tienes la menor duda sobre un valor, devuélvelo como null y agrega una nota en el campo "notas". Esta aplicación no debe asumir ni estimar nada — los datos faltantes se levantarán en terreno por el técnico.

Por cada componente claramente visible reporta:
- tipoSugerido: el tipo eléctrico (interruptor-automatico, diferencial, interruptor-general, barra-fase, barra-neutro, barra-tierra, dps, contactor, rele-termico, medidor, borne, otro)
- marca, modelo, calibreA, polos, curva, sensibilidadMA: solo si efectivamente puedes leerlos en la etiqueta del componente. Si no, null.
- posicion: estimación de fila/columna dentro del tablero (0-indexed). Si no es claro, null.
- textoLeido: el texto literal que ves en la etiqueta del componente (útil para auditoría humana).
- confianzaAgente: tu propia confianza ('alta' si lo lees nítido, 'media' si requiere algo de interpretación, 'baja' si dudas).
- notas: cualquier observación relevante (etiqueta parcialmente tapada, brillo, etc.).

Además reporta:
- calidadFoto: 'buena' | 'aceptable' | 'mala'.
- problemasFoto: lista breve de problemas observados (contraluz, desenfoque, ángulo, etc.).
- rotulacionCircuitosLeida: textos legibles de los rótulos del tablero (la lámina que identifica los circuitos), si aparecen en la foto.

EJEMPLO POSITIVO: Si ves un automático con etiqueta "C16" claramente, reporta calibreA: 16, curva: "C", confianzaAgente: "alta".
EJEMPLO NEGATIVO: Si ves un automático pero la etiqueta está parcialmente tapada por un cable, reporta calibreA: null, notas: "etiqueta tapada por cable".

Devuelve EXCLUSIVAMENTE un JSON válido conforme al schema indicado. Sin texto antes ni después.`;

export const PROMPT_RECONCILIACION = `Recibes dos extracciones JSON independientes de la misma foto de un tablero eléctrico (una hecha por Claude, otra por OpenAI) y la foto original. Tu tarea es producir un JSON consolidado.

REGLAS DE CONSOLIDACIÓN:
1. Si ambos agentes coinciden en un campo (mismo valor o equivalente, como "Schneider" y "Schneider Electric"): confianza='alta', fuente='foto-ambos'.
2. Si solo uno reportó valor y el otro null: confianza='media', fuente='foto-claude' o 'foto-openai' según corresponda. Agrega nota indicando el desacuerdo.
3. Si ambos reportaron valores distintos: confianza='discrepancia', en el campo notas escribe textualmente "Claude leyó X, OpenAI leyó Y". Conserva el valor de Claude como tentativo pero deja claro que requiere revisión humana.
4. Si ambos reportaron null: NO INCLUYAS ese campo en el output. No inventes valores.
5. Para identificar el mismo componente físico en ambos JSONs usa la posicion (fila/columna) y/o el tipoSugerido. Si la correspondencia no es clara, prefiere incluir ambos como componentes separados con nota "no se pudo correlacionar entre agentes".

Genera un campo id único (ULID) para cada componente del output.

Devuelve EXCLUSIVAMENTE un JSON válido conforme al schema. Sin texto antes ni después.`;
```

- [ ] **Paso 3: Commit**

```bash
git add apps/servidor/src/agentes/interfaz.ts apps/servidor/src/agentes/prompts.ts
git commit -m "feat(servidor): agrega interfaz de agente IA y prompts de extracción"
```

---

## Tarea 6 — Reconciliador (TDD)

**Archivos:**
- Crear: `apps/servidor/tests/fixtures/claude-foto-01.json`
- Crear: `apps/servidor/tests/fixtures/openai-foto-01.json`
- Crear: `apps/servidor/tests/reconciliador.test.ts`
- Crear: `apps/servidor/src/agentes/reconciliador.ts`
- Crear: `apps/servidor/src/util/ulid.ts`

**Nota sobre el reconciliador:** el diseño (sección 5.4) lo describe ejecutado por Claude con la foto + los dos JSONs. Para Plan 1 implementamos una **versión determinística sin IA** (puramente algorítmica) que cubra los casos comunes. Esto simplifica testing y reduce costos. En un plan posterior se puede agregar un paso adicional de "reconciliador IA" para casos ambiguos.

- [ ] **Paso 1: Crear util ULID**

`apps/servidor/src/util/ulid.ts`:

```typescript
import { ulid } from 'ulid';

export function nuevoId(): string {
  return ulid();
}
```

- [ ] **Paso 2: Crear fixture Claude**

`apps/servidor/tests/fixtures/claude-foto-01.json`:

```json
{
  "calidadFoto": "buena",
  "problemasFoto": [],
  "componentesDetectados": [
    {
      "tipoSugerido": "interruptor-general",
      "marca": "Schneider",
      "modelo": "C60H",
      "calibreA": 63,
      "polos": 3,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 0, "columna": 0 },
      "textoLeido": "C60H 63A",
      "confianzaAgente": "alta",
      "notas": null
    },
    {
      "tipoSugerido": "interruptor-automatico",
      "marca": "Schneider",
      "modelo": null,
      "calibreA": 16,
      "polos": 1,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 2, "columna": 0 },
      "textoLeido": "C16",
      "confianzaAgente": "alta",
      "notas": null
    },
    {
      "tipoSugerido": "interruptor-automatico",
      "marca": null,
      "modelo": null,
      "calibreA": 10,
      "polos": 1,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 2, "columna": 1 },
      "textoLeido": "C10",
      "confianzaAgente": "media",
      "notas": "etiqueta parcialmente borrosa"
    }
  ],
  "rotulacionCircuitosLeida": [
    { "numero": 1, "textoOriginal": "ILUMINACION COCINA" },
    { "numero": 2, "textoOriginal": "ENCHUFES LIVING" }
  ]
}
```

- [ ] **Paso 3: Crear fixture OpenAI**

`apps/servidor/tests/fixtures/openai-foto-01.json`:

```json
{
  "calidadFoto": "buena",
  "problemasFoto": [],
  "componentesDetectados": [
    {
      "tipoSugerido": "interruptor-general",
      "marca": "Schneider Electric",
      "modelo": "C60H",
      "calibreA": 63,
      "polos": 3,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 0, "columna": 0 },
      "textoLeido": "C60H 63A 3P",
      "confianzaAgente": "alta",
      "notas": null
    },
    {
      "tipoSugerido": "interruptor-automatico",
      "marca": null,
      "modelo": null,
      "calibreA": 16,
      "polos": 1,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 2, "columna": 0 },
      "textoLeido": "C16",
      "confianzaAgente": "alta",
      "notas": null
    },
    {
      "tipoSugerido": "interruptor-automatico",
      "marca": null,
      "modelo": null,
      "calibreA": 6,
      "polos": 1,
      "curva": "C",
      "sensibilidadMA": null,
      "posicion": { "fila": 2, "columna": 1 },
      "textoLeido": "C6",
      "confianzaAgente": "media",
      "notas": null
    }
  ],
  "rotulacionCircuitosLeida": []
}
```

- [ ] **Paso 4: Crear el test antes que la implementación**

`apps/servidor/tests/reconciliador.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconciliar } from '../src/agentes/reconciliador.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(
    readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8')
  ) as ExtraccionAgente;
}

describe('reconciliar', () => {
  const claude = cargarFixture('claude-foto-01.json');
  const openai = cargarFixture('openai-foto-01.json');
  const resultado = reconciliar({
    fotoId: 'foto-01',
    extraccionClaude: claude,
    extraccionOpenai: openai
  });

  it('preserva el fotoId', () => {
    expect(resultado.fotoId).toBe('foto-01');
  });

  it('marca componente con coincidencia exacta como alta confianza y fuente foto-ambos', () => {
    const intGen = resultado.componentes.find(c => c.tipo === 'interruptor-general');
    expect(intGen).toBeDefined();
    expect(intGen!.procedencia.confianza).toBe('alta');
    expect(intGen!.procedencia.fuente).toBe('foto-ambos');
    expect(intGen!.calibreA).toBe(63);
  });

  it('marca campo donde solo uno reportó valor como media confianza', () => {
    // Claude reportó marca "Schneider" en el automático C16, OpenAI no.
    // El componente debe quedar con confianza media y la marca tomada de Claude.
    const c16 = resultado.componentes.find(
      c => c.tipo === 'interruptor-automatico' && c.calibreA === 16
    );
    expect(c16).toBeDefined();
    expect(c16!.marca).toBe('Schneider');
    expect(c16!.procedencia.confianza).toBe('media');
  });

  it('marca discrepancia entre agentes con confianza="discrepancia" y nota explícita', () => {
    // Claude leyó 10A, OpenAI leyó 6A en el mismo componente (fila 2, columna 1).
    const componente = resultado.componentes.find(
      c => c.posicionEnTablero?.fila === 2 && c.posicionEnTablero?.columna === 1
    );
    expect(componente).toBeDefined();
    expect(componente!.procedencia.confianza).toBe('discrepancia');
    expect(componente!.procedencia.notas).toContain('Claude');
    expect(componente!.procedencia.notas).toContain('OpenAI');
  });

  it('omite campo si ambos agentes lo reportaron como null', () => {
    // sensibilidadMA es null en todos los componentes en ambos fixtures.
    const algunoConSensibilidad = resultado.componentes.find(c => c.sensibilidadMA !== undefined);
    expect(algunoConSensibilidad).toBeUndefined();
  });

  it('asigna ID único a cada componente reconciliado', () => {
    const ids = resultado.componentes.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('preserva calidadFoto y problemasFoto del JSON (toma el peor caso)', () => {
    expect(resultado.calidadFoto).toBe('buena');
    expect(resultado.problemasFoto).toEqual([]);
  });

  it('expone rotulaciones de circuitos detectadas (concatenando las de ambos agentes, sin duplicar)', () => {
    expect(resultado.rotulacionesLeidas.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Paso 5: Ejecutar test y verificar que falla**

Ejecutar: `npm --workspace apps/servidor run test`
Esperado: FAIL — `Cannot find module '../src/agentes/reconciliador.js'` o equivalente.

- [ ] **Paso 6: Implementar el reconciliador**

`apps/servidor/src/agentes/reconciliador.ts`:

```typescript
import type {
  ResultadoExtraccion,
  ComponenteReconciliado,
  RotulacionCircuito,
  CalidadFoto,
  Procedencia
} from '../../../../tipos/modelo.js';
import type { ExtraccionAgente } from '../esquemas/extraccion.js';
import { nuevoId } from '../util/ulid.js';

interface EntradaReconciliacion {
  fotoId: string;
  extraccionClaude: ExtraccionAgente;
  extraccionOpenai: ExtraccionAgente;
}

type ComponenteAgente = ExtraccionAgente['componentesDetectados'][number];

// Compara dos valores tolerando variantes equivalentes obvias (case-insensitive,
// trimming, y "Schneider" ≈ "Schneider Electric").
function valoresCoinciden(a: unknown, b: unknown): boolean {
  if (a === null || b === null) return false;
  if (typeof a === 'string' && typeof b === 'string') {
    const na = a.trim().toLowerCase();
    const nb = b.trim().toLowerCase();
    return na === nb || na.includes(nb) || nb.includes(na);
  }
  return a === b;
}

function emparejar(
  componentesClaude: ComponenteAgente[],
  componentesOpenai: ComponenteAgente[]
): Array<{ c: ComponenteAgente | null; o: ComponenteAgente | null }> {
  // Empareja por (tipo + posicion). Los que no encuentran par quedan solos.
  const pares: Array<{ c: ComponenteAgente | null; o: ComponenteAgente | null }> = [];
  const openaiUsados = new Set<number>();

  for (const c of componentesClaude) {
    const idxMatch = componentesOpenai.findIndex((o, i) => {
      if (openaiUsados.has(i)) return false;
      if (o.tipoSugerido !== c.tipoSugerido) return false;
      const posC = c.posicion;
      const posO = o.posicion;
      if (posC && posO) {
        return posC.fila === posO.fila && posC.columna === posO.columna;
      }
      return false;
    });

    if (idxMatch >= 0) {
      openaiUsados.add(idxMatch);
      pares.push({ c, o: componentesOpenai[idxMatch]! });
    } else {
      pares.push({ c, o: null });
    }
  }

  // OpenAI sin par
  componentesOpenai.forEach((o, i) => {
    if (!openaiUsados.has(i)) {
      pares.push({ c: null, o });
    }
  });

  return pares;
}

function resolverCampo<T>(
  campo: string,
  valClaude: T | null | undefined,
  valOpenai: T | null | undefined
): { valor?: T; fuente: Procedencia['fuente']; confianza: Procedencia['confianza']; nota?: string } {
  const cVacio = valClaude === null || valClaude === undefined;
  const oVacio = valOpenai === null || valOpenai === undefined;

  if (cVacio && oVacio) {
    return { fuente: 'pendiente', confianza: 'baja' };
  }
  if (!cVacio && oVacio) {
    return {
      valor: valClaude as T,
      fuente: 'foto-claude',
      confianza: 'media',
      nota: `OpenAI no reportó ${campo}`
    };
  }
  if (cVacio && !oVacio) {
    return {
      valor: valOpenai as T,
      fuente: 'foto-openai',
      confianza: 'media',
      nota: `Claude no reportó ${campo}`
    };
  }
  if (valoresCoinciden(valClaude, valOpenai)) {
    return { valor: valClaude as T, fuente: 'foto-ambos', confianza: 'alta' };
  }
  return {
    valor: valClaude as T,
    fuente: 'foto-claude',
    confianza: 'discrepancia',
    nota: `Claude leyó ${JSON.stringify(valClaude)}, OpenAI leyó ${JSON.stringify(valOpenai)}`
  };
}

function consolidarComponente(
  c: ComponenteAgente | null,
  o: ComponenteAgente | null
): ComponenteReconciliado {
  // Si solo uno aportó el componente, se incluye con confianza media.
  if (c && !o) {
    return {
      id: nuevoId(),
      tipo: c.tipoSugerido,
      ...(c.marca !== null && { marca: c.marca }),
      ...(c.modelo !== null && { modelo: c.modelo }),
      ...(c.calibreA !== null && { calibreA: c.calibreA }),
      ...(c.polos !== null && { polos: c.polos }),
      ...(c.curva !== null && { curva: c.curva }),
      ...(c.sensibilidadMA !== null && { sensibilidadMA: c.sensibilidadMA }),
      ...(c.posicion !== null && { posicionEnTablero: c.posicion }),
      procedencia: {
        fuente: 'foto-claude',
        confianza: 'media',
        notas: 'OpenAI no detectó este componente'
      }
    };
  }
  if (!c && o) {
    return {
      id: nuevoId(),
      tipo: o.tipoSugerido,
      ...(o.marca !== null && { marca: o.marca }),
      ...(o.modelo !== null && { modelo: o.modelo }),
      ...(o.calibreA !== null && { calibreA: o.calibreA }),
      ...(o.polos !== null && { polos: o.polos }),
      ...(o.curva !== null && { curva: o.curva }),
      ...(o.sensibilidadMA !== null && { sensibilidadMA: o.sensibilidadMA }),
      ...(o.posicion !== null && { posicionEnTablero: o.posicion }),
      procedencia: {
        fuente: 'foto-openai',
        confianza: 'media',
        notas: 'Claude no detectó este componente'
      }
    };
  }

  // Ambos detectaron — campo por campo.
  const cn = c!;
  const on = o!;

  const marca = resolverCampo('marca', cn.marca, on.marca);
  const modelo = resolverCampo('modelo', cn.modelo, on.modelo);
  const calibreA = resolverCampo('calibreA', cn.calibreA, on.calibreA);
  const polos = resolverCampo('polos', cn.polos, on.polos);
  const curva = resolverCampo('curva', cn.curva, on.curva);
  const sensibilidadMA = resolverCampo('sensibilidadMA', cn.sensibilidadMA, on.sensibilidadMA);

  // La procedencia agregada toma el peor caso de confianza por campo
  // (discrepancia > media > alta), y junta las notas.
  const camposResueltos = [marca, modelo, calibreA, polos, curva, sensibilidadMA];
  const rangoConfianza = ['alta', 'media', 'baja', 'discrepancia'] as const;
  const peor = camposResueltos
    .map(r => r.confianza)
    .filter(c => c !== undefined)
    .reduce<Procedencia['confianza']>((acc, val) => {
      return rangoConfianza.indexOf(val) > rangoConfianza.indexOf(acc) ? val : acc;
    }, 'alta');

  const notas = camposResueltos
    .map(r => r.nota)
    .filter((n): n is string => Boolean(n))
    .join(' · ');

  const fuenteAgregada: Procedencia['fuente'] = peor === 'alta' ? 'foto-ambos'
    : peor === 'discrepancia' ? 'foto-claude'
    : 'foto-claude';

  return {
    id: nuevoId(),
    tipo: cn.tipoSugerido,
    ...(marca.valor !== undefined && { marca: marca.valor as string }),
    ...(modelo.valor !== undefined && { modelo: modelo.valor as string }),
    ...(calibreA.valor !== undefined && { calibreA: calibreA.valor as number }),
    ...(polos.valor !== undefined && { polos: polos.valor as 1 | 2 | 3 | 4 }),
    ...(curva.valor !== undefined && { curva: curva.valor as 'B' | 'C' | 'D' | 'K' }),
    ...(sensibilidadMA.valor !== undefined && { sensibilidadMA: sensibilidadMA.valor as number }),
    ...(cn.posicion && { posicionEnTablero: cn.posicion }),
    procedencia: {
      fuente: fuenteAgregada,
      confianza: peor,
      ...(notas && { notas })
    }
  };
}

function peorCalidad(a: CalidadFoto, b: CalidadFoto): CalidadFoto {
  const orden: CalidadFoto[] = ['buena', 'aceptable', 'mala'];
  return orden.indexOf(a) > orden.indexOf(b) ? a : b;
}

function unirRotulaciones(
  a: RotulacionCircuito[],
  b: RotulacionCircuito[]
): RotulacionCircuito[] {
  const vistos = new Set<string>();
  const resultado: RotulacionCircuito[] = [];
  for (const r of [...a, ...b]) {
    const clave = `${r.numero ?? '?'}::${r.textoOriginal.trim().toLowerCase()}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      resultado.push(r);
    }
  }
  return resultado;
}

export function reconciliar(entrada: EntradaReconciliacion): ResultadoExtraccion {
  const { fotoId, extraccionClaude, extraccionOpenai } = entrada;

  const pares = emparejar(
    extraccionClaude.componentesDetectados,
    extraccionOpenai.componentesDetectados
  );

  const componentes = pares.map(({ c, o }) => consolidarComponente(c, o));

  return {
    fotoId,
    calidadFoto: peorCalidad(extraccionClaude.calidadFoto, extraccionOpenai.calidadFoto),
    problemasFoto: [
      ...new Set([...extraccionClaude.problemasFoto, ...extraccionOpenai.problemasFoto])
    ],
    componentes,
    rotulacionesLeidas: unirRotulaciones(
      extraccionClaude.rotulacionCircuitosLeida,
      extraccionOpenai.rotulacionCircuitosLeida
    )
  };
}
```

- [ ] **Paso 7: Ejecutar test y verificar que pasa**

Ejecutar: `npm --workspace apps/servidor run test`
Esperado: PASS en los 8 tests del bloque `reconciliar`.

- [ ] **Paso 8: Commit**

```bash
git add apps/servidor/tests/ apps/servidor/src/agentes/reconciliador.ts apps/servidor/src/util/ulid.ts
git commit -m "feat(servidor): implementa reconciliador determinístico con tests"
```

---

## Tarea 7 — Cliente del agente Claude

**Archivos:**
- Crear: `apps/servidor/src/agentes/claude.ts`

- [ ] **Paso 1: Crear el cliente**

`apps/servidor/src/agentes/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { EsquemaExtraccionAgente, type ExtraccionAgente } from '../esquemas/extraccion.js';
import { PROMPT_EXTRACCION } from './prompts.js';
import type { ClienteAgenteIA } from './interfaz.js';

const MODELO_DEFECTO = 'claude-opus-4-7';

export class AgenteClaude implements ClienteAgenteIA {
  readonly nombre = 'claude' as const;
  private cliente: Anthropic;
  private modelo: string;

  constructor(claveApi: string, modelo: string = MODELO_DEFECTO) {
    if (!claveApi) {
      throw new Error('ANTHROPIC_API_KEY no definida');
    }
    this.cliente = new Anthropic({ apiKey: claveApi });
    this.modelo = modelo;
  }

  async extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente> {
    const respuesta = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: fotoBase64
              }
            },
            { type: 'text', text: PROMPT_EXTRACCION }
          ]
        }
      ]
    });

    const bloqueTexto = respuesta.content.find(b => b.type === 'text');
    if (!bloqueTexto || bloqueTexto.type !== 'text') {
      throw new Error('Claude no devolvió contenido de texto');
    }

    const textoCrudo = bloqueTexto.text.trim();
    const json = extraerJSON(textoCrudo);
    return EsquemaExtraccionAgente.parse(json);
  }
}

// Algunos modelos a veces envuelven el JSON en ```json ... ``` aunque se les
// pida explícitamente que no. Esta función pela esos envoltorios si aparecen.
function extraerJSON(texto: string): unknown {
  let limpio = texto;
  if (limpio.startsWith('```')) {
    limpio = limpio.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  return JSON.parse(limpio);
}
```

- [ ] **Paso 2: Verificar compilación**

Ejecutar: `npm --workspace apps/servidor exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/servidor/src/agentes/claude.ts
git commit -m "feat(servidor): agrega cliente del agente Claude (Anthropic)"
```

---

## Tarea 8 — Cliente del agente OpenAI

**Archivos:**
- Crear: `apps/servidor/src/agentes/openai.ts`

- [ ] **Paso 1: Crear el cliente**

`apps/servidor/src/agentes/openai.ts`:

```typescript
import OpenAI from 'openai';
import { EsquemaExtraccionAgente, type ExtraccionAgente } from '../esquemas/extraccion.js';
import { PROMPT_EXTRACCION } from './prompts.js';
import type { ClienteAgenteIA } from './interfaz.js';

const MODELO_DEFECTO = 'gpt-4o';

export class AgenteOpenAI implements ClienteAgenteIA {
  readonly nombre = 'openai' as const;
  private cliente: OpenAI;
  private modelo: string;

  constructor(claveApi: string, modelo: string = MODELO_DEFECTO) {
    if (!claveApi) {
      throw new Error('OPENAI_API_KEY no definida');
    }
    this.cliente = new OpenAI({ apiKey: claveApi });
    this.modelo = modelo;
  }

  async extraer(fotoBase64: string, mimeType: string): Promise<ExtraccionAgente> {
    const respuesta = await this.cliente.chat.completions.create({
      model: this.modelo,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_EXTRACCION },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${fotoBase64}` }
            }
          ]
        }
      ]
    });

    const contenido = respuesta.choices[0]?.message?.content;
    if (!contenido) {
      throw new Error('OpenAI no devolvió contenido');
    }
    const json = JSON.parse(contenido);
    return EsquemaExtraccionAgente.parse(json);
  }
}
```

- [ ] **Paso 2: Verificar compilación**

Ejecutar: `npm --workspace apps/servidor exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/servidor/src/agentes/openai.ts
git commit -m "feat(servidor): agrega cliente del agente OpenAI"
```

---

## Tarea 9 — Endpoint `POST /api/extract` (con upload de foto)

**Archivos:**
- Crear: `apps/servidor/src/rutas/extraer.ts`
- Modificar: `apps/servidor/src/app.ts`
- Crear: `apps/servidor/tests/extraer.test.ts`

- [ ] **Paso 1: Crear test de integración con stubs**

`apps/servidor/tests/extraer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from '../src/app.js';
import type { ClienteAgenteIA } from '../src/agentes/interfaz.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8'));
}

class AgenteStub implements ClienteAgenteIA {
  constructor(
    public readonly nombre: 'claude' | 'openai',
    private respuesta: ExtraccionAgente
  ) {}
  async extraer(): Promise<ExtraccionAgente> {
    return this.respuesta;
  }
}

describe('POST /api/extract', () => {
  it('devuelve resultado reconciliado al recibir una foto', async () => {
    const claude = new AgenteStub('claude', cargarFixture('claude-foto-01.json'));
    const openai = new AgenteStub('openai', cargarFixture('openai-foto-01.json'));
    const app = crearApp({ agenteClaude: claude, agenteOpenai: openai });

    // Buffer mínimo simulando una foto JPEG válida (no se valida contenido real,
    // multer solo se preocupa del mime y el tamaño).
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    const r = await request(app)
      .post('/api/extract')
      .attach('foto', buffer, { filename: 'tablero.jpg', contentType: 'image/jpeg' });

    expect(r.status).toBe(200);
    expect(r.body.fotoId).toBeDefined();
    expect(Array.isArray(r.body.componentes)).toBe(true);
    expect(r.body.componentes.length).toBeGreaterThan(0);
    expect(r.body.componentes[0].procedencia).toBeDefined();
  });

  it('responde 400 si no hay archivo adjunto', async () => {
    const claude = new AgenteStub('claude', cargarFixture('claude-foto-01.json'));
    const openai = new AgenteStub('openai', cargarFixture('openai-foto-01.json'));
    const app = crearApp({ agenteClaude: claude, agenteOpenai: openai });
    const r = await request(app).post('/api/extract');
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Paso 2: Ejecutar test y verificar que falla**

Ejecutar: `npm --workspace apps/servidor run test`
Esperado: FAIL — `crearApp` no acepta argumento, ruta `/api/extract` no existe.

- [ ] **Paso 3: Crear la ruta**

`apps/servidor/src/rutas/extraer.ts`:

```typescript
import { type Router, Router as crearRouter } from 'express';
import multer from 'multer';
import { nuevoId } from '../util/ulid.js';
import { reconciliar } from '../agentes/reconciliador.js';
import type { ClienteAgenteIA } from '../agentes/interfaz.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

interface Deps {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearRutaExtraer(deps: Deps): Router {
  const router = crearRouter();

  router.post('/extract', upload.single('foto'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Falta el archivo "foto"' });
      return;
    }

    const fotoId = nuevoId();
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    try {
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

      // Si uno falló, se usa una extracción vacía para él (el reconciliador
      // marcará todo lo del otro agente como confianza media).
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

      const resultado = reconciliar({
        fotoId,
        extraccionClaude: claudeExtraccion,
        extraccionOpenai: openaiExtraccion
      });

      res.json(resultado);
    } catch (e) {
      res.status(500).json({ error: 'Error inesperado en extracción', detalle: String(e) });
    }
  });

  return router;
}
```

- [ ] **Paso 4: Modificar `app.ts` para inyectar agentes**

Sobrescribir `apps/servidor/src/app.ts`:

```typescript
import express, { type Express } from 'express';
import cors from 'cors';
import { crearRutaExtraer } from './rutas/extraer.js';
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

  app.use('/api', crearRutaExtraer({
    agenteClaude: deps.agenteClaude,
    agenteOpenai: deps.agenteOpenai
  }));

  return app;
}
```

- [ ] **Paso 5: Modificar `index.ts` para construir las dependencias reales**

Sobrescribir `apps/servidor/src/index.ts`:

```typescript
import 'dotenv/config';
import { crearApp } from './app.js';
import { AgenteClaude } from './agentes/claude.js';
import { AgenteOpenAI } from './agentes/openai.js';

const PUERTO = Number(process.env.PUERTO ?? 3001);

const claveAnthropic = process.env.ANTHROPIC_API_KEY ?? '';
const claveOpenai = process.env.OPENAI_API_KEY ?? '';
const modeloClaude = process.env.CLAUDE_MODEL ?? 'claude-opus-4-7';
const modeloOpenai = process.env.OPENAI_MODEL ?? 'gpt-4o';

if (!claveAnthropic || !claveOpenai) {
  console.error(
    '[servidor] Faltan claves API. Copia apps/servidor/.env.example a apps/servidor/.env y completa ANTHROPIC_API_KEY y OPENAI_API_KEY.'
  );
  process.exit(1);
}

const app = crearApp({
  agenteClaude: new AgenteClaude(claveAnthropic, modeloClaude),
  agenteOpenai: new AgenteOpenAI(claveOpenai, modeloOpenai)
});

app.listen(PUERTO, () => {
  console.log(`[servidor] escuchando en http://localhost:${PUERTO}`);
});
```

- [ ] **Paso 6: Ejecutar tests y verificar que pasan**

Ejecutar: `npm --workspace apps/servidor run test`
Esperado: PASS — ambos tests del bloque `POST /api/extract` y los 8 del reconciliador.

- [ ] **Paso 7: Commit**

```bash
git add apps/servidor/src/ apps/servidor/tests/extraer.test.ts
git commit -m "feat(servidor): expone POST /api/extract con dual-agent + reconciliación"
```

---

## Tarea 10 — Scaffolding del frontend (Vite + React + TS + Tailwind + Zustand)

**Archivos:**
- Crear: `apps/web/package.json`
- Crear: `apps/web/tsconfig.json`
- Crear: `apps/web/vite.config.ts`
- Crear: `apps/web/tailwind.config.js`
- Crear: `apps/web/postcss.config.js`
- Crear: `apps/web/index.html`
- Crear: `apps/web/src/main.tsx`
- Crear: `apps/web/src/index.css`
- Crear: `apps/web/src/App.tsx`

- [ ] **Paso 1: Crear `apps/web/package.json`**

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

- [ ] **Paso 2: Crear `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "allowImportingTsExtensions": false
  },
  "include": [
    "src/**/*",
    "../../tipos/**/*"
  ]
}
```

- [ ] **Paso 3: Crear `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tipos': path.resolve(__dirname, '../../tipos')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

- [ ] **Paso 4: Crear `apps/web/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
};
```

- [ ] **Paso 5: Crear `apps/web/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Paso 6: Crear `apps/web/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Diagramas Uniliniales</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Paso 7: Crear `apps/web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
```

- [ ] **Paso 8: Crear `apps/web/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('No se encontró #root');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Paso 9: Crear `apps/web/src/App.tsx` (placeholder mínimo)**

```typescript
export function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Diagramas Uniliniales</h1>
      <p className="text-slate-600 mt-2">Scaffolding listo. Subida de foto en la próxima tarea.</p>
    </div>
  );
}
```

- [ ] **Paso 10: Instalar y verificar que arranca**

Ejecutar desde la raíz: `npm install`
Esperado: instala dependencias de `apps/web` sin errores.

Ejecutar: `npm run dev:web`
Esperado: Vite imprime `Local: http://localhost:5173/`.

Abrir esa URL en el navegador. Esperado: ver "Diagramas Uniliniales" con tipografía system y fondo gris claro.

Detener con Ctrl+C.

- [ ] **Paso 11: Commit**

```bash
git add apps/web/ package-lock.json
git commit -m "feat(web): scaffolding Vite + React + TS + Tailwind + Zustand"
```

---

## Tarea 11 — Cliente HTTP y store Zustand del frontend

**Archivos:**
- Crear: `apps/web/src/api/cliente.ts`
- Crear: `apps/web/src/estado/extraccionStore.ts`

- [ ] **Paso 1: Crear cliente HTTP**

`apps/web/src/api/cliente.ts`:

```typescript
import type { ResultadoExtraccion } from '@tipos/modelo';

export async function extraerFoto(archivo: File): Promise<ResultadoExtraccion> {
  const formulario = new FormData();
  formulario.append('foto', archivo);

  const respuesta = await fetch('/api/extract', {
    method: 'POST',
    body: formulario
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Error ${respuesta.status}: ${texto}`);
  }

  return respuesta.json() as Promise<ResultadoExtraccion>;
}
```

- [ ] **Paso 2: Crear store Zustand**

`apps/web/src/estado/extraccionStore.ts`:

```typescript
import { create } from 'zustand';
import type { ResultadoExtraccion } from '@tipos/modelo';
import { extraerFoto } from '../api/cliente.js';

type EstadoCarga = 'inactivo' | 'procesando' | 'completado' | 'error';

interface ExtraccionStore {
  estadoCarga: EstadoCarga;
  resultado: ResultadoExtraccion | null;
  error: string | null;
  procesar(archivo: File): Promise<void>;
  reset(): void;
}

export const useExtraccionStore = create<ExtraccionStore>(set => ({
  estadoCarga: 'inactivo',
  resultado: null,
  error: null,

  async procesar(archivo) {
    set({ estadoCarga: 'procesando', error: null, resultado: null });
    try {
      const resultado = await extraerFoto(archivo);
      set({ estadoCarga: 'completado', resultado });
    } catch (e) {
      set({ estadoCarga: 'error', error: (e as Error).message });
    }
  },

  reset() {
    set({ estadoCarga: 'inactivo', resultado: null, error: null });
  }
}));
```

- [ ] **Paso 3: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/api/ apps/web/src/estado/
git commit -m "feat(web): agrega cliente HTTP y store de extracción"
```

---

## Tarea 12 — UI mínima: subir foto y mostrar componentes detectados

**Archivos:**
- Modificar: `apps/web/src/App.tsx`

- [ ] **Paso 1: Sobrescribir `App.tsx` con la UI completa**

```typescript
import { useRef } from 'react';
import { useExtraccionStore } from './estado/extraccionStore.js';

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { estadoCarga, resultado, error, procesar, reset } = useExtraccionStore();

  function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) {
      procesar(archivo);
    }
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Diagramas Uniliniales</h1>
        <p className="text-slate-600 mt-1">
          Plan 1 — MVP: subir una foto de tablero y ver los componentes detectados
          por Claude + OpenAI (reconciliados).
        </p>
      </header>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Subir foto del tablero</h2>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={alSeleccionarArchivo}
          disabled={estadoCarga === 'procesando'}
          className="block"
        />
        <div className="mt-3 text-sm text-slate-500">
          La foto se envía al backend, que llama a Claude y OpenAI en paralelo
          y consolida los resultados.
        </div>
      </section>

      {estadoCarga === 'procesando' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-900">
          Procesando foto... (puede tomar 10-20 segundos)
        </div>
      )}

      {estadoCarga === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-900">
          <strong>Error:</strong> {error}
          <button
            onClick={reset}
            className="ml-4 underline"
          >Reintentar</button>
        </div>
      )}

      {estadoCarga === 'completado' && resultado && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. Componentes detectados</h2>

          <div className="mb-4 text-sm text-slate-600">
            <span className="mr-4">
              <strong>Foto ID:</strong> {resultado.fotoId}
            </span>
            <span className="mr-4">
              <strong>Calidad:</strong> {resultado.calidadFoto}
            </span>
            <span>
              <strong>Componentes:</strong> {resultado.componentes.length}
            </span>
          </div>

          {resultado.problemasFoto.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>Problemas reportados en la foto:</strong>
              <ul className="list-disc ml-6 mt-1">
                {resultado.problemasFoto.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Marca</th>
                <th className="py-2 pr-2">Modelo</th>
                <th className="py-2 pr-2">Calibre</th>
                <th className="py-2 pr-2">Polos</th>
                <th className="py-2 pr-2">Confianza</th>
                <th className="py-2">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {resultado.componentes.map(c => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{c.tipo}</td>
                  <td className="py-2 pr-2">{c.marca ?? '—'}</td>
                  <td className="py-2 pr-2">{c.modelo ?? '—'}</td>
                  <td className="py-2 pr-2">{c.calibreA ? `${c.calibreA} A` : '—'}</td>
                  <td className="py-2 pr-2">{c.polos ?? '—'}</td>
                  <td className="py-2 pr-2">
                    <span className={claseConfianza(c.procedencia.confianza)}>
                      {c.procedencia.confianza}
                    </span>
                  </td>
                  <td className="py-2">{c.procedencia.fuente}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <button
              onClick={reset}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded"
            >Procesar otra foto</button>
          </div>
        </section>
      )}
    </div>
  );
}

function claseConfianza(c: string): string {
  switch (c) {
    case 'alta': return 'px-2 py-0.5 rounded bg-green-100 text-green-800';
    case 'media': return 'px-2 py-0.5 rounded bg-yellow-100 text-yellow-800';
    case 'baja': return 'px-2 py-0.5 rounded bg-orange-100 text-orange-800';
    case 'discrepancia': return 'px-2 py-0.5 rounded bg-red-100 text-red-800';
    default: return '';
  }
}
```

- [ ] **Paso 2: Verificar compilación**

Ejecutar: `npm --workspace apps/web exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): UI mínima para subir foto y ver componentes detectados"
```

---

## Tarea 13 — Verificación end-to-end manual con claves reales

**Pre-requisitos:**
- Tener claves API válidas de Anthropic y OpenAI.
- Tener una foto JPEG/PNG de un tablero eléctrico real para probar.

- [ ] **Paso 1: Crear archivo `.env` del backend**

Copiar el ejemplo: `cp apps/servidor/.env.example apps/servidor/.env`

Editar `apps/servidor/.env` y completar:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PUERTO=3001
CLAUDE_MODEL=claude-opus-4-7
OPENAI_MODEL=gpt-4o
```

- [ ] **Paso 2: Arrancar ambos servidores en paralelo**

Desde la raíz: `npm run dev`

Esperado:
- Línea `[servidor] escuchando en http://localhost:3001`.
- Vite imprime `Local: http://localhost:5173/`.

- [ ] **Paso 3: Probar el endpoint de salud**

En otra terminal: `curl http://localhost:3001/api/salud`
Esperado: `{"estado":"ok","timestamp":"..."}`

- [ ] **Paso 4: Subir una foto desde el navegador**

Abrir `http://localhost:5173`. Hacer clic en el selector de archivo y elegir una foto JPEG de un tablero real.

Esperado:
- Aparece "Procesando foto..." durante 10-30 segundos.
- Luego aparece la tabla con los componentes detectados.
- Cada fila tiene tipo, marca/modelo si los detectó, calibre, polos, confianza (alta/media/baja/discrepancia con color), fuente (foto-ambos / foto-claude / foto-openai).

**Si falla:** revisar la consola del backend (terminal donde corre `npm run dev:servidor`). Los errores comunes son:
- Clave API inválida → mensaje claro de Anthropic/OpenAI.
- Foto demasiado grande → multer rechaza con 413.
- Schema Zod falla porque uno de los agentes envolvió el JSON en markdown → revisar `extraerJSON` en `claude.ts`.

- [ ] **Paso 5: Probar con foto de baja calidad**

Subir una foto borrosa o a contraluz. Esperado: la tabla muestra calidad "aceptable" o "mala", y la sección "Problemas reportados en la foto" lista las razones.

- [ ] **Paso 6: Probar manejo de error de red**

Detener el backend (Ctrl+C). En el navegador, intentar subir otra foto.

Esperado: aparece el banner rojo "Error: Failed to fetch" con botón "Reintentar". La app no se cae.

Volver a arrancar el backend con `npm run dev:servidor` y hacer clic en "Reintentar" — debería funcionar nuevamente.

- [ ] **Paso 7: Documentar resultados de la prueba**

Crear `docs/superpowers/plans/2026-05-12-plan-1-resultados.md` con:

```markdown
# Plan 1 — Resultados de la verificación E2E

**Fecha:** [completar]
**Modelo Claude usado:** claude-opus-4-7
**Modelo OpenAI usado:** gpt-4o

## Fotos probadas
1. [Descripción foto 1] → [N° componentes detectados, calidad reportada, observaciones]
2. [Descripción foto 2] → ...

## Discrepancias observadas entre agentes
- [Listar las discrepancias notables — son lo que el Plan 2 tendrá que manejar bien en UI]

## Tiempos de procesamiento
- Foto 1: X segundos
- Foto 2: X segundos

## Hallazgos / ajustes necesarios para Plan 2
- ...
```

- [ ] **Paso 8: Commit final del Plan 1**

```bash
git add docs/superpowers/plans/2026-05-12-plan-1-resultados.md
git commit -m "docs: registra resultados de verificación E2E del Plan 1"
```

---

## Criterios de aceptación del Plan 1

- [x] `npm run dev` arranca frontend y backend en paralelo sin errores.
- [x] `npm test` ejecuta los tests del backend y todos pasan.
- [x] El usuario puede subir una foto y ver una tabla de componentes detectados.
- [x] Cada componente muestra su procedencia (`foto-ambos` / `foto-claude` / `foto-openai`) y su confianza.
- [x] Si los dos agentes leen valores distintos, aparece marcado como "discrepancia" en rojo.
- [x] Si un agente falla, el otro sigue funcionando y los datos quedan con confianza "media".
- [x] Si ambos fallan, el frontend muestra error claro y permite reintentar.

---

## Cosas conocidas que el Plan 1 NO resuelve (entran al Plan 2)

- No hay persistencia: la foto subida no se guarda en disco, ni el resultado.
- No hay concepto de Cliente ni Tablero en UI: solo una pantalla de "subir y ver".
- No hay manejo de hasta 20 fotos por tablero — solo una a la vez.
- No hay UI para resolver discrepancias manualmente.
- El reconciliador es algorítmico, no usa IA — el spec lo describe usando Claude. Esto se evalúa con los resultados de la verificación E2E: si el reconciliador determinístico genera muchos falsos positivos de "discrepancia", el Plan 2 puede incluir agregarle una capa IA.
