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
    case 'interruptor-general':    return <InterruptorGeneral x={x} y={y} componente={componente} />;
    case 'diferencial':            return <Diferencial x={x} y={y} componente={componente} />;
    case 'interruptor-automatico': return <InterruptorAutomatico x={x} y={y} componente={componente} />;
    case 'barra-fase':             return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'barra-neutro':           return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'barra-tierra':           return <Barra x={x} y={y} ancho={ancho ?? 50} componente={componente} />;
    case 'dps':                    return <DPS x={x} y={y} componente={componente} />;
    case 'medidor':                return <Medidor x={x} y={y} />;
    case 'contactor':
    case 'rele-termico':
    case 'borne':
    case 'otro':
    default:                       return <Generico x={x} y={y} componente={componente} />;
  }
}

export { Tierra };
