-- ========================================================================
-- OpenBridge Supabase DDL - PostgreSQL 15+ & pgvector
-- Principios de Seguridad:
-- - P3 Mínimo Privilegio (RLS activado mandatoriamente)
-- - P5 Datos no confiables (Restricciones CHECK, tipos de datos acotados)
-- - P6 El asistente no inventa (Búsqueda vectorial con RPC sobre datos reales)
-- ========================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Tabla: repositories (Catálogo general de herramientas open-source)
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id BIGINT UNIQUE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL UNIQUE,
    description TEXT,
    html_url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    language TEXT,
    license_spdx TEXT DEFAULT 'NOASSERTION',
    stars_count INTEGER NOT NULL DEFAULT 0 CHECK (stars_count >= 0),
    forks_count INTEGER NOT NULL DEFAULT 0 CHECK (forks_count >= 0),
    open_issues_count INTEGER NOT NULL DEFAULT 0 CHECK (open_issues_count >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    health_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (health_score >= 0.00 AND health_score <= 100.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla: repository_metrics (Desglose analítico del Health Score)
CREATE TABLE IF NOT EXISTS public.repository_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE UNIQUE,
    commit_frequency_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (commit_frequency_score >= 0 AND commit_frequency_score <= 25),
    issue_resolution_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (issue_resolution_score >= 0 AND issue_resolution_score <= 20),
    license_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (license_score >= 0 AND license_score <= 20),
    community_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (community_score >= 0 AND community_score <= 20),
    documentation_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (documentation_score >= 0 AND documentation_score <= 15),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: repository_embeddings (Vectores densos para RAG con pgvector)
CREATE TABLE IF NOT EXISTS public.repository_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE UNIQUE,
    embedding VECTOR(384) NOT NULL,
    content_chunk TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla: audit_logs (Trazabilidad de seguridad - NIST CSF DE.AE)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    status TEXT NOT NULL,
    ip_address TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 6. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_repositories_health_score ON public.repositories(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_category ON public.repositories(category);
CREATE INDEX IF NOT EXISTS idx_repositories_license ON public.repositories(license_spdx);
CREATE INDEX IF NOT EXISTS idx_repositories_stars ON public.repositories(stars_count DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- Índice vectorial con HNSW (métrica de distancia coseno)
CREATE INDEX IF NOT EXISTS idx_repository_embeddings_vector 
ON public.repository_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- ========================================================================
-- 7. Configuración Mandatoria de Row Level Security (RLS) - Principio P3
-- ========================================================================

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1. Políticas para 'repositories'
-- Público / anon: Solo lectura de repositorios catalogados
DROP POLICY IF EXISTS "Public read access for repositories" ON public.repositories;
CREATE POLICY "Public read access for repositories"
    ON public.repositories
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Service Role: Acceso total para el backend y pipeline
DROP POLICY IF EXISTS "Service role full access for repositories" ON public.repositories;
CREATE POLICY "Service role full access for repositories"
    ON public.repositories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7.2. Políticas para 'repository_metrics'
DROP POLICY IF EXISTS "Public read access for repository_metrics" ON public.repository_metrics;
CREATE POLICY "Public read access for repository_metrics"
    ON public.repository_metrics
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access for repository_metrics" ON public.repository_metrics;
CREATE POLICY "Service role full access for repository_metrics"
    ON public.repository_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7.3. Políticas para 'repository_embeddings'
-- El embedding es interno: solo el service_role accede directamente
DROP POLICY IF EXISTS "Service role full access for repository_embeddings" ON public.repository_embeddings;
CREATE POLICY "Service role full access for repository_embeddings"
    ON public.repository_embeddings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7.4. Políticas para 'audit_logs'
-- Los logs son confidenciales: solo service_role puede insertar y consultar
DROP POLICY IF EXISTS "Service role insert and read for audit_logs" ON public.audit_logs;
CREATE POLICY "Service role insert and read for audit_logs"
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ========================================================================
-- 8. Función RPC de Similitud Coseno para RAG Seguro (Principio P6)
-- ========================================================================

CREATE OR REPLACE FUNCTION match_repositories (
    query_embedding VECTOR(384),
    match_threshold FLOAT DEFAULT 0.60,
    match_count INT DEFAULT 5,
    filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    description TEXT,
    html_url TEXT,
    category TEXT,
    health_score NUMERIC,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.full_name,
        r.description,
        r.html_url,
        r.category,
        r.health_score,
        1 - (re.embedding <=> query_embedding) AS similarity
    FROM public.repository_embeddings re
    JOIN public.repositories r ON r.id = re.repository_id
    WHERE (1 - (re.embedding <=> query_embedding)) >= match_threshold
      AND (filter_category IS NULL OR r.category = filter_category)
    ORDER BY similarity DESC, r.health_score DESC
    LIMIT match_count;
END;
$$;

