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
  for (const lista of porCapa.values()) lista.sort(ordenar);

  // 2. Determinar centro horizontal del diagrama.
  const numRamas = (porCapa.get('rama') ?? []).length;
  const anchoRamas = Math.max(1, numRamas) * (ANCHO_SIMBOLO_MM + ESPACIO_HORIZONTAL_MM);
  const margenLateral = 40;
  const xCentro = margenLateral + anchoRamas / 2;

  const nodos: NodoLayout[] = [];

  // 3. Componentes principales (apilados en el centro).
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

  // 4. Medidor (si hay).
  for (const c of porCapa.get('medidor') ?? []) {
    nodos.push({
      id: c.id, componente: c,
      x: xCentro - ANCHO_SIMBOLO_MM / 2,
      y: Y_POR_CAPA['medidor'],
      ancho: ANCHO_SIMBOLO_MM, alto: ALTO_SIMBOLO_MM,
      capa: 'medidor'
    });
  }

  // 5. Barra (línea horizontal larga).
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

  // 6. Ramas (columnas).
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

  // 7. Laterales.
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

  // 8. Enlaces.
  const enlaces: EnlaceLayout[] = [];
  const principales = nodos.filter(n => n.capa === 'principal');
  const ramasN = nodos.filter(n => n.capa === 'rama');

  for (let i = 0; i < principales.length - 1; i++) {
    const a = principales[i]!;
    const b = principales[i + 1]!;
    enlaces.push({
      desde: { x: a.x + a.ancho / 2, y: a.y + a.alto },
      hasta: { x: b.x + b.ancho / 2, y: b.y },
      tipo: 'principal'
    });
  }

  const ultimoPrincipal = principales[principales.length - 1];
  if (ultimoPrincipal) {
    enlaces.push({
      desde: { x: ultimoPrincipal.x + ultimoPrincipal.ancho / 2, y: ultimoPrincipal.y + ultimoPrincipal.alto },
      hasta: { x: ultimoPrincipal.x + ultimoPrincipal.ancho / 2, y: yBarra },
      tipo: 'principal'
    });
  }

  for (const rama of ramasN) {
    enlaces.push({
      desde: { x: rama.x + rama.ancho / 2, y: yBarra },
      hasta: { x: rama.x + rama.ancho / 2, y: rama.y },
      tipo: 'rama'
    });
  }

  // 9. Ancho y alto totales.
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
