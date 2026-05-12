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
