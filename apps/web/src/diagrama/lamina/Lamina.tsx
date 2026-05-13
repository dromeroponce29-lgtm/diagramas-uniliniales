// Lámina RIC N°18: notas + diagrama unilineal + cuadros normativos + viñeta.
import type { Tablero, Cliente } from '@tipos/modelo';
import { DiagramaSVG } from '../DiagramaSVG.js';
import { NotasGenerales } from './NotasGenerales.js';
import { CuadroDeCargas } from './CuadroDeCargas.js';
import { CuadroDeAlimentadores } from './CuadroDeAlimentadores.js';
import { CuadroDeSimbologia } from './CuadroDeSimbologia.js';
import { Vineta } from './Vineta.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function Lamina({ tablero, cliente, onClicComponente }: Props) {
  return (
    <div className="space-y-3">
      <NotasGenerales tablero={tablero} />

      <div className="bg-white border rounded h-[600px]">
        <DiagramaSVG tablero={tablero} cliente={cliente} onClicComponente={onClicComponente} />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <section className="col-span-6 bg-white border rounded p-3">
          <h4 className="font-semibold text-sm mb-2">Cuadro de cargas</h4>
          <CuadroDeCargas tablero={tablero} />
        </section>
        <section className="col-span-3 bg-white border rounded p-3">
          <h4 className="font-semibold text-sm mb-2">Simbología</h4>
          <CuadroDeSimbologia tablero={tablero} />
        </section>
        <section className="col-span-3">
          <Vineta tablero={tablero} cliente={cliente} />
        </section>
      </div>

      <section className="bg-white border rounded p-3">
        <h4 className="font-semibold text-sm mb-2">Resumen de alimentadores</h4>
        <CuadroDeAlimentadores tablero={tablero} />
      </section>
    </div>
  );
}
