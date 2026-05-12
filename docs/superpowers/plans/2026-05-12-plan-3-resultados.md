# Plan 3 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual (Tarea 11 del Plan 3).
> Requiere backend + frontend corriendo y un tablero con componentes.

**Fecha:** _pendiente_

---

## Pasos de ejecución

1. `npm run dev` — backend y frontend.
2. Abrir Simple Browser (o navegador externo) en `http://localhost:5173`.
3. Usar un tablero existente (con componentes ya cargados desde Plan 2) o crear uno nuevo y subirle fotos.
4. Recorrer la verificación de abajo.

---

## Visualización
- [ ] El diagrama SVG aparece donde antes había el placeholder gris
- [ ] El encabezado superior izquierdo muestra "Tamaño sugerido: A4" o A3
- [ ] El cuadro de rotulación aparece en la esquina inferior derecha con código del tablero, tensión, esquema tierra y fecha
- [ ] Símbolos IEC se ven correctamente para cada tipo:
  - [ ] Interruptor general: rectángulo grande con "IG" y calibre
  - [ ] Diferencial: rectángulo con Δ y sensibilidad
  - [ ] Automáticos: rectángulo con barra inclinada y calibre/polos
  - [ ] Barras: líneas horizontales (gris/azul/verde según tipo)
  - [ ] DPS: rectángulo con flecha hacia abajo
  - [ ] Medidor: círculo con "kWh"

## Resaltado de estado
- [ ] Componentes con `procedencia.confianza === 'discrepancia'` se ven con borde rojo + ⚠
- [ ] Componentes con `confianza === 'baja'` se ven con borde naranja punteado

## Interacción
- [ ] Clic en un componente del diagrama resalta su fila en el panel central (fondo azul)
- [ ] Zoom con rueda del mouse funciona
- [ ] Pan arrastrando funciona

## Layout
- [ ] Hasta 12 ramas → indicador muestra "A4"
- [ ] 13+ ramas → indicador cambia a "A3"
- [ ] Ningún traslape visible entre símbolos
- [ ] Las líneas de conexión (principal → barra → ramas) son visibles y conectan correctamente

## Fotos probadas

| # | Descripción | N° componentes | Tipo de hallazgo | Observaciones del diagrama |
|---|-------------|----------------|------------------|----------------------------|
| 1 | _pendiente_ |                |                  |                            |

## Hallazgos para Plan 4

- _pendiente_

---

## Criterios de aceptación del Plan 3

- [x] `npm test` ejecuta 60+ tests (49 servidor + 11 web), todos pasan. (Verificado en desarrollo.)
- [ ] Diagrama SVG real reemplaza placeholder
- [ ] Símbolos IEC reconocibles para los 8 tipos cubiertos
- [ ] Layout determinístico
- [ ] Zoom y pan funcionan
- [ ] Discrepancias y baja confianza marcadas visualmente
- [ ] Clic-a-resaltar bidireccional entre diagrama y panel central
- [ ] Indicador A4/A3 cambia según número de ramas
