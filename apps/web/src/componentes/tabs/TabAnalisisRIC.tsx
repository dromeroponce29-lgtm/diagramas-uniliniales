import type { Tablero } from '@tipos/modelo';
import { PanelAnalisisRIC } from '../PanelAnalisisRIC.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabAnalisisRIC({ tablero, clienteSlug, tableroSlug }: Props) {
  return <PanelAnalisisRIC tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />;
}
