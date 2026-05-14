import type { Tablero, Cliente } from '@tipos/modelo';
import { Lamina } from '../../diagrama/lamina/Lamina.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug?: string;
  tableroSlug?: string;
  onClicComponente: (id: string | null) => void;
}

export function TabDiagrama({ tablero, cliente, clienteSlug, tableroSlug, onClicComponente }: Props) {
  return (
    <Lamina
      tablero={tablero}
      cliente={cliente}
      clienteSlug={clienteSlug}
      tableroSlug={tableroSlug}
      onClicComponente={onClicComponente}
    />
  );
}
