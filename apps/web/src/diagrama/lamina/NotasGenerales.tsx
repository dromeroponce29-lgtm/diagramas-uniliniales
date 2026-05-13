// Notas generales de la lámina + normativa derivada de las reglas RIC evaluadas.
import type { Tablero } from '@tipos/modelo';
import { evaluarRIC } from '../../../../../tipos/ric/motor.js';

interface Props {
  tablero: Tablero;
}

const NORMATIVAS_BASE = ['Pliego Técnico RIC N°18 (SEC Chile)', 'NCh 13 Of. 93', 'IEC 60617'];

export function NotasGenerales({ tablero }: Props) {
  const hallazgos = evaluarRIC(tablero);
  const partesRIC = Array.from(new Set(hallazgos.map(h => h.parteRIC))).sort();
  const normativa = [...NORMATIVAS_BASE, ...partesRIC.map(p => `Pliego Técnico ${p}`)];

  const linea1 = [
    tablero.tensionSistema !== 'pendiente' ? `Tensión: ${tablero.tensionSistema}` : null,
    tablero.frecuenciaHz ? `${tablero.frecuenciaHz} Hz` : null,
    tablero.esquemaTierra !== 'pendiente' ? `Esquema tierra: ${tablero.esquemaTierra}` : null,
    tablero.puestaATierra?.resistenciaOhmMedida !== undefined
      ? `R medida: ${tablero.puestaATierra.resistenciaOhmMedida} Ω`
      : null
  ].filter((x): x is string => !!x).join(' · ');

  return (
    <div className="border rounded bg-white p-3 text-xs space-y-2">
      <h4 className="font-semibold text-sm">Notas generales</h4>
      {linea1 && <div className="text-slate-700">{linea1}</div>}
      {tablero.notasGenerales && (
        <p className="whitespace-pre-line text-slate-700">{tablero.notasGenerales}</p>
      )}
      <div className="text-slate-500">
        <span className="font-medium">Normativa aplicada:</span> {normativa.join(', ')}.
      </div>
    </div>
  );
}
