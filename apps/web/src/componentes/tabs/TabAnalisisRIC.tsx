import type { Tablero } from '@tipos/modelo';
import { PanelAnalisisRIC } from '../PanelAnalisisRIC.js';
import { imprimirModulo, clasesBotonImprimir } from '../../hooks/imprimirModulo.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabAnalisisRIC({ tablero, clienteSlug, tableroSlug }: Props) {
  return (
    <div className="imprimir-modulo imprimir-modulo-auditoria space-y-3">
      <div className="flex items-center justify-end imprimir-oculto">
        <button
          onClick={() => imprimirModulo('auditoria')}
          className={clasesBotonImprimir()}
          title="Imprime solo el análisis RIC + auditoría del tablero."
        >🖨️ Imprimir esta sección</button>
      </div>
      <PanelAnalisisRIC tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}
