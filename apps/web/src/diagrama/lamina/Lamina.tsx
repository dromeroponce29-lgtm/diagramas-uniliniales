// Lámina RIC N°18: notas + diagrama unilineal + cuadros normativos + viñeta
// + foto del tablero para comparación + chat de refinamiento.
//
// Tiene dos modos de impresión:
// - "Imprimir lámina completa" → CSS @media print del navegador,
//   incluye la foto en página aparte y oculta el chat.
// - "Imprimir unilineal (RIC)" → modo normativo que oculta foto + chat
//   y aplica A3 landscape con márgenes 10 mm (Pliego N°5).
import { useEffect } from 'react';
import type { Tablero, Cliente } from '@tipos/modelo';
import { DiagramaSVG } from '../DiagramaSVG.js';
import { NotasGenerales } from './NotasGenerales.js';
import { CuadroDeCargas } from './CuadroDeCargas.js';
import { CuadroDeAlimentadores } from './CuadroDeAlimentadores.js';
import { CuadroDeSimbologia } from './CuadroDeSimbologia.js';
import { Vineta } from './Vineta.js';
import { FotoComparacion } from './FotoComparacion.js';
import { ChatRefinador } from './ChatRefinador.js';
import { imprimirModulo, clasesBotonImprimir } from '../../hooks/imprimirModulo.js';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug?: string;
  tableroSlug?: string;
  onClicComponente: (id: string | null) => void;
}

// ID del <style> temporal que inyectamos al imprimir en modo RIC.
const STYLE_ID_PAGE_RIC = 'estilo-page-unilineal-ric';

function imprimirUnilinealRIC(): void {
  // Inyectar @page A3 landscape + márgenes mínimos como exige el Pliego N°5.
  const style = document.createElement('style');
  style.id = STYLE_ID_PAGE_RIC;
  style.textContent = `@page { size: A3 landscape; margin: 10mm; }`;
  document.head.appendChild(style);

  document.body.setAttribute('data-print-mode', 'unilineal-ric');

  // Cleanup post-impresión.
  const cleanup = () => {
    document.body.removeAttribute('data-print-mode');
    document.getElementById(STYLE_ID_PAGE_RIC)?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // Dispara el diálogo de impresión.
  window.print();
}

export function Lamina({ tablero, cliente, clienteSlug, tableroSlug, onClicComponente }: Props) {
  // Cleanup defensivo: si el componente se desmonta a mitad de impresión.
  useEffect(() => {
    return () => {
      document.body.removeAttribute('data-print-mode');
      document.getElementById(STYLE_ID_PAGE_RIC)?.remove();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2 imprimir-unilineal-oculto imprimir-oculto">
        <button
          onClick={imprimirUnilinealRIC}
          className="text-sm px-3 py-1 border border-blue-700 text-blue-700 rounded hover:bg-blue-50"
          title="Imprime solo el diagrama unilineal + cuadros normativos según Pliego RIC N°5. Oculta foto y chat."
        >🖨️ Imprimir unilineal (RIC)</button>
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1 border border-slate-400 text-slate-700 rounded hover:bg-slate-100"
          title="Imprime la lámina completa incluyendo la foto del tablero en página aparte."
        >🖨️ Imprimir lámina completa</button>
      </div>

      <NotasGenerales tablero={tablero} />

      <div className="imprimir-modulo imprimir-modulo-diagrama bg-white border rounded">
        <div className="flex items-center justify-end p-2 imprimir-oculto">
          <button
            onClick={() => imprimirModulo('diagrama', true)}
            className={clasesBotonImprimir()}
            title="Imprime solo el diagrama unilineal."
          >🖨️ Imprimir esta sección</button>
        </div>
        <div className="h-[600px]">
          <DiagramaSVG tablero={tablero} cliente={cliente} onClicComponente={onClicComponente} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 print:break-after-page">
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

      {clienteSlug && tableroSlug && (
        <div className="imprimir-unilineal-oculto">
          <ChatRefinador tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        </div>
      )}

      {clienteSlug && tableroSlug && (
        <div className="imprimir-unilineal-oculto">
          <FotoComparacion tablero={tablero} clienteSlug={clienteSlug} tableroSlug={tableroSlug} />
        </div>
      )}
    </div>
  );
}
