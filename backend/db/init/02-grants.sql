-- Privilegios por rol (feature 006). schema.sql define el RLS; Supabase concede estos GRANT por defecto y acá se
-- hacen explícitos y mínimos. RLS sigue activo en las 4 tablas: los GRANT no lo reemplazan, lo acompañan.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Lectura pública del catálogo: solo repositories y repository_metrics (las políticas de schema.sql las habilitan).
GRANT SELECT ON public.repositories, public.repository_metrics TO anon, authenticated;

-- Escritura y lectura total solo para el rol de servicio (embeddings y audit_logs son internos).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT TRUNCATE ON ALL TABLES IN SCHEMA public TO service_role;

-- La búsqueda vectorial es SECURITY DEFINER: no la ejecuta el público.
REVOKE EXECUTE ON FUNCTION public.match_repositories(vector, double precision, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_repositories(vector, double precision, integer, text) TO service_role;
