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
