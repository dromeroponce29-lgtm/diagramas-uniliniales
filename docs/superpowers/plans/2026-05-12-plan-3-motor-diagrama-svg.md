# Plan 3 — Motor de diagrama unilineal SVG

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development o superpowers:executing-plans.

**Objetivo:** A partir del Plan 2 (workspace funcional con persistencia y componentes detectados), construir el motor de diagrama unilineal SVG que reemplaza el placeholder del panel derecho. El diagrama se dibuja en vivo desde el estado del `Tablero`, usa símbolos IEC 60617, tiene layout determinístico columnar, soporta zoom y pan, resalta componentes con pendientes/discrepancias, y se ajusta automáticamente al ancho del panel.

**Arquitectura:** Módulo `apps/web/src/diagrama/` con tres capas separadas: (1) **biblioteca de símbolos** (componentes React que renderizan SVG vectorial por tipo), (2) **algoritmo de layout** (función pura `Tablero → LayoutDiagrama` con coordenadas y enlaces), (3) **componente de render** (`DiagramaSVG`) que combina layout + símbolos + viewport con zoom/pan. Tests sobre el algoritmo de layout (función pura) con Vitest en el workspace web.

**Stack adicional:** `react-zoom-pan-pinch` (~7 KB gzip, ligero) para zoom/pan; `vitest` + `@testing-library/react` para los tests del frontend.

**Alcance (qué NO incluye):**
- Exportación PDF / A3 / A4 (Plan 6).
- Cuadro de rotulación completo con todos los campos formales — solo un encabezado simple en SVG.
- Verificación RIC visual sobre el diagrama (Plan 4 — los hallazgos sí afectarán el resaltado, pero el cálculo viene en Plan 4).
- Diagrama del sistema completo multi-tablero (Plan 5).
- Edición de componentes desde el diagrama (clic → editar). En este plan, el diagrama es solo visualización + highlight.

---

## Estructura nueva de archivos

```
apps/web/
├── package.json                            # MODIFICADO — agrega vitest, RTL, react-zoom-pan-pinch
├── vitest.config.ts                        # NUEVO
└── src/
    └── diagrama/                           # NUEVO MÓDULO
        ├── tipos.ts                        # NodoLayout, EnlaceLayout, LayoutDiagrama
        ├── simbolos/
        │   ├── InterruptorAutomatico.tsx
        │   ├── Diferencial.tsx
        │   ├── InterruptorGeneral.tsx
        │   ├── Barra.tsx
        │   ├── DPS.tsx
        │   ├── Tierra.tsx
        │   ├── Medidor.tsx
        │   ├── Generico.tsx                # fallback para tipos no mapeados
        │   └── index.tsx                   # registro / SimboloPorTipo
        ├── layout/
        │   ├── calcular.ts                 # función pura
        │   └── tamanoPagina.ts             # A4 vs A3 sugerido
        ├── CuadroRotulacion.tsx
        └── DiagramaSVG.tsx                 # componente principal exportado
apps/web/tests/
├── layout.test.ts                          # NUEVO — tests del algoritmo
└── tamano-pagina.test.ts                   # NUEVO
```

---

## Tarea 1 — Instalar dependencias y configurar Vitest en `apps/web`

**Archivos:**
- Modificar: `apps/web/package.json`
- Crear: `apps/web/vitest.config.ts`

- [ ] **Paso 1: Modificar `apps/web/package.json`**

Agregar al `scripts` y `devDependencies`:

```json
{
  "name": "@diagramas/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "react-zoom-pan-pinch": "^3.6.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Paso 2: Crear `apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tipos': path.resolve(__dirname, '../../tipos')
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  }
});
```

- [ ] **Paso 3: Actualizar script `test` raíz para incluir web**

Modificar `package.json` raíz, sección `scripts`:

```json
"test": "npm-run-all --sequential test:servidor test:web",
"test:servidor": "npm --workspace apps/servidor run test",
"test:web": "npm --workspace apps/web run test"
```

- [ ] **Paso 4: Instalar y verificar**

Desde la raíz: `npm install` → sin errores.

`npm test` → debe ejecutar los 49 tests del servidor + 0 del web (porque aún no hay tests). Vitest reporta "no test files found" para web sin fallar.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts package.json package-lock.json
git commit -m "feat(web): instala vitest, RTL, react-zoom-pan-pinch para módulo diagrama"
```

---

## Tarea 2 — Tipos del módulo diagrama

**Archivos:**
- Crear: `apps/web/src/diagrama/tipos.ts`

- [ ] **Paso 1: Crear `tipos.ts`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

// Un nodo en el layout: un componente físico con posición calculada.
export interface NodoLayout {
  id: string;
  componente: ComponenteReconciliado;
  x: number;                            // mm desde origen
  y: number;                            // mm desde origen
  ancho: number;                        // mm (bbox del símbolo)
  alto: number;                         // mm
  capa: CapaDiagrama;
}

// Capas verticales del unilineal — orden fijo de arriba a abajo.
export type CapaDiagrama =
  | 'acometida'             // flecha de entrada
  | 'medidor'
  | 'principal'             // int.general / diferencial principal
  | 'barra'
  | 'rama'                  // automáticos, diferenciales por circuito
  | 'salida'                // etiqueta de destino del circuito
  | 'lateral-izq'           // dps, transformadores de medida
  | 'lateral-der'           // tierra, neutro
