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

## Falsos positivos de Gitleaks

Se excluyen solo con el fingerprint exacto en `.gitleaksignore` (raíz), con un comentario que dice quién lo verificó, cuándo y por qué. Nunca por regla, carpeta o archivo completo: un token real nuevo en el mismo archivo se sigue detectando. Como la CI escanea todo el historial, corregir el archivo en un commit nuevo no quita el hallazgo del commit original.

| Fecha | Fingerprint | Motivo |
| --- | --- | --- |
| 2026-11-10 | `fe1f22a…:backend/tests/test_sanitizer.py:github-pat:86` | Token de prueba ficticio en el test de `redact_secrets` (36 caracteres, 10 distintos, entropía 3.6). No es una credencial real; no requiere rotación. Verificado: Gitleaks v8.18.4 pasa con la exclusión y sigue detectando un token falso nuevo en otro archivo. |

## Si se filtra un secreto

1. Revocar y rotar la credencial de inmediato (GitHub token, API key del LLM, claves de Supabase).
2. Avisar al otro integrante.
3. Revisar logs de uso del proveedor desde la fecha del commit.
4. Registrar el incidente en `docs/incidentes.md`. Borrar el commit no alcanza: la credencial se considera comprometida.
