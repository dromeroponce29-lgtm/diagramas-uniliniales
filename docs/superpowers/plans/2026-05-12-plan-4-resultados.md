# Plan 4 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual del Plan 4.
> Requiere backend + frontend corriendo y al menos un tablero con componentes detectados.

**Fecha:** _pendiente_

---

## Pasos de ejecución

1. `npm run dev` — backend y frontend.
2. Abrir `http://localhost:5173` (o el puerto que muestre Vite).
3. Abrir un tablero existente o crear uno nuevo y subir fotos.
4. Recorrer la verificación de abajo.

---

## Tabla de circuitos
- [ ] La pestaña "Circuitos" del panel central muestra una fila por cada automático detectado.
- [ ] Editar el destino, uso y sección de un circuito persiste al recargar.
- [ ] Agregar/eliminar circuitos funciona.

## Análisis RIC — Hallazgos
- [ ] El panel inferior derecho muestra "Análisis RIC" en lugar del placeholder anterior.
- [ ] Aparecen al menos las 6 reglas de nivel tablero (IG, diferencial, DPS, barras separadas, reserva mínima, selectividad).
- [ ] Cada hallazgo no-cumple/pendiente-verificar tiene los tres botones (No aplica / →Terreno / Nota).
- [ ] Silenciar un hallazgo con justificación lo tacha y lo manda al final.
- [ ] Recargar el navegador preserva las anotaciones.

## Análisis RIC — Levantamientos en terreno
- [ ] La pestaña muestra al menos los hallazgos pendiente-verificar.
- [ ] Si hay pendientes con resoluble=medicion-terreno (de Plan 2), también aparecen.
- [ ] Convertir un hallazgo en levantamiento-terreno lo agrega a esta lista.

## Datos manuales
- [ ] Ingresar "Espacios totales del tablero" en el panel de datos cambia la regla reserva-minima de pendiente-verificar a cumple/no-cumple.
- [ ] Cambiar esquemaTierra a "TT" hace que la regla de barras separadas evalúe en función de los componentes.

## Barra superior
- [ ] El contador "X hallazgos RIC sin resolver · Y levantamientos terreno" se actualiza en vivo al editar.

## Fotos / tableros probados

| # | Descripción | Reglas no-cumple | Reglas pendiente-verificar | Observaciones |
|---|-------------|------------------|----------------------------|---------------|
| 1 | _pendiente_ |                  |                            |               |

## Hallazgos para Plan 5
- _pendiente_

---

## Criterios de aceptación del Plan 4

- [ ] `npm test` ejecuta ~115 tests, todos pasan.
- [ ] El workspace muestra el panel "Análisis RIC" con sus dos tabs.
- [ ] La tabla de circuitos permite crear/editar/borrar filas.
- [ ] Las 9 reglas devuelven `cumple` / `no-cumple` / `pendiente-verificar` correctamente.
- [ ] Acciones sobre hallazgos persisten en disco y sobreviven a F5.
- [ ] El contador de la barra superior se actualiza en vivo.
- [ ] Refrescar el navegador preserva circuitos + anotaciones.
