import type { Tablero, Cliente } from '@tipos/modelo';
import { Lamina } from '../../diagrama/lamina/Lamina.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function TabDiagrama({ tablero, cliente, onClicComponente }: Props) {
  return <Lamina tablero={tablero} cliente={cliente} onClicComponente={onClicComponente} />;
}
