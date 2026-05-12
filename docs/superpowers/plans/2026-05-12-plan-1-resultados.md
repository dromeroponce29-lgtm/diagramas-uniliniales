# Plan 1 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual (Tarea 13).
> Mientras esté pendiente, sirve como guía paso a paso.

**Fecha de ejecución:** _pendiente_
**Modelo Claude usado:** claude-opus-4-7 (configurable en `apps/servidor/.env`)
**Modelo OpenAI usado:** gpt-4o (configurable en `apps/servidor/.env`)

---

## Prerrequisitos antes de ejecutar

- [ ] Tener clave API válida de Anthropic.
- [ ] Tener clave API válida de OpenAI.
- [ ] Tener al menos una foto JPEG/PNG de un tablero eléctrico real, < 10 MB.
- [ ] Haber copiado `apps/servidor/.env.example` a `apps/servidor/.env` y completado las claves.

## Pasos de ejecución

1. Desde la raíz: `npm run dev`. Esperar a ver:
   - `[servidor] escuchando en http://localhost:3001`
   - `VITE vX.X.X ready in ... ms` con `Local: http://localhost:5173/`
2. Probar salud: `curl http://localhost:3001/api/salud` → `{"estado":"ok",...}`.
3. Abrir `http://localhost:5173` en el navegador.
4. Subir una foto JPEG de un tablero real.
5. Esperar 10-30 segundos. Verificar que aparece la tabla de componentes con su procedencia y confianza.
6. Probar foto de baja calidad (borrosa o a contraluz): verificar que reporta calidad "aceptable" o "mala".
7. Probar manejo de error: detener backend (Ctrl+C), intentar subir otra foto, verificar el banner rojo y el botón "Reintentar". Reiniciar backend y reintentar.

---

## Fotos probadas

| # | Descripción de la foto | N° componentes detectados | Calidad reportada | Tiempo (s) | Observaciones |
|---|------------------------|---------------------------|-------------------|------------|---------------|
| 1 | _pendiente_            |                           |                   |            |               |
| 2 |                        |                           |                   |            |               |

## Discrepancias notables entre Claude y OpenAI

Listar las discrepancias observadas (calibres distintos, marcas distintas, componentes que solo uno detectó). Esto alimenta el diseño de la UI de "resolución de discrepancias" del Plan 2.

- _pendiente_

## Tiempos de procesamiento

- Foto 1: _pendiente_ s
- Foto 2: _pendiente_ s

## Calidad subjetiva del prompt

¿Los agentes respetaron la regla "no asumir nada"? ¿Inventaron algún valor?

- _pendiente_

## Hallazgos / ajustes para Plan 2

Notas sobre lo que el Plan 2 debe priorizar a partir de lo observado:

- _pendiente_

---

## Estado de los criterios de aceptación

- [ ] `npm run dev` arranca frontend y backend sin errores.
- [x] `npm test` ejecuta los 10 tests y todos pasan. (Verificado durante el desarrollo.)
- [ ] El usuario puede subir una foto y ver la tabla de componentes.
- [ ] Procedencia y confianza visibles por componente.
- [ ] Discrepancias entre agentes resaltadas en rojo.
- [ ] Manejo de error visible si una API falla.