;

// Un enlace dibujado como línea entre dos nodos.
export interface EnlaceLayout {
  desde: { x: number; y: number };
  hasta: { x: number; y: number };
  tipo: 'principal' | 'rama' | 'tierra';   // afecta el estilo
}

export interface LayoutDiagrama {
  ancho: number;                        // mm — ancho total ocupado
  alto: number;                         // mm
  nodos: NodoLayout[];
  enlaces: EnlaceLayout[];
}

// Geometría de los símbolos (bbox por tipo) — el algoritmo de layout no
// necesita el SVG, solo las dimensiones.
export const ANCHO_SIMBOLO_MM = 12;
export const ALTO_SIMBOLO_MM = 16;
export const ESPACIO_HORIZONTAL_MM = 18;
export const ESPACIO_VERTICAL_MM = 20;
```

- [ ] **Paso 2: Verificar compilación**

`npm --workspace apps/web exec tsc -- --noEmit` → sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/diagrama/tipos.ts
git commit -m "feat(web): tipos del módulo de diagrama (NodoLayout, EnlaceLayout)"
```

---

## Tarea 3 — Algoritmo de layout (TDD)

**Archivos:**
- Crear: `apps/web/tests/layout.test.ts`
- Crear: `apps/web/src/diagrama/layout/calcular.ts`

- [ ] **Paso 1: Crear tests primero**

`apps/web/tests/layout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calcularLayout } from '../src/diagrama/layout/calcular.js';
import type { Tablero, ComponenteReconciliado } from '@tipos/modelo';

function tableroBase(): Tablero {
  return {
    id: 't1', slug: 't1', clienteId: 'c1',
    codigo: 'TG', nombre: 'TG', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    porcentajeCompletitud: 0,
    creadoEn: '', actualizadoEn: ''
  };
}

function comp(id: string, tipo: ComponenteReconciliado['tipo'], extras: Partial<ComponenteReconciliado> = {}): ComponenteReconciliado {
  return {
    id, tipo,
    procedencia: { fuente: 'foto-ambos', confianza: 'alta' },
    ...extras
  };
}

describe('calcularLayout', () => {
  it('un tablero vacío produce layout vacío con dimensiones >= 0', () => {
    const l = calcularLayout(tableroBase());
    expect(l.nodos).toEqual([]);
    expect(l.enlaces).toEqual([]);
    expect(l.ancho).toBeGreaterThanOrEqual(0);
    expect(l.alto).toBeGreaterThanOrEqual(0);
  });

  it('clasifica un interruptor general en la capa principal', () => {
    const t = tableroBase();
    t.componentes = [comp('1', 'interruptor-general', { calibreA: 63 })];
    const l = calcularLayout(t);
    expect(l.nodos).toHaveLength(1);
    expect(l.nodos[0]!.capa).toBe('principal');
  });

  it('clasifica automáticos en la capa rama, uno por columna', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-automatico', { calibreA: 16 }),
      comp('2', 'interruptor-automatico', { calibreA: 10 }),
      comp('3', 'interruptor-automatico', { calibreA: 25 })
    ];
    const l = calcularLayout(t);
    expect(l.nodos.filter(n => n.capa === 'rama')).toHaveLength(3);
    // Cada uno en una columna distinta (x distintos)
    const xs = l.nodos.filter(n => n.capa === 'rama').map(n => n.x);
    expect(new Set(xs).size).toBe(3);
  });

  it('apila componentes principales verticalmente (mismo x, distinto y)', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-general', { calibreA: 63 }),
      comp('2', 'diferencial', { calibreA: 63, sensibilidadMA: 30 })
    ];
    const l = calcularLayout(t);
    const principales = l.nodos.filter(n => n.capa === 'principal');
    expect(principales).toHaveLength(2);
    expect(principales[0]!.x).toBe(principales[1]!.x);
    expect(principales[0]!.y).not.toBe(principales[1]!.y);
  });

  it('DPS se coloca en la capa lateral-izq', () => {
    const t = tableroBase();
    t.componentes = [comp('1', 'dps')];
    const l = calcularLayout(t);
    expect(l.nodos[0]!.capa).toBe('lateral-izq');
  });

  it('barra-tierra y barra-neutro van a lateral-der', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'barra-tierra'),
      comp('2', 'barra-neutro')
    ];
    const l = calcularLayout(t);
    expect(l.nodos.every(n => n.capa === 'lateral-der')).toBe(true);
  });

  it('genera enlaces desde principal a barra y desde barra a cada rama', () => {
    const t = tableroBase();
    t.componentes = [
      comp('1', 'interruptor-general', { calibreA: 63 }),
      comp('2', 'interruptor-automatico', { calibreA: 16 }),
      comp('3', 'interruptor-automatico', { calibreA: 10 })
    ];
    const l = calcularLayout(t);
    // Debe haber al menos: principal→barra (1) + barra→cada rama (2) = 3 enlaces
    expect(l.enlaces.length).toBeGreaterThanOrEqual(3);
  });

  it('el ancho total crece con el número de ramas', () => {
    const t1 = tableroBase();
    t1.componentes = [comp('1', 'interruptor-automatico', { calibreA: 16 })];
    const t2 = tableroBase();
    t2.componentes = [
      comp('1', 'interruptor-automatico', { calibreA: 16 }),
      comp('2', 'interruptor-automatico', { calibreA: 10 }),
      comp('3', 'interruptor-automatico', { calibreA: 25 }),
      comp('4', 'interruptor-automatico', { calibreA: 16 }),
      comp('5', 'interruptor-automatico', { calibreA: 10 })
    ];
    expect(calcularLayout(t2).ancho).toBeGreaterThan(calcularLayout(t1).ancho);
  });

  it('el orden de las ramas es estable (por id, no aleatorio)', () => {
    const t = tableroBase();
    t.componentes = [
      comp('zzz', 'interruptor-automatico', { calibreA: 16 }),
      comp('aaa', 'interruptor-automatico', { calibreA: 10 }),
      comp('mmm', 'interruptor-automatico', { calibreA: 25 })
    ];
    const l1 = calcularLayout(t);
    const l2 = calcularLayout(t);
    expect(l1.nodos.map(n => n.id)).toEqual(l2.nodos.map(n => n.id));
  });
});
```

