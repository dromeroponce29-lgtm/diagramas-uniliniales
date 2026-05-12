interface Props { x: number; y: number; }

// Medidor: círculo con "kWh".
export function Medidor({ x, y }: Props) {
  return (
    <g transform={`translate(${x},${y})`} className="simbolo simbolo-medidor">
      <circle cx="6" cy="6" r="6" fill="white" stroke="black" strokeWidth="0.5" />
      <text x="6" y="7" fontSize="2.5" fontFamily="sans-serif" textAnchor="middle">kWh</text>
    </g>
  );
}
