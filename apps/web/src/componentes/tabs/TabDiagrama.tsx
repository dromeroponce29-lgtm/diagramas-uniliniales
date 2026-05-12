import type { Tablero, Cliente } from '@tipos/modelo';
import { DiagramaSVG } from '../../diagrama/DiagramaSVG.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function TabDiagrama({ tablero, cliente, onClicComponente }: Props) {
  return (
    <div className="bg-white border rounded p-4 h-[700px]">
      <DiagramaSVG
        tablero={tablero}
        nombreCliente={cliente?.nombre}
        onClicComponente={onClicComponente}
      />
    </div>
  );
}
