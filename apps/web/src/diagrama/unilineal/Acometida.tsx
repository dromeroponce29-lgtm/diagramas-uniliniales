// Símbolo SVG de la acometida (entrada de energía al tablero).
// En sistemas trifásicos dibuja 3 líneas paralelas (R, S, T) + neutro.
import type { DatosAcometida, TensionSistema } from '@tipos/modelo';

interface Props {
  acometida: DatosAcometida;
  tensionSistema: TensionSistema;
  frecuenciaHz: number;
  x: number;
  y: number;
}

function esTrifasica(t: TensionSistema): boolean {
  return t === '380V-trif' || t === '380V/220V-trif-n';
}

function tieneNeutro(t: TensionSistema): boolean {
  return t === '380V/220V-trif-n' || t === '220V-mono';
}

export function Acometida({ acometida, tensionSistema, frecuenciaHz, x, y }: Props) {
  const trif = esTrifasica(tensionSistema);
  const conN = tieneNeutro(tensionSistema);

  // Para trifásico, dibujamos 3 líneas paralelas con separación de 4 px + N a un costado.
  const lineas: Array<{ dx: number; color: string; label: string }> = trif
    ? [
        { dx: -6, color: 'black',   label: 'R' },
        { dx: -2, color: '#7f1d1d', label: 'S' },
        { dx:  2, color: '#475569', label: 'T' }
      ]
    : [{ dx: 0, color: 'black', label: 'F' }];

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Conductores activos */}
      {lineas.map(l => (
        <g key={l.label}>
          <line x1={l.dx} y1="0" x2={l.dx} y2="40" stroke={l.color} strokeWidth="2" />
          <polygon points={`${l.dx - 3},35 ${l.dx + 3},35 ${l.dx},45`} fill={l.color} />
          <text x={l.dx} y="-2" fontSize="6" textAnchor="middle" fill={l.color}>{l.label}</text>
        </g>
      ))}
      {/* Neutro */}
      {conN && (
        <g>
          <line x1={trif ? 6 : 4} y1="0" x2={trif ? 6 : 4} y2="40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x={trif ? 6 : 4} y="-2" fontSize="6" textAnchor="middle" fill="#3b82f6">N</text>
        </g>
      )}
      <text x="15" y="15" fontSize="11" fill="black" fontFamily="sans-serif">
        ACOMETIDA {acometida.tipo !== 'pendiente' ? `(${acometida.tipo})` : ''}
      </text>
      <text x="15" y="30" fontSize="9" fill="#666">
        {tensionSistema !== 'pendiente' ? tensionSistema : '—'} · {frecuenciaHz} Hz {trif ? '· trifásico' : '· monofásico'}
      </text>
    </g>
  );
}
