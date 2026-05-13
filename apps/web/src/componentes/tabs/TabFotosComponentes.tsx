import type { Tablero } from '@tipos/modelo';
import { PanelFotos } from '../PanelFotos.js';
import { PanelComponentes } from '../PanelComponentes.js';
import { PanelPendientes } from '../PanelPendientes.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
  componenteResaltadoId: string | null;
}

export function TabFotosComponentes({ tablero, clienteSlug, tableroSlug, componenteResaltadoId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4">
          <PanelFotos tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        </div>
        <div className="col-span-8">
          <PanelComponentes
            tablero={tablero}
            clienteSlug={clienteSlug}
            tableroSlug={tableroSlug}
            componenteResaltadoId={componenteResaltadoId}
          />
        </div>
      </div>
      <PanelPendientes tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}
