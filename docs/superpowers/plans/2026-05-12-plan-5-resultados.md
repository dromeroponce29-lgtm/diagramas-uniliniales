# Plan 5 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual del Plan 5.

**Fecha:** _pendiente_

---

## Pasos

1. `npm run dev` — backend y frontend.
2. Abrir un tablero existente o crear uno nuevo.
3. Recorrer cada tab y validar lo siguiente.

---

## Tabs y navegación
- [ ] Las 4 tabs aparecen en el header (Datos generales · Fotos y componentes · Diagrama · Análisis RIC).
- [ ] Cambiar tabs actualiza el query param `?tab=`.
- [ ] Refrescar el navegador en cualquier tab conserva la tab activa.
- [ ] Default (sin `?tab=`) es "Fotos y componentes".

## Tab "Datos generales"
- [ ] Las 6 secciones aparecen (Datos eléctricos, Acometida, Alimentador de entrada, Puesta a tierra, Viñeta, Notas generales).
- [ ] Cada formulario guarda al hacer clic en su botón.
- [ ] Recargar el navegador preserva todo.
- [ ] La viñeta muestra los datos heredados del cliente cuando los campos del tablero están vacíos.

## Tab "Fotos y componentes"
- [ ] Misma funcionalidad que en Plan 4 (subir fotos, ver componentes, ver circuitos, ver pendientes).
- [ ] PanelPendientes ya no muestra los inputs de tensión/esquema/potencia/corriente/espacios (esos migraron al tab Datos generales).

## Tab "Diagrama"
- [ ] Se muestra el bloque de notas con tensión, frecuencia, esquema, resistencia, normativa.
- [ ] El diagrama unilineal incluye: acometida, medidor (si aplica), alimentador con etiqueta, IG con polos/curva/Icu/marca, barras (fase + neutro + tierra), DPS si existe, ramales con automático + diferencial asociado + circuito (sección/longitud/canalización/destino), terminal de tierra.
- [ ] Cuadro de cargas tiene 1 fila por circuito con todos los campos RIC.
- [ ] Cuadro resumen de alimentadores muestra acometida → tablero con sección, longitud, canalización, capacidad, In, Icu, curva.
- [ ] Cuadro de simbología lista los tipos presentes con sus símbolos IEC.
- [ ] Viñeta muestra proyecto/propietario/instalador/lámina con fallback a datos del cliente.

## Tab "Análisis RIC"
- [ ] Cuando el tablero está vacío (recién creado), muestra empty-state con CTA a tabs.
- [ ] En cuanto se agrega un dato (componente, foto, o campo manual), vuelve a mostrar la lista de hallazgos como en Plan 4.
- [ ] Las acciones (no aplica, →terreno, nota) siguen funcionando como en Plan 4.

## Barra superior
- [ ] Muestra mensaje "Tablero sin datos" cuando el tablero está vacío.
- [ ] Cuando tiene datos, muestra los contadores RIC habituales.

## Fotos / tableros probados

| # | Descripción | Tabs probadas | Observaciones |
|---|-------------|---------------|---------------|
| 1 | _pendiente_ |               |               |

## Hallazgos para Plan 6 / 7
- _pendiente_

---

## Criterios de aceptación del Plan 5

- [ ] `npm test` ejecuta ~160 tests, todos pasan.
- [ ] El workspace está dividido en 4 tabs horizontales con URL deep-linkable.
- [ ] Tab "Análisis RIC" muestra empty-state cuando el tablero está vacío.
- [ ] Tab "Datos generales" permite editar todos los campos nuevos (acometida, alimentador, tierra, viñeta, notas).
- [ ] Tab "Diagrama" muestra el unilineal con acometida → última protección, cuadros normativos y viñeta.
- [ ] Refrescar el navegador preserva la tab activa y todos los datos nuevos.
