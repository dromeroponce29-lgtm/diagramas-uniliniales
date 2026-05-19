# Arquitectura — Análisis y Estudio de Proyectos Eléctricos (AEP)

Documento maestro de la arquitectura profesional completa de la aplicación. Esta es la implementación de producción del prototipo `index.html`.

---

## 1. Objetivo

Convertir antecedentes técnicos heterogéneos (planos PDF/DXF, planillas Excel, bases técnicas, catálogos, fotografías) en entregables eléctricos completos, trazables, editables y exportables, conforme a la normativa chilena RIC SEC.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | HTML + JS puro + Vite (opcional) | Sin build, carga instantánea, mantenible |
| Backend | Python 3.11 + FastAPI | Async, type-safe, swagger automático |
| Base de datos | PostgreSQL 16 + pgvector | Relacional + vectorial en un solo motor |
| ORM | SQLAlchemy 2 + Alembic | Migraciones declarativas |
| LLM | Anthropic Claude (Sonnet 4.5) | Mejor para razonamiento técnico estructurado |
| Embeddings | Voyage AI (voyage-3-large) | Calidad superior para español técnico |
| Procesamiento PDF | pdfplumber + pdf2image + Tesseract | Texto + tablas + OCR para escaneados |
| Procesamiento DXF | ezdxf | Lectura completa de capas, bloques, entidades |
| Procesamiento Excel | openpyxl + pandas | Lectura con tipos y fórmulas |
| Procesamiento Word | python-docx + mammoth | Texto + estructura |
| Exportadores | openpyxl, reportlab, python-docx | Salidas profesionales |
| Orquestación | Celery + Redis | Tareas largas (OCR, embeddings) |
| Containerización | Docker + docker-compose | Despliegue reproducible |

---

## 3. Diagrama de componentes

```
+--------------------------------------------------------------+
|                         FRONTEND                             |
|  index.html  (SPA single-file · 15 módulos)                  |
|  ↓ fetch  /api/*                                             |
+--------------------------------------------------------------+
                          ⇅ REST (JSON, multipart)
+--------------------------------------------------------------+
|                    BACKEND — FastAPI                         |
|                                                              |
|  api/                                                        |
|    ├── upload.py        POST /api/upload                     |
|    ├── projects.py      CRUD proyectos                       |
|    ├── documents.py     listado y procesamiento              |
|    ├── cubicacion.py    CRUD + agente IA                     |
|    ├── presupuesto.py   cálculo                              |
|    ├── chat.py          /api/chat (proxy Claude)             |
|    ├── exports.py       XLSX, PDF, DOCX                      |
|    └── rag.py           búsqueda semántica                   |
|                                                              |
|  parsers/                                                    |
|    ├── pdf_parser.py    pdfplumber + OCR fallback            |
|    ├── dxf_parser.py    ezdxf + extractor cantidades         |
|    ├── xlsx_parser.py   openpyxl + pandas                    |
|    └── docx_parser.py   python-docx                          |
|                                                              |
|  agents/                                                     |
|    ├── lector_planos.py                                      |
|    ├── cubicador.py                                          |
|    ├── normativo.py                                          |
|    ├── presupuestador.py                                     |
|    ├── especificaciones.py                                   |
|    ├── catalogos.py                                          |
|    ├── revisor.py                                            |
|    ├── alternativas.py                                       |
|    └── orquestador.py                                        |
|                                                              |
|  rag/                                                        |
|    ├── chunker.py       partición de documentos              |
|    ├── embedder.py      Voyage AI                            |
|    └── retriever.py     búsqueda vectorial + reranking       |
|                                                              |
|  workers/  (Celery)                                          |
|    ├── procesar_doc.py  parser + chunk + embed               |
|    └── ocr.py           OCR pesado fuera del request         |
|                                                              |
|  models/    (SQLAlchemy)                                     |
|  schemas/   (Pydantic)                                       |
|  exporters/ (XLSX/PDF/DOCX)                                  |
+--------------------------------------------------------------+
        ⇅                              ⇅
+------------------+        +-------------------+
| PostgreSQL 16    |        |  Redis (broker)   |
|  + pgvector      |        |  Celery tasks     |
+------------------+        +-------------------+
        ⇅
+------------------+
| Anthropic Claude | (HTTPS)
+------------------+
+------------------+
| Voyage AI Embed. | (HTTPS)
+------------------+
```

---

