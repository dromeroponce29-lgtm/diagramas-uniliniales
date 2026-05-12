interface Props { x: number; y: number; }

// Símbolo estándar de tierra: tres líneas horizontales decrecientes.
export function Tierra({ x, y }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-tierra">
      <line x1="6" y1="0" x2="6" y2="6" stroke="black" strokeWidth="0.5" />
      <line x1="2" y1="6" x2="10" y2="6" stroke="black" strokeWidth="0.8" />
      <line x1="3.5" y1="8.5" x2="8.5" y2="8.5" stroke="black" strokeWidth="0.5" />
      <line x1="5" y1="11" x2="7" y2="11" stroke="black" strokeWidth="0.5" />
    </g>
  );
}
