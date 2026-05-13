// Cálculos eléctricos para evaluación normativa RIC.
// Funciones puras que consumen tablas en tipos/ric/tablas/ (RIC Pliegos N°02, N°04, N°06).
import calibresPEData from './tablas/calibresPE.json' with { type: 'json' };
import impedanciaData from './tablas/impedanciaConductores.json' with { type: 'json' };
import capacidadData from './tablas/capacidadConductores.json' with { type: 'json' };
import factoresData from './tablas/factoresCorreccion.json' with { type: 'json' };

type CalibresPE = { tabla: Record<string, number> };
type Impedancia = Record<'Cu' | 'Al', Record<string, { R75C: number; X: number }>>;

const CALIBRES_PE = calibresPEData as unknown as CalibresPE;
const IMPEDANCIA = impedanciaData as unknown as Impedancia;
const CAPACIDAD = capacidadData as unknown;
const FACTORES = factoresData as unknown as {
  temperaturaAmbiente: { T75C: Record<string, number>; T90C: Record<string, number> };
  agrupamiento: Record<string, number>;
};

/**
 * Calibre mínimo del conductor de protección (PE) en mm² dado el calibre de fase.
 * Si la fase no está en la tabla, usa el valor del próximo calibre estándar superior.
 * RIC N°06 (puesta a tierra).
 */
export function calibrePEMinimo(seccionFaseMM2: number): number | undefined {
  const claves = Object.keys(CALIBRES_PE.tabla).map(Number).sort((a, b) => a - b);
  const exacto = CALIBRES_PE.tabla[String(seccionFaseMM2)];
  if (exacto !== undefined) return exacto;
  // Buscar siguiente sección igual o mayor
  const siguiente = claves.find(k => k >= seccionFaseMM2);
  if (siguiente === undefined) return undefined;
  return CALIBRES_PE.tabla[String(siguiente)];
}

/**
 * Caída de tensión de un circuito en porcentaje, sistema monofásico o trifásico.
 *
 *   ΔU% = (factorSistema × I × L × (R·cosφ + X·senφ)) / U_LN × 100
 *
 * donde factorSistema = 2 para monofásico y √3 para trifásico.
 *
 * RIC N°02 exige ΔU ≤ 3% en circuito final (RIC-CV-002) y ≤ 3% en alimentador
 * (RIC-CV-001) con un total ≤ 5% (RIC-CV-003).
 */
export interface EntradaCaidaTension {
  corrienteA: number;
  longitudM: number;
  seccionMM2: number;
  tensionLineaV: number;          // tensión línea-línea (380 trif) o línea-neutro (220 mono)
  esTrifasico: boolean;
  factorPotencia?: number;        // default 0.95
  material?: 'Cu' | 'Al';         // default Cu
}

export function caidaTensionPct(input: EntradaCaidaTension): number | undefined {
  const fp = input.factorPotencia ?? 0.95;
  const sen = Math.sqrt(Math.max(0, 1 - fp * fp));
  const material = input.material ?? 'Cu';
  const tabla = IMPEDANCIA[material];
  const fila = tabla?.[String(input.seccionMM2)];
  if (!fila) return undefined;

  const Rkm = fila.R75C;
  const Xkm = fila.X;
  const longitudKm = input.longitudM / 1000;
  const factorSistema = input.esTrifasico ? Math.sqrt(3) : 2;
  const caidaV = factorSistema * input.corrienteA * longitudKm * (Rkm * fp + Xkm * sen);
  // Para trifásico la base es la tensión línea-línea; para monofásico es L-N (típicamente 220 V en CL).
  const baseV = input.esTrifasico ? input.tensionLineaV : input.tensionLineaV;
  return (caidaV / baseV) * 100;
}

/**
 * Capacidad nominal de un conductor en A, con derating por T° ambiente y agrupamiento.
 * RIC N°04 Tabla 8.7 — valores base a 30 °C, 3 conductores cargados, aislación dada.
 */
export interface EntradaCapacidad {
  material: 'Cu' | 'Al';
  aislacion: string;            // 'THHN' | 'EVA' | 'XLPE' | 'NYY' | 'TW'
  seccionMM2: number;
  temperaturaAmbienteC?: number;  // default 30
  agrupamiento?: number;          // cantidad de conductores cargados en el mismo ducto (default 3)
}

export function capacidadCorregidaA(input: EntradaCapacidad): number | undefined {
  const cap = CAPACIDAD as Record<string, Record<string, Record<string, number>>>;
  const nominal = cap[input.material]?.[input.aislacion]?.[String(input.seccionMM2)];
  if (typeof nominal !== 'number') return undefined;

  const tAmb = input.temperaturaAmbienteC ?? 30;
  const tipo = input.aislacion === 'EVA' || input.aislacion === 'XLPE' || input.aislacion === 'NYY' ? 'T90C' : 'T75C';
  const ft = factorTemperatura(tAmb, tipo);

  const agrup = input.agrupamiento ?? 3;
  const fa = factorAgrupamiento(agrup);

  return nominal * ft * fa;
}

function factorTemperatura(tempC: number, tipo: 'T75C' | 'T90C'): number {
  const tabla = FACTORES.temperaturaAmbiente[tipo];
  const claves = Object.keys(tabla).map(Number).sort((a, b) => a - b);
  if (tempC <= claves[0]!) return tabla[String(claves[0]!)]!;
  if (tempC >= claves[claves.length - 1]!) return tabla[String(claves[claves.length - 1]!)]!;
  // Interpolación lineal entre los dos puntos más cercanos.
  for (let i = 0; i < claves.length - 1; i++) {
    const a = claves[i]!, b = claves[i + 1]!;
    if (tempC >= a && tempC <= b) {
      const fa = tabla[String(a)]!, fb = tabla[String(b)]!;
      return fa + ((fb - fa) * (tempC - a)) / (b - a);
    }
  }
  return 1;
}

function factorAgrupamiento(n: number): number {
  if (n <= 3) return FACTORES.agrupamiento['1-3']!;
  if (n <= 6) return FACTORES.agrupamiento['4-6']!;
  if (n <= 9) return FACTORES.agrupamiento['7-9']!;
  if (n <= 20) return FACTORES.agrupamiento['10-20']!;
  if (n <= 30) return FACTORES.agrupamiento['21-30']!;
  if (n <= 40) return FACTORES.agrupamiento['31-40']!;
  return FACTORES.agrupamiento['41+']!;
}
