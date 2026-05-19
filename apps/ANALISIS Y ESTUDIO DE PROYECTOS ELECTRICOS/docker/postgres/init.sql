-- Inicialización de PostgreSQL para AEP-Eléctrico
-- Habilita la extensión pgvector necesaria para RAG documental.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- para búsqueda por similaridad de texto

-- Las tablas las crea SQLAlchemy en el primer arranque del backend.
-- En producción usar Alembic para migraciones.
