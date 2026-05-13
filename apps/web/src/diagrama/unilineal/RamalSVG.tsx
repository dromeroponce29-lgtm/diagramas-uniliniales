// SVG de un ramal: automático + diferencial asociado opcional + conductor + etiqueta del circuito.
import type { NodoRamal } from './construir-arbol.js';

interface Props {
  ramal: NodoRamal;
  x: number;
  yBarra: number;
  yFin: number;
  onClick?: (id: string) => void;
}

export function RamalSVG({ ramal, x, yBarra, yFin, onClick }: Props) {
  const a = ramal.proteccion;
  const dif = ramal.diferencialAsociado;
  const c = ramal.circuito;

  const yAutomatico = yBarra + 30;
  const yDif = dif ? yAutomatico + 50 : yAutomatico;
  const yCondInicio = yDif + 15;

  return (
    <g>
      <line x1={x} y1={yBarra} x2={x} y2={yCondInicio} stroke="black" strokeWidth="1.5" />

      <g transform={`translate(${x}, ${yAutomatico})`} onClick={() => onClick?.(a.id)} style={{ cursor: onClick ? 'pointer' : undefined }}>
        <rect x="-15" y="-10" width="30" height="20" fill="white" stroke="black" strokeWidth="1.5" />
        <line x1="-10" y1="-7" x2="-4" y2="7" stroke="black" strokeWidth="1.5" />
        <text x="20" y="0" fontSize="9" fontFamily="sans-serif">
          {a.calibreA ?? '?'}A {a.curva ?? ''}
        </text>
        <text x="20" y="10" fontSize="8" fill="#666">
          {a.polos ?? 1}P{a.capacidadCortocircuitoKA ? ` · ${a.capacidadCortocircuitoKA}kA` : ''}
        </text>
      </g>

      {dif && (
        <g transform={`translate(${x}, ${yDif})`}>
          <rect x="-15" y="-10" width="30" height="20" fill="white" stroke="black" strokeWidth="1.5" />
          <text x="0" y="2" textAnchor="middle" fontSize="9">Δ</text>
          <text x="20" y="0" fontSize="9" fontFamily="sans-serif">
            {dif.sensibilidadMA ?? '?'}mA
          </text>
        </g>
      )}

      <line x1={x} y1={yCondInicio} x2={x} y2={yFin} stroke="black" strokeWidth="1" />
      {c && (
        <g transform={`translate(${x + 8}, ${(yCondInicio + yFin) / 2})`}>
          <text fontSize="9" fontFamily="sans-serif">
            C{c.numero}: {c.destino === 'pendiente' || !c.destino ? '—' : c.destino}
          </text>
          <text fontSize="8" y="11" fill="#666">
            {c.seccionConductorMM2 ?? '—'} mm²
            {c.longitudM ? ` · ${c.longitudM} m` : ''}
            {c.canalizacionTipo ? ` · ${c.canalizacionTipo}` : ''}
          </text>
        </g>
      )}

      <line x1={x - 5} y1={yFin} x2={x + 5} y2={yFin} stroke="black" strokeWidth="1.5" />
    </g>
  );
}
