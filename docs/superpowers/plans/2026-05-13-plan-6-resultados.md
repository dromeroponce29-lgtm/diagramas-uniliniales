# Plan 6 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual del Plan 6.

**Fecha:** _pendiente_

---

## Pasos previos

1. `npm test` — todos los tests pasan (~218: 182 servidor + 36 web).
2. `npm run dev` — backend y frontend.
3. Crear cliente nuevo o abrir uno existente. Crear/abrir tablero. Subir foto o agregar datos manualmente para que haya hallazgos `no-cumple`.

---

## Catálogo (`/clientes/<slug>/catalogo`)

- [ ] Al entrar por primera vez, aparece el set semilla (22 items).
- [ ] Filtro por categoría funciona.
- [ ] Búsqueda por código/descripción funciona.
- [ ] Editar un item inline (lápiz → cambiar precio → ✓) persiste y refresca la tabla.
- [ ] Eliminar un item pide confirmación y elimina.
- [ ] "+ Agregar item" crea un item nuevo.
- [ ] "Restaurar semilla" pide confirmación y restaura.
- [ ] Cerrar la pestaña y reabrir `/clientes/<slug>/catalogo` muestra los cambios persistidos.
- [ ] El link "Catálogo →" aparece en la lista de clientes para cada cliente.

## Plan de normalización (`PanelAnalisisRIC` + `/.../planes/<id>`)

- [ ] En el tab "Análisis RIC" del workspace aparece la sección "Planes de normalización (0)" con CTA "+ Nuevo plan".
- [ ] Hacer clic en "+ Nuevo plan" crea un plan y navega al detalle.
- [ ] El plan recién creado tiene partidas autogeneradas desde los hallazgos `no-cumple`.
- [ ] Los precios son snapshot — cambiar el catálogo después no altera el plan.
- [ ] Editar la cantidad de una partida actualiza el total en vivo y autoguarda tras 1s.
- [ ] "+ Agregar partida" muestra dropdown del catálogo y agrega una partida nueva.
- [ ] Eliminar una partida (×) la quita y recalcula totales.
- [ ] "Re-sugerir desde hallazgos" pide confirmación y reemplaza las partidas por la receta actual.
- [ ] Cambiar el estado (borrador → enviado, etc.) persiste.
- [ ] Toggle IVA off → totales recalculan sin IVA.
- [ ] Editar notas autoguarda.
- [ ] "Eliminar plan" pide confirmación y vuelve al tablero, donde la lista refleja el plan eliminado.
- [ ] Cerrar y reabrir el navegador en `/clientes/.../planes/<id>` muestra el plan tal como quedó.

## Fotos / tableros probados

| # | Descripción | Items probados | Observaciones |
|---|-------------|----------------|---------------|
| 1 | _pendiente_ |                |               |

## Hallazgos para Plan 7 / Plan 8
- _pendiente_

---

## Criterios de aceptación del Plan 6

- [ ] `npm test` ejecuta ~218 tests, todos pasan.
- [ ] Catálogo: CRUD funciona, restaurar semilla funciona, persistencia funciona.
- [ ] Plan: se genera con partidas sugeridas, edición inline + autosave funciona, snapshot de precios verificado.
- [ ] Estado y IVA se persisten.
- [ ] Refrescar el navegador preserva todo.