- [ ] **Paso 2: Ejecutar tests — deben fallar**

`npm --workspace apps/web run test` → FAIL (módulo `calcular.js` no existe).

- [ ] **Paso 3: Implementar `calcular.ts`**

`apps/web/src/diagrama/layout/calcular.ts`:

```typescript
import type { Tablero, ComponenteReconciliado, TipoComponente } from '@tipos/modelo';
import type { LayoutDiagrama, NodoLayout, EnlaceLayout, CapaDiagrama } from '../tipos.js';
import { ANCHO_SIMBOLO_MM, ALTO_SIMBOLO_MM, ESPACIO_HORIZONTAL_MM, ESPACIO_VERTICAL_MM } from '../tipos.js';

const CAPA_POR_TIPO: Record<TipoComponente, CapaDiagrama> = {
  'medidor': 'medidor',
  'interruptor-general': 'principal',
  'diferencial': 'principal',
  'interruptor-automatico': 'rama',
  'contactor': 'rama',
  'rele-termico': 'rama',
  'dps': 'lateral-izq',
  'barra-fase': 'barra',
  'barra-neutro': 'lateral-der',
  'barra-tierra': 'lateral-der',
  'borne': 'rama',
  'otro': 'rama'
};

// Orden vertical de las capas (mm desde top).
const Y_POR_CAPA: Record<CapaDiagrama, number> = {
  'acometida': 0,
  'medidor': 20,
  'principal': 50,
  'barra': 90,
  'rama': 110,
  'salida': 140,
  'lateral-izq': 50,
  'lateral-der': 90
};

// Compara dos componentes para orden estable.
function ordenar(a: ComponenteReconciliado, b: ComponenteReconciliado): number {
  return a.id.localeCompare(b.id);
}

export function calcularLayout(tablero: Tablero): LayoutDiagrama {
  if (tablero.componentes.length === 0) {
    return { nodos: [], enlaces: [], ancho: 0, alto: 0 };
  }

  // 1. Clasificar por capa.
  const porCapa = new Map<CapaDiagrama, ComponenteReconciliado[]>();
  for (const c of tablero.componentes) {
    const capa = CAPA_POR_TIPO[c.tipo] ?? 'rama';
    if (!porCapa.has(capa)) porCapa.set(capa, []);
    porCapa.get(capa)!.push(c);
  }
  // Orden estable por id dentro de cada capa.
  for (const lista of porCapa.values()) lista.sort(ordenar);

  // 2. Determinar centro horizontal del diagrama.
  const numRamas = (porCapa.get('rama') ?? []).length;
  const anchoRamas = Math.max(1, numRamas) * (ANCHO_SIMBOLO_MM + ESPACIO_HORIZONTAL_MM);
  const margenLateral = 40;                    // mm para componentes laterales
  const xCentro = margenLateral + anchoRamas / 2;

  const nodos: NodoLayout[] = [];

  // 3. Posicionar componentes principales (apilados en el centro).
  let yPrincipalActual = Y_POR_CAPA['principal'];
  for (const c of porCapa.get('principal') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: xCentro - ANCHO_SIMBOLO_MM / 2,
      y: yPrincipalActual,
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'principal'
    });
    yPrincipalActual += ESPACIO_VERTICAL_MM;
  }

  // 4. Posicionar medidor (si hay).
  for (const c of porCapa.get('medidor') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: xCentro - ANCHO_SIMBOLO_MM / 2,
      y: Y_POR_CAPA['medidor'],
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'medidor'
    });
  }

  // 5. Posicionar barra (línea horizontal larga).
  const yBarra = Y_POR_CAPA['barra'];
  const xInicioBarra = margenLateral;
  const xFinBarra = margenLateral + anchoRamas;
  for (const c of porCapa.get('barra') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: xInicioBarra,
      y: yBarra,
      ancho: xFinBarra - xInicioBarra,
      alto: 2,
      capa: 'barra'
    });
  }
  // Si no hay barra explícita pero sí ramas, generar una barra implícita
  // (representada como un nodo virtual sin componente — para el render).
  // En este Plan se omite y solo se conecta principal → cada rama directamente
  // si no hay barra. El nodo virtual lo agregamos en Plan 4 si hace falta.

  // 6. Posicionar ramas (columnas).
  const ramas = porCapa.get('rama') ?? [];
  ramas.forEach((c, i) => {
    nodos.push({
      id: c.id, componente: c,
      x: margenLateral + i * (ANCHO_SIMBOLO_MM + ESPACIO_HORIZONTAL_MM),
      y: Y_POR_CAPA['rama'],
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'rama'
    });
  });

  // 7. Posicionar componentes laterales.
  let yLatIzq = Y_POR_CAPA['lateral-izq'];
  for (const c of porCapa.get('lateral-izq') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: 0,
      y: yLatIzq,
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'lateral-izq'
    });
    yLatIzq += ESPACIO_VERTICAL_MM;
  }

  let yLatDer = Y_POR_CAPA['lateral-der'];
  const xLatDer = xFinBarra + ESPACIO_HORIZONTAL_MM;
  for (const c of porCapa.get('lateral-der') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: xLatDer,
      y: yLatDer,
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'lateral-der'
    });
    yLatDer += ESPACIO_VERTICAL_MM;
  }

  // 8. Generar enlaces.
  const enlaces: EnlaceLayout[] = [];
  const principales = nodos.filter(n => n.capa === 'principal');
  const ramasN = nodos.filter(n => n.capa === 'rama');

  // Línea vertical entre componentes principales consecutivos.
  for (let i = 0; i < principales.length - 1; i++) {
    const a = principales[i]!;
    const b = principales[i + 1]!;
    enlaces.push({
      desde: { x: a.x + a.ancho / 2, y: a.y + a.alto },
      hasta: { x: b.x + b.ancho / 2, y: b.y },
      tipo: 'principal'
    });
  }

  // Del último principal hacia la barra (o directo a las ramas si no hay barra).
  const ultimoPrincipal = principales[principales.length - 1];
  if (ultimoPrincipal) {
    enlaces.push({
      desde: { x: ultimoPrincipal.x + ultimoPrincipal.ancho / 2, y: ultimoPrincipal.y + ultimoPrincipal.alto },
      hasta: { x: ultimoPrincipal.x + ultimoPrincipal.ancho / 2, y: yBarra },
      tipo: 'principal'
    });
  }

  // De la barra a cada rama.
  for (const rama of ramasN) {
    enlaces.push({
      desde: { x: rama.x + rama.ancho / 2, y: yBarra },
      hasta: { x: rama.x + rama.ancho / 2, y: rama.y },
      tipo: 'rama'
    });
  }

  // 9. Calcular ancho y alto totales.
  const xMin = Math.min(...nodos.map(n => n.x), 0);
  const xMax = Math.max(...nodos.map(n => n.x + n.ancho));
  const yMax = Math.max(...nodos.map(n => n.y + n.alto));

  return {
    nodos,
    enlaces,
    ancho: xMax - xMin + margenLateral,
    alto: yMax + 20
  };
}
```

