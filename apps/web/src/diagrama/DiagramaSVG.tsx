// Lienzo SVG del diagrama unilineal RIC N°18, ensamblado desde el árbol unilineal.
import { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Tablero, Cliente } from '@tipos/modelo';
import { construirArbolUnilineal } from './unilineal/construir-arbol.js';
import { Acometida } from './unilineal/Acometida.js';
import { Medidor } from './unilineal/Medidor.js';
import { AlimentadorEntradaSVG } from './unilineal/AlimentadorEntradaSVG.js';
import { InterruptorGeneralSVG } from './unilineal/InterruptorGeneralSVG.js';
import { BarrasSVG } from './unilineal/BarrasSVG.js';
import { RamalSVG } from './unilineal/RamalSVG.js';
import { PuestaATierraSVG } from './unilineal/PuestaATierraSVG.js';

interface Props {
  tablero: Tablero;
  nombreCliente?: string;
  cliente?: Cliente;
  onClicComponente: (id: string | null) => void;
}

export function DiagramaSVG({ tablero, onClicComponente }: Props) {
  const arbol = useMemo(() => construirArbolUnilineal(tablero), [tablero]);

  // Layout vertical simple. Coordenadas en píxeles SVG.
  const xCentro = 400;
  const yAcometida = 30;
  const yMedidor = arbol.tieneMedidor ? 110 : null;
  const yIG = (yMedidor ?? yAcometida) + 90;
  const yBarra = yIG + 60;
  const yBarraTierra = yBarra + 24;
  const espacioRamal = 110;
  const totalRamales = Math.max(arbol.ramales.length, 1);
  const xRamalInicio = xCentro - ((totalRamales - 1) * espacioRamal) / 2;
  const xBarraInicio = Math.min(xCentro - 60, xRamalInicio - 20);
  const xBarraFin = Math.max(xCentro + 60, xRamalInicio + (totalRamales - 1) * espacioRamal + 20);
  const yFinCircuito = yBarra + 220;
  const yTierra = yBarraTierra + 260;
  const altoSVG = yTierra + 80;
  const anchoSVG = xBarraFin + 200;

  return (
    <TransformWrapper minScale={0.3} maxScale={3} initialScale={0.8} centerOnInit>
      <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
        <svg width={anchoSVG} height={altoSVG} viewBox={`0 0 ${anchoSVG} ${altoSVG}`} fontFamily="sans-serif">
          <Acometida
            acometida={arbol.acometida}
            tensionSistema={arbol.tensionSistema}
            frecuenciaHz={arbol.frecuenciaHz}
            x={xCentro}
            y={yAcometida}
          />

          {arbol.tieneMedidor && yMedidor !== null && (
            <Medidor x={xCentro} y={yMedidor} />
          )}

          <AlimentadorEntradaSVG
            alimentador={arbol.alimentadorEntrada}
            x={xCentro}
            yInicio={(yMedidor ?? yAcometida) + 30}
            yFin={yIG - 20}
          />

          {arbol.ig && (
            <InterruptorGeneralSVG
              ig={arbol.ig}
              x={xCentro}
              y={yIG}
              onClick={() => onClicComponente(arbol.ig!.id)}
            />
          )}

          {/* Conexión IG → barra */}
          <line x1={xCentro} y1={yIG + 20} x2={xCentro} y2={yBarra} stroke="black" strokeWidth="2" />

          <BarrasSVG
            xInicio={xBarraInicio}
            xFin={xBarraFin}
            y={yBarra}
            tieneFase={arbol.barras.tieneFase || true}
            tieneNeutro={arbol.barras.tieneNeutro || true}
            tieneTierra={arbol.barras.tieneTierra || true}
            trifasico={arbol.tensionSistema === '380V-trif' || arbol.tensionSistema === '380V/220V-trif-n'}
            tierra={arbol.tierra}
          />

          {/* DPS en paralelo a la barra */}
          {arbol.protecciones.dps.map((d, i) => (
            <g key={d.id} transform={`translate(${xBarraInicio - 60 - i * 50}, ${yBarra})`}>
              <line x1="0" y1="0" x2="60" y2="0" stroke="black" strokeWidth="1" />
              <rect x="-20" y="-20" width="20" height="20" fill="white" stroke="black" strokeWidth="1.5" />
              <text x="-10" y="-3" textAnchor="middle" fontSize="9">DPS</text>
              <line x1="-10" y1="-3" x2="-10" y2="3" stroke="black" strokeWidth="1" />
              <polygon points="-13,3 -7,3 -10,8" fill="black" />
            </g>
          ))}

          {arbol.ramales.map((r, i) => (
            <RamalSVG
              key={r.proteccion.id}
              ramal={r}
              x={xRamalInicio + i * espacioRamal}
              yBarra={yBarraTierra}
              yFin={yFinCircuito}
              onClick={onClicComponente}
            />
          ))}

          <PuestaATierraSVG tierra={arbol.tierra} x={xBarraInicio - 30} y={yTierra} />
        </svg>
      </TransformComponent>
    </TransformWrapper>
  );
}