## 4. Flujo de procesamiento de documentos

```
1. Usuario sube archivo  ──→  POST /api/upload (multipart)
   ↓
2. Backend valida + guarda en storage/  ──→  registra Document(estado=pendiente)
   ↓
3. Encola tarea Celery: procesar_doc(doc_id)
   ↓ (asíncrono)
4. Worker carga el archivo y elige parser por mime/extension:
     PDF  → pdfplumber.text + tables  (si páginas escaneadas → Tesseract OCR)
     DXF  → ezdxf.layers + bloques + textos + polilíneas con longitudes
     XLSX → pandas.read_excel hoja por hoja, detecta columnas (Ítem/Cant/PU/...)
     DOCX → python-docx.paragraphs + tables
   ↓
5. Resultado guardado como Document.contenido_estructurado (JSONB)
   ↓
6. RAG chunker: parte el texto en chunks de ~500 tokens
   ↓
7. Embedder Voyage: genera embeddings y los persiste en Chunk(embedding VECTOR(1024))
   ↓
8. Document.estado = procesado
   ↓
9. Trigger opcional: AgenteCubicador procesa contenido + RAG y propone ítems
   ↓
10. Items propuestos quedan disponibles en /api/cubicacion?proyecto=X&estado=propuesto
    para revisión humana.
```

---

## 5. Modelo de datos relacional

```sql
-- Núcleo
proyecto(id, nombre, mandante, ubicacion, tipo, tension, potencia,
         ambiente, metodo_inst, config JSONB, created_at, updated_at)

documento(id, proyecto_id, nombre, tipo, tamano_kb, hash_sha256,
          storage_path, estado, error,
          contenido_estructurado JSONB,    -- salida del parser
          metadatos JSONB,                 -- metadatos extraídos
          uploaded_at, processed_at)

-- RAG
chunk(id, documento_id, posicion, texto, tokens,
      embedding VECTOR(1024),
      metadata JSONB)

-- Ingeniería
item_cubicacion(id, proyecto_id, partida, sistema, area, descripcion,
                unidad, cantidad, factor_perdida, precio_unitario,
                hh_unitaria, fuente, confianza, norma_ref,
                documento_id_origen,   -- trazabilidad
                pagina_origen, observacion,
                estado     -- propuesto | aprobado | rechazado
                creado_por -- agente | usuario
                created_at, updated_at)

especificacion(id, proyecto_id, partida, contenido_md, norma_ref,
               validado, validado_por, validado_at)

alternativa(id, proyecto_id, categoria, nombre, ventajas, desventajas,
            uso, costo_relativo, riesgo, materiales_complementarios JSONB)

catalogo(id, material, marca, modelo, caracteristicas, norma,
         link, equivalentes, estado, proyecto_id)

requisito_normativo(id, proyecto_id, requisito, norma_ref, articulo,
                    estado, evidencia, observacion,
                    documento_id_validacion)

riesgo(id, proyecto_id, categoria, descripcion, probabilidad,
       impacto, nivel, mitigacion, responsable)

-- Chat / Agentes
conversacion(id, proyecto_id, role, content, agent_used,
             tokens_in, tokens_out, fuentes_citadas JSONB,
             created_at)
```

---

## 6. Agentes IA

Cada agente es una clase Python con un `system_prompt` y un método `run(input, context)` que consume Claude API. Todos comparten un `BaseAgent` con:
- Inyección de contexto del proyecto.
- Recuperación RAG automática cuando el agente declara `requires_rag = True`.
- Logging estructurado por proyecto.
- Manejo de errores y retries.

### 6.1 AgenteLectorPlanos
- Entrada: contenido estructurado de PDF/DXF.
- Salida: lista de tableros, alimentadores, canalizaciones, equipos.
- Estrategia: Claude con tool_use para devolver JSON estructurado.

### 6.2 AgenteCubicador
- Entrada: contenido de documentos + lectura de planos.
- Salida: lista de `ItemCubicacion` propuestos con fuente y confianza.
- Estrategia: prompt con reglas de cubicación (siempre accesorios), few-shot con ejemplos del mercado chileno.

### 6.3 AgenteNormativoRIC
- Entrada: bases técnicas + diseño propuesto.
- Salida: matriz normativa con cumple/no cumple/validar.
- Estrategia: RAG sobre RIC SEC vigente cargado al proyecto. **No inventa artículos**: si la referencia no está en la base, marca "Requiere validación".

