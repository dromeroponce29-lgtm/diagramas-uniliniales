// Símbolo SVG del medidor de energía (kWh).
interface Props {
  x: number;
  y: number;
}

export function Medidor({ x, y }: Props) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="18" fill="white" stroke="black" strokeWidth="1.5" />
      <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif">kWh</text>
    </g>
  );
}
