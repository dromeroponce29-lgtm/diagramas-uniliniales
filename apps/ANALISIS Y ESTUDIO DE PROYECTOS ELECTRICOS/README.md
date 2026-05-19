# AEP-Eléctrico — Análisis y Estudio de Proyectos Eléctricos

Sistema profesional para procesamiento automático de documentos técnicos eléctricos (planos PDF/DXF, planillas Excel, bases técnicas, catálogos) y generación de entregables (cubicación, presupuesto, especificaciones técnicas, matriz normativa) conforme a la normativa chilena RIC SEC.

## Características

- Procesamiento real de archivos: PDF (pdfplumber + OCR Tesseract), DXF (ezdxf con extracción de layers, bloques y longitudes), XLSX (pandas/openpyxl con detección automática de columnas), DOCX (python-docx con detección de secciones de bases técnicas).
- Agentes IA orquestados con Claude API: cubicador automático con accesorios complementarios, normativo RIC SEC, especificaciones técnicas, chat asistente.
- RAG documental con PostgreSQL + pgvector y embeddings Voyage AI para citas con trazabilidad.
- Exportadores profesionales XLSX (openpyxl con formato), PDF (reportlab) y DOCX (python-docx).
- Frontend SPA single-file con 15 módulos.
- Dockerizado: levantar todo con `docker-compose up`.

## Arquitectura

Ver `ARQUITECTURA.md` para el documento maestro completo.

```
Frontend (nginx)  ←→  Backend FastAPI  ←→  PostgreSQL + pgvector
                              ↓
                       Claude API (Anthropic)
                       Voyage AI (embeddings)
                              ↓
                          Redis (Celery)
```

## Instalación rápida (Docker)

Requisitos: Docker y docker-compose.

```bash
# 1. Clonar el directorio del proyecto

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Editar .env y completar al menos ANTHROPIC_API_KEY
# (VOYAGE_API_KEY es opcional — sin él, RAG cae a búsqueda por similitud)
nano .env

# 4. Levantar todos los servicios
docker-compose up -d

# 5. Verificar
curl http://localhost:8000/api/health
```

URLs disponibles:
- Frontend: http://localhost:8080
- Backend (API): http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Documentación alternativa: http://localhost:8000/redoc

## Instalación manual (sin Docker)

Útil para desarrollo y debugging.

```bash
# 1. Crear venv Python
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Instalar PostgreSQL local con pgvector
# macOS:   brew install postgresql@16 && brew install pgvector
# Ubuntu:  apt install postgresql-16 postgresql-16-pgvector

# 3. Crear base de datos
psql -U postgres -c "CREATE DATABASE aep_electrico;"
psql -U postgres -d aep_electrico -c "CREATE EXTENSION vector;"

# 4. Configurar .env con tus datos locales
cd ..
cp .env.example .env

# 5. Levantar backend
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 6. Abrir frontend en otra terminal
python -m http.server 8080
# ahora http://localhost:8080/index.html
```

## Uso

### 1. Crear proyecto
Desde el frontend: botón "Nuevo proyecto" → seleccionar tipo (Industria, Minería, etc.) → completar datos básicos.

### 2. Subir documentos
Pestaña "Carga de documentos" → arrastrar PDFs, DXF, XLSX. El backend los procesa en segundo plano. Recargar para ver el estado pasar de "Pendiente" → "Procesando" → "Procesado".

### 3. Ejecutar AgenteCubicador
Pestaña "Cubicación" → botón "🤖 Generar con IA". El agente analiza el contenido procesado y propone ítems con su fuente y nivel de confianza. Los items quedan con estado "propuesto" para que apruebes/edites.

### 4. Auditar normativa
Pestaña "Matriz normativa" → botón "🤖 Auditar con IA". El agente revisa el diseño contra las bases técnicas cargadas y propone la matriz de cumplimiento. NO inventa artículos RIC sin tener documentos cargados.

### 5. Generar especificaciones
Pestaña "Especificaciones" → seleccionar partida → botón "Generar con IA". Genera EETT lista para licitación.

### 6. Chat técnico
Pestaña "Asistente IA" → conversar con Claude. El asistente cita las fuentes documentales que usa para responder.

### 7. Exportar
Pestaña "Exportables" → un clic para descargar XLSX completo, PDF de informe técnico o DOCX de especificaciones.

## Endpoints API principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del sistema |
| POST | `/api/projects` | Crear proyecto |
| GET | `/api/projects` | Listar proyectos |
| POST | `/api/projects/{id}/documents` | Subir documento (multipart) |
| GET | `/api/projects/{id}/documents` | Listar documentos |
| POST | `/api/documents/{id}/process` | Reprocesar |
| GET | `/api/projects/{id}/cubicacion` | Listar items |
| POST | `/api/projects/{id}/cubicacion/agent` | Ejecutar AgenteCubicador |
| POST | `/api/projects/{id}/chat` | Chat IA |
| GET | `/api/projects/{id}/chat/history` | Historial chat |
| POST | `/api/projects/{id}/export/xlsx` | Exportar XLSX |
| POST | `/api/projects/{id}/export/pdf` | Exportar PDF |
| POST | `/api/projects/{id}/export/docx` | Exportar DOCX |
| GET | `/api/projects/{id}/rag/search?q=...` | Búsqueda semántica |

Documentación completa con esquemas: http://localhost:8000/docs

## Reglas de oro del sistema

1. **No inventar normativa**: si el RIC SEC vigente no está cargado, los artículos se marcan como "referencia general" y nunca se cita un número específico.
2. **Trazabilidad obligatoria**: cada ítem de cubicación guarda `documento_id_origen` + `pagina_origen` + `fuente`.
3. **Accesorios siempre incluidos**: el AgenteCubicador tiene reglas explícitas por familia (canalización, conductor, tablero, PAT).
4. **Confianza declarada** en cada cantidad propuesta por IA.
5. **Edición humana siempre disponible**: la IA propone, el ingeniero aprueba.

## Roadmap

Ver sección 12 de `ARQUITECTURA.md` para el plan completo de evolución.

## Estructura del repositorio

```
.
├── index.html                      Frontend single-file SPA
├── ARQUITECTURA.md                 Documento maestro de arquitectura
├── README.md                       Este archivo
├── docker-compose.yml              Orquestación de servicios
├── .env.example                    Variables de entorno (plantilla)
├── backend/                        Backend FastAPI
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── api/                        Routers REST
│   ├── models/                     Modelos SQLAlchemy
│   ├── schemas/                    Schemas Pydantic
│   ├── parsers/                    Parsers PDF/DXF/XLSX/DOCX
│   ├── agents/                     Agentes IA con Claude
│   ├── rag/                        Chunker + Embedder + Retriever
│   ├── exporters/                  XLSX / PDF / DOCX
│   └── storage/                    Archivos subidos (volume)
└── docker/
    ├── postgres/init.sql
    └── nginx/nginx.conf
```

## Licencia y uso

Sistema desarrollado para uso interno de ingeniería eléctrica. Validar siempre con el RIC SEC vigente y con un ingeniero responsable antes de aplicar resultados a una licitación o ejecución de obra.