### 6.4 AgentePresupuestador
- Aplica precios, HH, factores. Sin LLM, lógica determinística.

### 6.5 AgenteEspecificaciones
- Entrada: partida + base técnica.
- Salida: especificación técnica en Markdown.
- Estrategia: plantilla por partida + Claude para personalizar al proyecto.

### 6.6 AgenteCatalogos
- Sugiere marca/modelo/equivalentes con citas de catálogos indexados.

### 6.7 AgenteRevisorCumplimiento
- Audita brechas entre el proyecto y las bases técnicas.

### 6.8 AgenteAlternativas
- Genera 3-6 alternativas técnicas con ventajas/desventajas/costo/riesgo.

### 6.9 Orquestador
- Coordina el flujo: lectura → cubicación → normativo → presupuesto → revisión.
- Permite encadenar agentes.

---

## 7. RAG documental

### 7.1 Indexación
Al procesar un documento:
1. Extracción de texto plano (parser).
2. Chunking semántico: segmentos de ~500 tokens con overlap de ~50.
3. Embedding con Voyage AI (`voyage-3-large`, 1024 dim).
4. Persistencia en tabla `chunk` con `VECTOR(1024)` + metadata (página, sección).

### 7.2 Recuperación
1. Pregunta del usuario → embedding.
2. Búsqueda híbrida: top-k vectorial (k=20) + BM25 sobre `chunk.texto`.
3. Reranking con Claude Haiku (top-5 final).
4. Inyección al prompt principal con citas: `[Documento X, p. N]`.

### 7.3 Trazabilidad
Cada respuesta del asistente IA cita los chunks que usó. Los chunks llevan a la página del documento original.

---

## 8. API REST (endpoints clave)

```
GET    /api/health
POST   /api/projects                    crear proyecto
GET    /api/projects/{id}               obtener
PUT    /api/projects/{id}               actualizar
DELETE /api/projects/{id}

POST   /api/projects/{id}/documents     subir documento (multipart)
GET    /api/projects/{id}/documents     listar
GET    /api/documents/{id}              detalle
POST   /api/documents/{id}/process      reprocesar
DELETE /api/documents/{id}

GET    /api/projects/{id}/cubicacion    listar items
POST   /api/projects/{id}/cubicacion    crear item
POST   /api/projects/{id}/cubicacion/agent  ejecutar AgenteCubicador
PUT    /api/cubicacion/{id}
DELETE /api/cubicacion/{id}

GET    /api/projects/{id}/presupuesto   resumen
POST   /api/projects/{id}/presupuesto/recalcular

POST   /api/projects/{id}/normativa/audit ejecutar AgenteNormativoRIC

POST   /api/projects/{id}/chat          chat IA (proxy Claude)
GET    /api/projects/{id}/chat/history

POST   /api/projects/{id}/export/xlsx   cubicación + presupuesto
POST   /api/projects/{id}/export/pdf    informe técnico
POST   /api/projects/{id}/export/docx   especificaciones
GET    /api/projects/{id}/export/{job_id}/status

GET    /api/projects/{id}/rag/search?q= búsqueda semántica
```

Documentación interactiva automática en `/docs` (Swagger UI).

---

## 9. Estructura de archivos

```
/
├── index.html                          (frontend single-file)
├── ARQUITECTURA.md                     (este documento)
├── README.md                           (instrucciones de uso)
├── docker-compose.yml                  (orquestación local)
├── .env.example                        (variables de entorno)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── main.py                         (entrada FastAPI)
│   ├── config.py                       (settings con pydantic-settings)
│   ├── database.py                     (engine + sesiones SQLAlchemy)
│   ├── models/                         (modelos SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── proyecto.py
│   │   ├── documento.py
│   │   ├── cubicacion.py
│   │   ├── chunk.py
│   │   └── ...
│   ├── schemas/                        (Pydantic — request/response)
│   │   └── ...
│   ├── api/                            (routers FastAPI)
│   │   ├── projects.py
│   │   ├── documents.py
│   │   ├── cubicacion.py
│   │   ├── chat.py
│   │   ├── exports.py
│   │   └── rag.py
│   ├── parsers/
│   │   ├── pdf_parser.py
│   │   ├── dxf_parser.py
│   │   ├── xlsx_parser.py
│   │   └── docx_parser.py
│   ├── agents/
│   │   ├── base.py
│   │   ├── lector_planos.py
│   │   ├── cubicador.py
│   │   ├── normativo.py
│   │   ├── presupuestador.py
│   │   ├── especificaciones.py
│   │   ├── catalogos.py
│   │   ├── revisor.py
│   │   ├── alternativas.py
│   │   └── orquestador.py
│   ├── rag/
│   │   ├── chunker.py
│   │   ├── embedder.py
│   │   └── retriever.py
│   ├── exporters/
│   │   ├── xlsx_exporter.py
│   │   ├── pdf_exporter.py
│   │   └── docx_exporter.py
│   ├── workers/
│   │   ├── celery_app.py
│   │   ├── procesar_doc.py
│   │   └── ocr_task.py
│   ├── storage/                        (archivos subidos — montaje volumen)
│   └── tests/
└── docker/
    ├── postgres/
    │   └── init.sql                    (CREATE EXTENSION vector)
    └── nginx/
        └── nginx.conf                  (servir index.html + proxy /api)
```