- [ ] **Paso 4: Ejecutar tests**

`npm --workspace apps/web run test` → 9/9 pasan.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/tests/layout.test.ts apps/web/src/diagrama/layout/calcular.ts
git commit -m "feat(web): algoritmo de layout determinístico con tests (9 casos)"
```

---

## Tarea 4 — Decisión de tamaño de página A4 vs A3 (TDD)

**Archivos:**
- Crear: `apps/web/tests/tamano-pagina.test.ts`
- Crear: `apps/web/src/diagrama/layout/tamanoPagina.ts`

- [ ] **Paso 1: Tests**

`apps/web/tests/tamano-pagina.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sugerirTamanoPagina } from '../src/diagrama/layout/tamanoPagina.js';

describe('sugerirTamanoPagina', () => {
  it('sugiere A4 cuando hay pocos circuitos (≤12 ramas)', () => {
    expect(sugerirTamanoPagina(0)).toBe('A4');
    expect(sugerirTamanoPagina(8)).toBe('A4');
    expect(sugerirTamanoPagina(12)).toBe('A4');
  });

  it('sugiere A3 cuando hay 13 o más ramas', () => {
    expect(sugerirTamanoPagina(13)).toBe('A3');
    expect(sugerirTamanoPagina(20)).toBe('A3');
  });
});
```

- [ ] **Paso 2: Implementar**

`apps/web/src/diagrama/layout/tamanoPagina.ts`:

```typescript
export type TamanoPagina = 'A4' | 'A3';

// Regla práctica: hasta 12 ramas caben cómodas en A4 horizontal.
// A partir de 13, se sugiere A3.
export function sugerirTamanoPagina(numRamas: number): TamanoPagina {
  return numRamas > 12 ? 'A3' : 'A4';
}

export const DIMENSIONES_MM: Record<TamanoPagina, { ancho: number; alto: number }> = {
  // Orientación horizontal (apaisado).
  A4: { ancho: 297, alto: 210 },
  A3: { ancho: 420, alto: 297 }
};
```

- [ ] **Paso 3: Test pasa, commit**

`npm --workspace apps/web run test` → 11/11 pasan.

```bash
git add apps/web/tests/tamano-pagina.test.ts apps/web/src/diagrama/layout/tamanoPagina.ts
git commit -m "feat(web): sugerencia A4/A3 según número de ramas"
```

---

## Tarea 5 — Símbolos IEC 60617 (lote 1)

**Archivos:**
- Crear: `apps/web/src/diagrama/simbolos/InterruptorAutomatico.tsx`
- Crear: `apps/web/src/diagrama/simbolos/Diferencial.tsx`
- Crear: `apps/web/src/diagrama/simbolos/InterruptorGeneral.tsx`

Los símbolos son SVG vectoriales puros, dimensionados a la bbox de 12×16 mm (`ANCHO_SIMBOLO_MM × ALTO_SIMBOLO_MM`). Cada uno recibe `{ x, y, calibreA?, polos? }` y renderiza dentro de un `<g transform="translate(x,y)">`.

- [ ] **Paso 1: `InterruptorAutomatico.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  x: number;
  y: number;
  componente: ComponenteReconciliado;
}

