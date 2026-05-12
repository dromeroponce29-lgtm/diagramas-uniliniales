# Plan 2 — Resultados de la verificación E2E

> Plantilla para completar después de ejecutar la verificación manual (Tarea 17 del Plan 2).
> Requiere claves API reales (Anthropic + OpenAI) y al menos una foto JPEG/PNG de un tablero.

**Fecha de ejecución:** _pendiente_

---

## Prerrequisitos

- [ ] `apps/servidor/.env` configurado con `ANTHROPIC_API_KEY` y `OPENAI_API_KEY` válidas.
- [ ] Carpeta `proyectos/` limpia o eliminada (`rm -rf proyectos/`) para empezar desde cero.
- [ ] Al menos una foto JPEG de tablero eléctrico real, < 10 MB.

## Pasos de ejecución

1. **Arrancar todo:** desde la raíz, `npm run dev`. Esperar a ver:
   - `[servidor] escuchando en http://localhost:3001`
   - `VITE vX.X.X ready in ... ms` con `Local: http://localhost:5173/`
2. **Probar salud:** `curl http://localhost:3001/api/salud` → `{"estado":"ok",...}`
3. **Crear cliente:** abrir `http://localhost:5173`, "+ Nuevo cliente", llenar nombre y guardar.
4. **Crear tablero:** clic en "+ Agregar tablero" del cliente recién creado. Llenar código (ej. "TG"), nombre, tipo. Crear.
5. **Subir foto del tablero:** desde el panel de fotos en el workspace, seleccionar la foto. Esperar el procesamiento (10-30s).
6. **Verificar resultado:** el panel central debe llenarse con los componentes detectados; cada uno con su procedencia y confianza.
7. **Resolver una discrepancia** (si hay alguna): clic en "Resolver", elegir una lectura.
8. **Completar datos manuales:** en el panel inferior izquierdo elegir tensión, esquema tierra, llenar potencia y corriente. Guardar.
9. **Refrescar el navegador (F5):** todo debe persistir.
10. **Inspeccionar el sistema de archivos:** `ls -la proyectos/` debería mostrar la estructura `<slug-cliente>/cliente.json` + `tableros/<slug-tablero>/...`.

---

## Resultados de la prueba

### Flujo cliente → tablero → foto → completitud

- [ ] Crear cliente desde UI funcionó
- [ ] Crear tablero desde UI funcionó
- [ ] Subir foto procesó con ambos agentes y persistió en disco
- [ ] Componentes aparecieron en el panel central con procedencia y confianza
- [ ] Refrescar el navegador preservó el estado
- [ ] Estructura de carpetas en disco coincide con la del spec

### Fotos probadas

| # | Descripción | N° componentes | Calidad | Tiempo (s) | Discrepancias | Observaciones |
|---|-------------|----------------|---------|------------|---------------|---------------|
| 1 | _pendiente_ |                |         |            |               |               |

### Resolución de discrepancias

- [ ] Botón "Resolver" funcionó
- [ ] Después de resolver, la confianza pasó a "alta" con fuente "manual"
- [ ] La completitud subió

### Datos manuales del tablero

- [ ] Tensión, esquema tierra, potencia, corriente se guardaron
- [ ] La barra de completitud subió al guardar
- [ ] Refrescar preservó los datos

### Cosas que no funcionaron / hallazgos para Plan 3

- _pendiente_

---

## Estado de los criterios de aceptación del Plan 2

- [x] `npm test` ejecuta 49 tests y todos pasan. (Verificado en desarrollo.)
- [ ] El usuario puede crear, listar, editar y eliminar clientes desde la UI.
- [ ] El usuario puede crear tableros dentro de un cliente.
- [ ] La subida de fotos persiste tanto la foto como las extracciones crudas y reconciliadas en disco.
- [ ] El panel central muestra los componentes detectados y permite resolver discrepancias.
- [ ] El panel inferior izquierdo permite completar datos no observables del tablero.
- [ ] La barra superior muestra completitud calculada y se actualiza en vivo.
- [ ] Refrescar el navegador no pierde datos.
- [ ] Los datos en disco coinciden con la estructura del spec sección 3.7.
