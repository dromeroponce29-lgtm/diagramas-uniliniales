import type { Tablero } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

// Cuadro de rotulación simplificado en SVG. El cuadro completo con sello
// del ejecutor, número de proyecto SEC, revisiones etc. se construye en Plan 6
// cuando se exporte el PDF.
export function CuadroRotulacion({ tablero, nombreCliente, x, y, ancho, alto }: Props) {
  const fecha = new Date(tablero.actualizadoEn).toLocaleDateString('es-CL');
  return (
    <g transform={`translate(${x},${y})`} className="cuadro-rotulacion">
      <rect width={ancho} height={alto} fill="white" stroke="black" strokeWidth="0.5" />
      <line x1="0" y1={alto / 3} x2={ancho} y2={alto / 3} stroke="black" strokeWidth="0.3" />
      <line x1="0" y1={2 * alto / 3} x2={ancho} y2={2 * alto / 3} stroke="black" strokeWidth="0.3" />
      <text x="2" y="4" fontSize="2.5" fontFamily="sans-serif" fontWeight="bold">DIAGRAMA UNILINEAL</text>
      <text x="2" y={alto / 3 + 4} fontSize="2.2" fontFamily="sans-serif">
        {nombreCliente ?? 'Cliente'} — {tablero.codigo}
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
