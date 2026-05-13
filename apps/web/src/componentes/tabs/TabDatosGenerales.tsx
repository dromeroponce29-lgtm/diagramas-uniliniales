import type { Tablero, Cliente } from '@tipos/modelo';
import { FormularioDatosElectricos } from '../datos-generales/FormularioDatosElectricos.js';
import { FormularioAcometida } from '../datos-generales/FormularioAcometida.js';
import { FormularioAlimentadorEntrada } from '../datos-generales/FormularioAlimentadorEntrada.js';
import { FormularioPuestaATierra } from '../datos-generales/FormularioPuestaATierra.js';
import { FormularioVineta } from '../datos-generales/FormularioVineta.js';
import { FormularioNotasGenerales } from '../datos-generales/FormularioNotasGenerales.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabDatosGenerales({ tablero, cliente, clienteSlug, tableroSlug }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormularioDatosElectricos tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioAcometida tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioAlimentadorEntrada tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioPuestaATierra tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioVineta tablero={tablero} cliente={cliente} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      <FormularioNotasGenerales tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
    </div>
  );
}
