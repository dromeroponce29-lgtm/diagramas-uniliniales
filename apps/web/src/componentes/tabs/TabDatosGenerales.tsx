import type { Tablero, Cliente } from '@tipos/modelo';
import { FormularioDatosElectricos } from '../datos-generales/FormularioDatosElectricos.js';
import { FormularioAcometida } from '../datos-generales/FormularioAcometida.js';
import { FormularioAlimentadorEntrada } from '../datos-generales/FormularioAlimentadorEntrada.js';
import { FormularioPuestaATierra } from '../datos-generales/FormularioPuestaATierra.js';
import { FormularioVineta } from '../datos-generales/FormularioVineta.js';
import { FormularioNotasGenerales } from '../datos-generales/FormularioNotasGenerales.js';
import { SugerenciasIA } from '../datos-generales/SugerenciasIA.js';
import { imprimirModulo, clasesBotonImprimir } from '../../hooks/imprimirModulo.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabDatosGenerales({ tablero, cliente, clienteSlug, tableroSlug }: Props) {
  return (
    <div className="imprimir-modulo imprimir-modulo-datos space-y-3">
      <div className="flex items-center justify-end imprimir-oculto">
        <button
          onClick={() => imprimirModulo('datos')}
          className={clasesBotonImprimir()}
          title="Imprime solo los datos generales del tablero."
        >🖨️ Imprimir esta sección</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SugerenciasIA tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioDatosElectricos tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioAcometida tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioAlimentadorEntrada tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioPuestaATierra tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioVineta tablero={tablero} cliente={cliente} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        <FormularioNotasGenerales tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
      </div>
    </div>
  );
}