---

## 10. Variables de entorno (.env)

```bash
# Base de datos
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=aep
POSTGRES_PASSWORD=cambiame
POSTGRES_DB=aep_electrico

# Redis (Celery)
REDIS_URL=redis://redis:6379/0

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# Voyage AI
VOYAGE_API_KEY=pa-...
VOYAGE_MODEL=voyage-3-large

# Almacenamiento
STORAGE_PATH=/app/storage

# CORS
CORS_ORIGINS=http://localhost:8080

# Logging
LOG_LEVEL=INFO
```

---

## 11. Despliegue

### Desarrollo local
```bash
cp .env.example .env
# editar .env y poner ANTHROPIC_API_KEY
docker-compose up -d
# frontend:  http://localhost:8080
# API docs:  http://localhost:8000/docs
# adminer:   http://localhost:8081  (DB)
```

### Migraciones
```bash
docker-compose exec backend alembic upgrade head
```

### Producción
- Sustituir `nginx` por un servidor estático con HTTPS (Caddy, Traefik).
- Backend detrás del proxy con autenticación (JWT o sesión).
- Postgres administrado (RDS, Cloud SQL, Crunchy).
- Storage en S3 o equivalente (boto3).
- Secrets management (AWS Secrets Manager, Vault).

---

## 12. Roadmap

| Fase | Entregable |
|---|---|
| **MVP (esta entrega)** | Backend con upload + parsers reales + AgenteCubicador + AgenteNormativo + AgenteChat + Exportadores XLSX/PDF/DOCX + frontend conectado |
| Fase 2 | RAG completo + AgenteEspecificaciones + AgenteCatalogos + AgenteAlternativas |
| Fase 3 | OCR Tesseract para PDFs escaneados + lectura simbología eléctrica (ML) en DXF |
| Fase 4 | Autenticación multi-usuario + workspace por organización + auditoría |
| Fase 5 | Integración con bases de precios de mercado chileno (web scraping legal) |
| Fase 6 | App móvil (PWA) para terreno: fotografías geolocalizadas, voice-to-text |

---

## 13. Reglas de oro implementadas

Todas estas reglas vienen del briefing original y están codificadas en los agentes:

1. **No inventar normativa**: si RIC SEC vigente no está cargado al proyecto, los artículos se marcan como "referencia general" y nunca se cita un número específico.
2. **Trazabilidad obligatoria**: cada `ItemCubicacion` tiene `documento_id_origen` + `pagina_origen` + `fuente` (plano/base/planilla/estimado/manual).
3. **Accesorios siempre incluidos**: el AgenteCubicador tiene reglas explícitas por familia:
   - Canalización → ducto + curvas + coplas + cajas + soportes + abrazaderas + prensas + fijaciones.
   - Conductor → terminales + identificación + conectores + prensaestopas + amarras + canalización asociada + pruebas.
   - Tablero → gabinete + protecciones + barras + bornes + rotulación + canaletas + peines + cableado + pruebas.
   - PAT → conductor + barra + electrodos + uniones + soldadura exotérmica + cámaras + medición + protocolo.
4. **Confianza declarada**: cada cantidad propuesta por IA tiene un `confianza` entre Alta/Media/Baja según trazabilidad y consenso de fuentes.
5. **Edición humana siempre disponible**: la IA propone, el ingeniero aprueba.
6. **Advertencias cuando faltan antecedentes**: el AgenteRevisor reporta brechas explícitas.
