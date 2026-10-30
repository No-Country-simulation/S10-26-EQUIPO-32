# Política de seguridad

## Reportar una vulnerabilidad

No abras un issue público. Usá **Security → Report a vulnerability** (GitHub private vulnerability reporting) o contactá a los mantenedores listados en el README.

Incluí: descripción, pasos para reproducir, impacto estimado y, si podés, una propuesta de mitigación. Respondemos dentro de las 72 horas durante la simulación.

## Alcance

- Frontend (`apps/web`), backend y pipeline (`backend`), configuración de CI (`.github`).
- Asistente RAG: prompt injection directa e indirecta, filtración de contexto, recomendaciones de repos inexistentes, abuso de costo.

## Controles vigentes

- Rama `main` protegida: PR con 1 aprobación y CI en verde.
- Secret scanning con push protection + Gitleaks en CI.
- Dependabot para dependencias y GitHub Actions.
- RLS activado en todas las tablas de Supabase; el frontend usa solo la clave pública de lectura.

## Si se filtra un secreto

1. Revocar y rotar la credencial de inmediato (GitHub token, API key del LLM, claves de Supabase).
2. Avisar al otro integrante.
3. Revisar logs de uso del proveedor desde la fecha del commit.
4. Registrar el incidente en `docs/incidentes.md`. Borrar el commit no alcanza: la credencial se considera comprometida.
