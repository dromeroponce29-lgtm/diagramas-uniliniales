// Leyenda dinámica IEC 60617 — muestra solo los tipos de componente presentes en el tablero.
import type { Tablero, TipoComponente, ComponenteReconciliado } from '@tipos/modelo';
import { SimboloIEC } from '../simbolos/index.js';

interface Props {
  tablero: Tablero;
}

const ETIQUETAS: Record<TipoComponente, string> = {
  'interruptor-automatico': 'Interruptor automático',
  'diferencial': 'Diferencial',
  'interruptor-general': 'Interruptor general',
  'barra-fase': 'Barra de fase',
  'barra-neutro': 'Barra de neutro',
  'barra-tierra': 'Barra de tierra',
  'dps': 'DPS (descargador de sobretensiones)',
  'contactor': 'Contactor',
  'rele-termico': 'Relé térmico',
  'medidor': 'Medidor de energía',
  'borne': 'Borne',
  'otro': 'Otro'
};

// Construye un ComponenteReconciliado mínimo para representar el símbolo en la leyenda.
function componenteParaLeyenda(tipo: TipoComponente): ComponenteReconciliado {
  return {
    id: `leyenda-${tipo}`,
    tipo,
    procedencia: { fuente: 'manual', confianza: 'alta' }
  };
}

export function CuadroDeSimbologia({ tablero }: Props) {
  const tiposPresentes = Array.from(
    new Set(tablero.componentes.map(c => c.tipo))
  ) as TipoComponente[];

  if (tiposPresentes.length === 0) {
    return <p className="text-xs text-slate-500 italic">Sin componentes para mostrar simbología.</p>;
  }

  return (
    <div className="space-y-2">
      {tiposPresentes.map(tipo => (
        <div key={tipo} className="flex items-center gap-3 text-xs">
          <div className="w-12 h-8 border rounded bg-white flex items-center justify-center">
            <svg width="40" height="24" viewBox="0 0 40 24">
              <SimboloIEC
                componente={componenteParaLeyenda(tipo)}
                x={0}
                y={0}
                ancho={40}
              />
            </svg>
          </div>
          <span>{ETIQUETAS[tipo]}</span>
        </div>
      ))}
    </div>
  );
}