// Símbolo IEC 60617 del interruptor magnetotérmico: rectángulo con barra
// inclinada interna. Etiqueta con calibre y polos a un lado.
export function InterruptorAutomatico({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-automatico">
      <rect x="3" y="0" width="6" height="12" fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="0" x2="6" y2="2" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="2" x2="9" y2="6" stroke="black" strokeWidth="0.5" />
      <line x1="6" y1="10" x2="6" y2="12" stroke="black" strokeWidth="0.5" />
      <text x="12" y="6" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
```

- [ ] **Paso 2: `Diferencial.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// Símbolo IEC del diferencial residual: rectángulo con doble línea diagonal
// y marca de sensibilidad (Δ).
export function Diferencial({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-diferencial">
      <rect x="2" y="0" width="8" height="12" fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="2" y1="3" x2="10" y2="3" stroke="black" strokeWidth="0.5" />
      <text x="3" y="5.5" fontSize="2" fontFamily="sans-serif">Δ</text>
      <text x="6" y="9" fontSize="2" fontFamily="sans-serif" textAnchor="middle">
        {componente.sensibilidadMA ? `${componente.sensibilidadMA}mA` : '?'}
      </text>
      <text x="12" y="6" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
```

- [ ] **Paso 3: `InterruptorGeneral.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// El interruptor general es visualmente igual a un automático pero más grande
// y con etiqueta "IG".
export function InterruptorGeneral({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-int-general">
      <rect x="2" y="0" width="8" height="14" fill="white" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="0" x2="6" y2="3" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="3" x2="10" y2="8" stroke="black" strokeWidth="0.7" />
      <line x1="6" y1="11" x2="6" y2="14" stroke="black" strokeWidth="0.7" />
      <text x="3" y="13" fontSize="2" fontFamily="sans-serif" fontWeight="bold">IG</text>
      <text x="12" y="7" fontSize="2.5" fontFamily="sans-serif" dominantBaseline="middle">
        {componente.calibreA ? `${componente.calibreA}A` : '?'}
        {componente.polos ? ` ${componente.polos}P` : ''}
      </text>
    </g>
  );
}
```

- [ ] **Paso 4: Verificar compilación**

`npm --workspace apps/web exec tsc -- --noEmit` → sin errores.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/diagrama/simbolos/InterruptorAutomatico.tsx apps/web/src/diagrama/simbolos/Diferencial.tsx apps/web/src/diagrama/simbolos/InterruptorGeneral.tsx
git commit -m "feat(web): símbolos IEC 60617 — interruptor automático, diferencial, general"
```

---

## Tarea 6 — Símbolos IEC 60617 (lote 2)

**Archivos:**
- Crear: `Barra.tsx`, `DPS.tsx`, `Tierra.tsx`, `Medidor.tsx`, `Generico.tsx`

- [ ] **Paso 1: `Barra.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; ancho: number; componente: ComponenteReconciliado; }

export function Barra({ x, y, ancho, componente }: Props) {
  const color = componente.tipo === 'barra-tierra' ? '#10b981'
    : componente.tipo === 'barra-neutro' ? '#3b82f6'
    : 'black';
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-barra">
      <line x1="0" y1="0" x2={ancho} y2="0" stroke={color} strokeWidth="1.5" />
    </g>
  );
}
```

- [ ] **Paso 2: `DPS.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// DPS: rectángulo con flecha apuntando hacia abajo (descarga a tierra).
export function DPS({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-dps">
      <rect x="2" y="0" width="8" height="10" fill="white" stroke="black" strokeWidth="0.5" />
      <text x="6" y="6" fontSize="2.5" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">DPS</text>
      <line x1="6" y1="10" x2="6" y2="14" stroke="black" strokeWidth="0.5" />
      <polygon points="4,14 8,14 6,16" fill="black" />
    </g>
  );
}
```

- [ ] **Paso 3: `Tierra.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// Símbolo estándar de tierra: tres líneas horizontales decrecientes.
export function Tierra({ x, y }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-tierra">
      <line x1="6" y1="0" x2="6" y2="6" stroke="black" strokeWidth="0.5" />
      <line x1="2" y1="6" x2="10" y2="6" stroke="black" strokeWidth="0.8" />
      <line x1="3.5" y1="8.5" x2="8.5" y2="8.5" stroke="black" strokeWidth="0.5" />
      <line x1="5" y1="11" x2="7" y2="11" stroke="black" strokeWidth="0.5" />
    </g>
  );
}
```

- [ ] **Paso 4: `Medidor.tsx`**

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

// Medidor: círculo con "kWh".
export function Medidor({ x, y }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-medidor">
      <circle cx="6" cy="6" r="6" fill="white" stroke="black" strokeWidth="0.5" />
      <text x="6" y="7" fontSize="2.5" fontFamily="sans-serif" textAnchor="middle">kWh</text>
    </g>
  );
}
```

- [ ] **Paso 5: `Generico.tsx`** (fallback para tipos no mapeados)

```typescript
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props { x: number; y: number; componente: ComponenteReconciliado; }

export function Generico({ x, y, componente }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-generico">
      <rect x="2" y="0" width="8" height="12" fill="white" stroke="black" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="6" y="7" fontSize="2" fontFamily="sans-serif" textAnchor="middle">{componente.tipo.substring(0, 4)}</text>
    </g>
  );
}
```

- [ ] **Paso 6: Commit**

```bash
git add apps/web/src/diagrama/simbolos/Barra.tsx apps/web/src/diagrama/simbolos/DPS.tsx apps/web/src/diagrama/simbolos/Tierra.tsx apps/web/src/diagrama/simbolos/Medidor.tsx apps/web/src/diagrama/simbolos/Generico.tsx
git commit -m "feat(web): símbolos IEC 60617 — barra, DPS, tierra, medidor, genérico"
```

---

## Tarea 7 — Registro central de símbolos

**Archivos:**
- Crear: `apps/web/src/diagrama/simbolos/index.tsx`

- [ ] **Paso 1: Crear el registro**

```typescript
import type { TipoComponente, ComponenteReconciliado } from '@tipos/modelo';
import { InterruptorAutomatico } from './InterruptorAutomatico.js';
import { Diferencial } from './Diferencial.js';
import { InterruptorGeneral } from './InterruptorGeneral.js';
import { Barra } from './Barra.js';
import { DPS } from './DPS.js';
import { Tierra } from './Tierra.js';
import { Medidor } from './Medidor.js';
import { Generico } from './Generico.js';

interface PropsSimbolo {
  x: number;
  y: number;
  ancho?: number;        // solo usado por la barra
  componente: ComponenteReconciliado;
}

export function SimboloIEC({ x, y, ancho, componente }: PropsSimbolo) {
  const tipo: TipoComponente = componente.tipo;
  switch (tipo) {
    case 'interruptor-general':  return <InterruptorGeneral x={x} y={y} componente={componente} />;
    case 'diferencial':          return <Diferencial x={x} y={y} componente={componente} />;
    case 'interruptor-automatico': return <InterruptorAutomatico x={x} y={y} componente={componente} />;
    case 'barra-fase':           return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'barra-neutro':         return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'barra-tierra':         return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'dps':                  return <DPS x={x} y={y} componente={componente} />;
    case 'medidor':              return <Medidor x={x} y={y} componente={componente} />;
    case 'contactor':
    case 'rele-termico':
    case 'borne':
    case 'otro':
    default:                     return <Generico x={x} y={y} componente={componente} />;
  }
}

// Exporta también la Tierra como símbolo independiente (no es componente del
// tablero pero se puede dibujar al lado del DPS o de la barra-tierra).
export { Tierra };
```

- [ ] **Paso 2: Verificar compilación, commit**

```bash
npm --workspace apps/web exec tsc -- --noEmit
git add apps/web/src/diagrama/simbolos/index.tsx
git commit -m "feat(web): registro central de símbolos (SimboloIEC switch por tipo)"
```

---

## Tarea 8 — Cuadro de rotulación simple

**Archivos:**
- Crear: `apps/web/src/diagrama/CuadroRotulacion.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

// Cuadro de rotulación simplificado en SVG. El cuadro completo con sello
// del ejecutor, número de proyecto SEC, revisiones etc. se construye en Plan 6
// cuando se exporte el PDF.
export function CuadroRotulacion({ tablero, nombreCliente, x, y, ancho, alto }: Props) {
  const fecha = new Date(tablero.actualizadoEn).toLocaleDateString('es-CL');
  return (
    <g transform={`translate(${x},${y})`} className="cuadro-rotulacion">
      <rect width={ancho} height={alto} fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="0" y1={alto / 3} x2={ancho} y2={alto / 3} stroke="black" strokeWidth="0.3" />
      <line x1="0" y1={2 * alto / 3} x2={ancho} y2={2 * alto / 3} stroke="black" strokeWidth="0.3" />
      <text x="2" y="4" fontSize="2.5" fontFamily="sans-serif" fontWeight="bold">DIAGRAMA UNILINEAL</text>
      <text x="2" y={alto / 3 + 4} fontSize="2.2" fontFamily="sans-serif">
        {nombreCliente ?? 'Cliente'} — {tablero.codigo}
      </text>
      <text x="2" y={2 * alto / 3 + 4} fontSize="2" fontFamily="sans-serif">
        {tablero.tensionSistema} · {tablero.esquemaTierra}
      </text>
      <text x="2" y={alto - 1.5} fontSize="1.8" fontFamily="sans-serif" fill="#666">
        Actualizado: {fecha}
      </text>
    </g>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/src/diagrama/CuadroRotulacion.tsx
git commit -m "feat(web): cuadro de rotulación simple para el diagrama"
```

---

## Tarea 9 — Componente principal `DiagramaSVG` con resaltado de estado

**Archivos:**
- Crear: `apps/web/src/diagrama/DiagramaSVG.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
import { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Tablero } from '@tipos/modelo';
import { calcularLayout } from './layout/calcular.js';
import { sugerirTamanoPagina, DIMENSIONES_MM } from './layout/tamanoPagina.js';
import { SimboloIEC } from './simbolos/index.js';
import { CuadroRotulacion } from './CuadroRotulacion.js';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  // Cuando el usuario hace clic en un componente del diagrama, se notifica al
  // exterior con el id — el panel central puede hacer scroll/highlight.
  onClicComponente?(id: string): void;
}

export function DiagramaSVG({ tablero, nombreCliente, onClicComponente }: Props) {
  const layout = useMemo(() => calcularLayout(tablero), [tablero]);

  const numRamas = layout.nodos.filter(n => n.capa === 'rama').length;
  const tamano = sugerirTamanoPagina(numRamas);
  const pagina = DIMENSIONES_MM[tamano];

  // Cuadro de rotulación: esquina inferior derecha.
  const cuadroAncho = 80;
  const cuadroAlto = 25;
  const cuadroX = pagina.ancho - cuadroAncho - 5;
  const cuadroY = pagina.alto - cuadroAlto - 5;

  return (
    <div className="relative w-full h-full bg-slate-100 rounded overflow-hidden">
      <div className="absolute top-2 left-2 z-10 bg-white px-2 py-1 rounded text-xs shadow">
        Tamaño sugerido: <strong>{tamano}</strong> · {numRamas} rama{numRamas === 1 ? '' : 's'}
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <svg
            viewBox={`0 0 ${pagina.ancho} ${pagina.alto}`}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-white"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Marco de la página */}
            <rect x="0" y="0" width={pagina.ancho} height={pagina.alto} fill="white" stroke="#cbd5e1" strokeWidth="0.3" />

            {/* Enlaces (líneas) primero, debajo de los símbolos */}
            {layout.enlaces.map((e, i) => (
              <line
                key={i}
                x1={e.desde.x}
                y1={e.desde.y}
                x2={e.hasta.x}
                y2={e.hasta.y}
                stroke="black"
                strokeWidth={e.tipo === 'principal' ? 0.6 : 0.4}
              />
            ))}

            {/* Símbolos con resaltado por confianza */}
            {layout.nodos.map(n => {
              const conf = n.componente.procedencia.confianza;
              const claseResaltado =
                conf === 'discrepancia' ? 'stroke-red-600' :
                conf === 'baja' ? 'stroke-orange-500' :
                '';
              const dasharray = conf === 'baja' ? '1.5,1' : undefined;

              return (
                <g
                  key={n.id}
                  className={`cursor-pointer ${claseResaltado}`}
                  style={{ strokeDasharray: dasharray }}
                  onClick={() => onClicComponente?.(n.id)}
                >
                  <SimboloIEC x={n.x} y={n.y} ancho={n.ancho} componente={n.componente} />
                  {conf === 'discrepancia' && (
                    <text x={n.x + n.ancho} y={n.y - 1} fontSize="2.5" fill="red">⚠</text>
                  )}
                </g>
              );
            })}

            {/* Cuadro de rotulación */}
            <CuadroRotulacion
              tablero={tablero}
              nombreCliente={nombreCliente}
              x={cuadroX}
              y={cuadroY}
              ancho={cuadroAncho}
              alto={cuadroAlto}
            />
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar compilación**

`npm --workspace apps/web exec tsc -- --noEmit` → sin errores.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/diagrama/DiagramaSVG.tsx
git commit -m "feat(web): componente DiagramaSVG con zoom/pan, símbolos IEC y resaltado de estado"
```

---

## Tarea 10 — Integrar `DiagramaSVG` en el workspace

**Archivos:**
- Modificar: `apps/web/src/pantallas/WorkspaceTablero.tsx`

- [ ] **Paso 1: Reemplazar el placeholder del diagrama**

Sobrescribir `WorkspaceTablero.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTableroStore } from '../estado/tableroStore.js';
import { useClienteStore } from '../estado/clienteStore.js';
import { BarraCompletitud } from '../componentes/BarraCompletitud.js';
import { PanelFotos } from '../componentes/PanelFotos.js';
import { PanelComponentes } from '../componentes/PanelComponentes.js';
import { PanelPendientes } from '../componentes/PanelPendientes.js';
import { DiagramaSVG } from '../diagrama/DiagramaSVG.js';

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  const { tablero, cargando, error, cargar, limpiar } = useTableroStore();
  const { clientes, cargarTodos } = useClienteStore();
  const [componenteResaltadoId, setComponenteResaltadoId] = useState<string | null>(null);

  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  useEffect(() => {
    // Cargamos clientes para obtener el nombre del cliente actual para el cuadro de rotulación.
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

      <div className="flex-1 grid grid-cols-12 gap-4 p-6">
        <div className="col-span-3">
          <PanelFotos tablero={tablero} clienteSlug={clienteSlug!} tableroSlug={tableroSlug!} />
        </div>
        <div className="col-span-5">
          <PanelComponentes
            tablero={tablero}
            clienteSlug={clienteSlug!}
            tableroSlug={tableroSlug!}
            componenteResaltadoId={componenteResaltadoId}
          />
        </div>
        <div className="col-span-4">
          <div className="h-full min-h-[400px]">
            <DiagramaSVG
              tablero={tablero}
              nombreCliente={cliente?.nombre}
              onClicComponente={setComponenteResaltadoId}
            />
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

- [ ] **Paso 2: Aceptar la prop `componenteResaltadoId` en `PanelComponentes`**

Modificar `apps/web/src/componentes/PanelComponentes.tsx`. Agregar a la interfaz `Props`:

```typescript
interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
  componenteResaltadoId?: string | null;
}
```

Y dentro del map de filas, agregar resaltado:

```typescript
{tablero.componentes.map(c => (
  <tr
    key={c.id}
    className={`border-b last:border-b-0 ${c.id === componenteResaltadoId ? 'bg-blue-50' : ''}`}
  >
    ...
```

- [ ] **Paso 3: Verificar compilación**

`npm --workspace apps/web exec tsc -- --noEmit` → sin errores.

- [ ] **Paso 4: Build completo del frontend**

`npm run build:web` → debe compilar sin errores. Limpiar `dist/` después: `rm -rf apps/web/dist`.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/pantallas/WorkspaceTablero.tsx apps/web/src/componentes/PanelComponentes.tsx
git commit -m "feat(web): integra DiagramaSVG en workspace; clic en componente resalta panel"
```

---

## Tarea 11 — Verificación E2E manual

**Pre-requisitos:** `.env` configurado, backend y frontend corriendo (`npm run dev`).

- [ ] **Paso 1: Arrancar** `npm run dev`

- [ ] **Paso 2: Abrir el navegador** (Simple Browser de VS Code o externo) en `http://localhost:5173`.

- [ ] **Paso 3: Usar un tablero existente** (de las pruebas del Plan 2) o crear uno nuevo con foto.

- [ ] **Paso 4: Verificar:**

   - El panel derecho ahora muestra un diagrama SVG en lugar del placeholder gris.
   - Hay un encabezado en la esquina superior izquierda indicando "Tamaño sugerido: A4" (o A3 si hay >12 ramas).
   - Hay un cuadro de rotulación pequeño en la esquina inferior derecha con el código del tablero, tensión y fecha.
   - Cada componente aparece con su símbolo IEC (rectángulo con barra inclinada para automáticos, rectángulo con Δ para diferenciales, etc.).
   - Los enlaces (líneas) conectan principal → barra/ramas correctamente.
   - Si hay componentes con `procedencia.confianza === 'discrepancia'`, aparecen con borde rojo y un ⚠.
   - Zoom funciona con la rueda del mouse; pan funciona arrastrando.
   - Clic en un componente del diagrama resalta la fila correspondiente en el panel central (fondo azul claro).

- [ ] **Paso 5: Probar el caso de muchas ramas**

   Subir varias fotos hasta tener >12 automáticos. Verificar que el indicador cambia a "Tamaño sugerido: A3" y el diagrama se ajusta sin recortarse (con zoom).

- [ ] **Paso 6: Documentar resultados**

Crear `docs/superpowers/plans/2026-05-12-plan-3-resultados.md`:

```markdown
# Plan 3 — Resultados de la verificación E2E

**Fecha:** [completar]

## Visualización
- [ ] Diagrama SVG aparece donde antes había placeholder
- [ ] Símbolos IEC se ven correctamente para cada tipo
- [ ] Cuadro de rotulación visible y legible
- [ ] Zoom y pan funcionan

## Resaltado de estado
- [ ] Componentes con discrepancia se ven con borde rojo + ⚠
- [ ] Componentes con confianza baja se ven con borde naranja punteado

## Interacción
- [ ] Clic en componente del diagrama resalta la fila correspondiente en el panel central

## Layout
- [ ] Hasta 12 ramas → indicador "A4"
- [ ] 13+ ramas → indicador "A3"
- [ ] Ningún traslape visible entre símbolos

## Hallazgos para Plan 4
- [pendiente]
```

- [ ] **Paso 7: Commit**

```bash
git add docs/superpowers/plans/2026-05-12-plan-3-resultados.md
git commit -m "docs: agrega plantilla de resultados E2E del Plan 3"
```

---

## Criterios de aceptación

- [ ] `npm test` ejecuta 49 (servidor) + 11 (web) tests, todos pasan.
- [ ] El workspace del tablero muestra un diagrama SVG real (no placeholder).
- [ ] Símbolos IEC reconocibles para los 8 tipos cubiertos (lote 1 + lote 2 + barra + medidor).
- [ ] Layout es determinístico — al recargar, el mismo tablero produce el mismo diagrama.
- [ ] Zoom y pan funcionan con rueda y arrastre.
- [ ] Discrepancias se marcan visualmente con rojo + ⚠.
- [ ] Confianza baja se marca con borde naranja punteado.
- [ ] Clic en un componente del diagrama resalta la fila correspondiente en el panel central.
- [ ] El indicador de tamaño sugerido A4/A3 cambia según el número de ramas.

---

## Lo que NO resuelve Plan 3 (queda para planes posteriores)

- Exportación a PDF (Plan 6).
- Símbolos para contactor, relé térmico, motor, generador, transformador (Plan 4 según necesidad RIC, o Plan 6 al exportar).
- Edición directa del componente al hacer clic en el diagrama (probablemente Plan 4 cuando entren los hallazgos RIC y se quiera anotar correcciones).
- Layout adaptado al ancho real del panel (en Plan 3 el zoom maneja esto; en Plan 6 se ajusta al papel real).
- Conexiones más sofisticadas (rutas en L con esquinas, etiquetas sobre líneas con calibre del conductor). Se incorporan en Plan 4 cuando entren los circuitos como entidad propia.
