import { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Tablero } from '@tipos/modelo';
import { calcularLayout } from './layout/calcular.js';
import { sugerirTamanoPagina, DIMENSIONES_MM } from './layout/tamanoPagina.js';
import { SimboloIEC } from './simbolos/index.js';
import { CuadroRotulacion } from './CuadroRotulacion.js';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  // Cuando el usuario hace clic en un componente del diagrama, se notifica al
  // exterior con el id — el panel central puede hacer scroll/highlight.
  onClicComponente?(id: string): void;
}

export function DiagramaSVG({ tablero, nombreCliente, onClicComponente }: Props) {
  const layout = useMemo(() => calcularLayout(tablero), [tablero]);

  const numRamas = layout.nodos.filter(n => n.capa === 'rama').length;
  const tamano = sugerirTamanoPagina(numRamas);
  const pagina = DIMENSIONES_MM[tamano];

  // Cuadro de rotulación: esquina inferior derecha.
  const cuadroAncho = 80;
  const cuadroAlto = 25;
  const cuadroX = pagina.ancho - cuadroAncho - 5;
  const cuadroY = pagina.alto - cuadroAlto - 5;

  return (
    <div className="relative w-full h-full bg-slate-100 rounded overflow-hidden">
      <div className="absolute top-2 left-2 z-10 bg-white px-2 py-1 rounded text-xs shadow">
        Tamaño sugerido: <strong>{tamano}</strong> · {numRamas} rama{numRamas === 1 ? '' : 's'}
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <svg
            viewBox={`0 0 ${pagina.ancho} ${pagina.alto}`}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-white"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Marco de la página */}
            <rect x="0" y="0" width={pagina.ancho} height={pagina.alto} fill="white" stroke="#cbd5e1" strokeWidth="0.3" />

            {/* Enlaces (líneas) primero, debajo de los símbolos */}
            {layout.enlaces.map((e, i) => (
              <line
                key={i}
                x1={e.desde.x}
                y1={e.desde.y}
                x2={e.hasta.x}
                y2={e.hasta.y}
                stroke="black"
                strokeWidth={e.tipo === 'principal' ? 0.6 : 0.4}
              />
            ))}

            {/* Símbolos con resaltado por confianza */}
            {layout.nodos.map(n => {
              const conf = n.componente.procedencia.confianza;
              const claseResaltado =
                conf === 'discrepancia' ? 'stroke-red-600' :
                conf === 'baja' ? 'stroke-orange-500' :
                '';
              const dasharray = conf === 'baja' ? '1.5,1' : undefined;

              return (
                <g
                  key={n.id}
                  className={`cursor-pointer ${claseResaltado}`}
                  style={{ strokeDasharray: dasharray }}
                  onClick={() => onClicComponente?.(n.id)}
                >
                  <SimboloIEC x={n.x} y={n.y} ancho={n.ancho} componente={n.componente} />
                  {conf === 'discrepancia' && (
                    <text x={n.x + n.ancho} y={n.y - 1} fontSize="2.5" fill="red">⚠</text>
                  )}
                </g>
              );
            })}

            {/* Cuadro de rotulación */}
            <CuadroRotulacion
              tablero={tablero}
              nombreCliente={nombreCliente}
              x={cuadroX}
              y={cuadroY}
              ancho={cuadroAncho}
              alto={cuadroAlto}
            />
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
