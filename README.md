# Diagramas Unilineales

Generador de **diagramas unilineales eléctricos** a partir de fotografías del tablero. Análisis automático con IA (Claude / OpenAI) según normativa **RIC SEC Chile**.

![macOS](https://img.shields.io/badge/macOS-13%2B-blue) ![Node](https://img.shields.io/badge/Node-20%2B-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ¿Qué hace?

- Sube fotos de un tablero eléctrico.
- IA extrae interruptores, calibres, circuitos derivados, voltajes.
- Genera el **diagrama unilineal** SVG + el **cuadro de carga**.
- Ejecuta una **auditoría normativa** con reglas inspiradas en el RIC Eléctrica chileno (calibre IG, viñeta, diferencial, caída de tensión, PE mínimo, etc.).
- Permite chat con un agente refinador que sugiere correcciones al diagrama.
- Genera un plan de normalización con partidas (catálogo de materiales y mano de obra) e IVA.
- Exporta a XLSX, PDF y DOCX profesionales.

## Capturas

> *(agregar capturas cuando estén disponibles)*

## Requisitos

- macOS 13+ / Linux / Windows con WSL
- **Node.js 20+** (`brew install node`)
- npm 10+
- Claves de API:
  - [Anthropic Claude](https://console.anthropic.com/) — para análisis y auditoría
  - [OpenAI](https://platform.openai.com/) — para extracción complementaria

## Instalación y arranque rápido

```bash
git clone https://github.com/<tu-usuario>/diagramas-uniliniales.git
cd diagramas-uniliniales
npm install
cp apps/servidor/.env.example apps/servidor/.env
# Editar apps/servidor/.env y pegar tus claves API
npm run dev
```

Abre http://localhost:5173 en tu navegador.

### Solo en macOS — doble clic

Tras instalar, puedes hacer doble clic en `Diagramas Unilineales.app` o en `Abrir Diagramas Unilineales.command` para lanzar la app desde Finder sin abrir Terminal.

## Arquitectura

Monorepo con npm workspaces:

```
diagramas-uniliniales/
├── apps/
│   ├── web/         # Frontend React + Vite (puerto 5173)
│   └── servidor/    # Backend Express + filesystem JSON (puerto 3001)
├── tipos/           # Tipos TypeScript compartidos
└── apps/ANALISIS Y ESTUDIO DE PROYECTOS ELECTRICOS/  # Prototipo HTML autocontenido
```

### Frontend (`apps/web`)

- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand para estado
- React Router
- React Zoom Pan Pinch para el diagrama interactivo

### Backend (`apps/servidor`)

- Express + TypeScript
- Almacenamiento basado en archivos JSON en `proyectos/<slug-cliente>/`
- Multer para subida de fotos
- Anthropic SDK + OpenAI SDK para los agentes
- Zod para validación
- Exportación: ExcelJS (XLSX), reportlab via Python (PDF), python-docx (DOCX)

### Agentes IA

- **Extracción**: Claude (Opus 4.7) y GPT-4o leen las fotos en paralelo y reconcilian el resultado.
- **Auditoría RIC**: aplica 14 reglas normativas y entrega hallazgos con cita al artículo del Reglamento de Instalaciones de Consumo.
- **Refinador**: chat conversacional para iterar correcciones del diagrama.

## Comandos

```bash
npm run dev               # Backend + Frontend en paralelo
npm run dev:web           # Solo frontend
npm run dev:servidor      # Solo backend
npm run build             # Build de producción
npm test                  # Tests
```

## Estructura del almacenamiento

Cada cliente vive en `apps/servidor/proyectos/<slug>/`:

```
proyectos/
└── montenegro/
    ├── cliente.json
    ├── catalogo.json
    └── tableros/
        └── <slug-tablero>/
            ├── tablero.json
            ├── fotos/<foto-id>.<ext>
            └── extracciones/<foto-id>-{claude,openai,reconciliado}.json
```

## Estado del proyecto

🟢 **En desarrollo activo.** Estable para uso personal/interno; en evaluación para uso comercial con clientes.

## Licencia

MIT — Daniel Romero, 2026

## Notas

- Las fotos y datos de clientes (`proyectos/`) **nunca** se versionan.
- Las claves API en `.env` **nunca** se versionan.
- El cumplimiento normativo final siempre debe ser validado por un Instalador Eléctrico Autorizado SEC.
