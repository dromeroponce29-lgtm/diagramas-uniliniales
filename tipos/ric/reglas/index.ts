// tipos/ric/reglas/index.ts
import { reglaIntGeneralPresente } from './int-general-presente.js';
import { reglaDiferencialPresente } from './diferencial-presente.js';
import { reglaDiferencialSensibilidadEnchufes } from './diferencial-sensibilidad-enchufes.js';
import { reglaBarrasTierraNeutroSeparadas } from './barras-tierra-neutro-separadas.js';
import { reglaDpsPresente } from './dps-presente.js';
import { reglaCalibreVsSeccion } from './calibre-vs-seccion.js';
import { reglaIdentificacionCircuitos } from './identificacion-circuitos.js';
import { reglaReservaMinima } from './reserva-minima.js';
import { reglaSelectividad } from './selectividad.js';
import { reglaCalibreIgVsAlimentador } from './calibre-ig-vs-alimentador.js';
import { reglaVinetaRotulada } from './vineta-rotulada.js';
import { reglaDiferencialCubreFinales } from './diferencial-cubre-finales.js';
import { reglaCalibrePeMinimo } from './calibre-pe-minimo.js';
import { reglaCaidaTensionCircuito } from './caida-tension-circuito.js';
import type { ReglaRIC } from '../tipos.js';

export const TODAS_LAS_REGLAS: ReglaRIC[] = [
  reglaIntGeneralPresente,
  reglaDiferencialPresente,
  reglaDiferencialSensibilidadEnchufes,
  reglaBarrasTierraNeutroSeparadas,
  reglaDpsPresente,
  reglaCalibreVsSeccion,
  reglaIdentificacionCircuitos,
  reglaReservaMinima,
  reglaSelectividad,
  reglaCalibreIgVsAlimentador,
  reglaVinetaRotulada,
  reglaDiferencialCubreFinales,
  reglaCalibrePeMinimo,
  reglaCaidaTensionCircuito
];
