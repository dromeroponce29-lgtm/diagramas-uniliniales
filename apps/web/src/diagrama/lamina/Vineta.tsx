// Viñeta (cuadro de rotulación) para el diagrama unilineal — RIC N°18.
import type { Tablero, Cliente } from '@tipos/modelo';

interface PropsHTML {
  tablero: Tablero;
  cliente?: Cliente;
}

interface PropsSVG {
  tablero: Tablero;
  nombreCliente?: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

function val(...candidatos: (string | undefined)[]): string {
  for (const c of candidatos) if (c && c.trim()) return c;
  return '—';
}

/** Versión HTML de la viñeta — para uso en paneles/láminas React. */
export function Vineta({ tablero, cliente }: PropsHTML) {
  const v = tablero.vineta ?? {};
  return (
    <div className="border rounded p-3 bg-white text-xs space-y-1 w-full">
      <div className="font-semibold text-sm border-b pb-1 mb-1">Viñeta</div>
      <div><span className="text-slate-500">Proyecto:</span> {val(v.proyectoNombre, cliente?.proyectoNombrePredeterminado)}</div>
      <div><span className="text-slate-500">Propietario:</span> {val(cliente?.nombre)}</div>
      <div><span className="text-slate-500">Instalador:</span> {val(v.instaladorNombre, cliente?.instaladorPredeterminadoNombre)}</div>
      <div><span className="text-slate-500">RUT:</span> {val(v.instaladorRUT, cliente?.instaladorPredeterminadoRUT)}</div>
      <div><span className="text-slate-500">Clase SEC:</span> {val(v.instaladorClaseSEC, cliente?.instaladorPredeterminadoClaseSEC)}</div>
      <div><span className="text-slate-500">Fecha emisión:</span> {val(v.fechaEmision)}</div>
      <div><span className="text-slate-500">Lámina:</span> {val(v.numeroLamina)}   <span className="text-slate-500">Rev:</span> {val(v.revision)}</div>
      <div><span className="text-slate-500">Tablero:</span> {tablero.codigo}</div>
    </div>
  );
}

/** Versión SVG de la viñeta — para uso dentro del lienzo DiagramaSVG. */
export function VinetaSVG({ tablero, nombreCliente, x, y, ancho, alto }: PropsSVG) {
  const fecha = new Date(tablero.actualizadoEn).toLocaleDateString('es-CL');
  const v = tablero.vineta ?? {};
  const etiquetaCliente = val(v.proyectoNombre, nombreCliente);
  return (
    <g transform={`translate(${x},${y})`} className="vineta-svg">
      <rect width={ancho} height={alto} fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="0" y1={alto / 3} x2={ancho} y2={alto / 3} stroke="black" strokeWidth="0.3" />
      <line x1="0" y1={2 * alto / 3} x2={ancho} y2={2 * alto / 3} stroke="black" strokeWidth="0.3" />
      <text x="2" y="4" fontSize="2.5" fontFamily="sans-serif" fontWeight="bold">DIAGRAMA UNILINEAL</text>
      <text x="2" y={alto / 3 + 4} fontSize="2.2" fontFamily="sans-serif">
        {etiquetaCliente} — {tablero.codigo}
      </text>
      <text x="2" y={2 * alto / 3 + 4} fontSize="2" fontFamily="sans-serif">
        {tablero.tensionSistema} · {tablero.esquemaTierra}
      </text>
      <text x="2" y={alto - 1.5} fontSize="1.8" fontFamily="sans-serif" fill="#666">
        Actualizado: {fecha}
      </text>
    </g>
  );
}
