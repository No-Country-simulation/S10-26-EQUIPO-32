# Política de seguridad

## Reportar una vulnerabilidad

No abras un issue público. Usá **Security → Report a vulnerability** (GitHub private vulnerability reporting) o contactá a los mantenedores listados en el README.

Incluí: descripción, pasos para reproducir, impacto estimado y, si podés, una propuesta de mitigación. Respondemos dentro de las 72 horas durante la simulación.

## Alcance

- Frontend (`apps/web`), backend y pipeline (`backend`), configuración de CI (`.github`).
- Asistente RAG: prompt injection directa e indirecta, filtración de contexto, recomendaciones de repos inexistentes, abuso de costo.

## Controles vigentes

- Rama `main` protegida por el ruleset `proteccion-main` (ver abajo).
- Secret scanning con push protection + Gitleaks en CI.
- Dependabot para dependencias y GitHub Actions.
- RLS activado en todas las tablas de Supabase; el frontend usa solo la clave pública de lectura.

## Ruleset `proteccion-main`

Ruleset de GitHub (id 27205292), **activo** sobre la rama por defecto (`main`). Control de NIST CSF 2.0 **PR.AA** (quién puede cambiar `main` y cómo) y **PR.PS** (integridad de la plataforma de código). Riesgo R-17 en la matriz.

| Regla | Configuración |
| --- | --- |
| Pull request obligatorio | Sí. Ningún cambio entra a `main` sin PR |
| Aprobaciones requeridas | **0**, cubierto por **EX-01** (`docs/matriz-riesgos.md`). Vuelve a 1 cuando se cierre la excepción |
| Método de merge | Solo squash |
| Checks requeridos | `Lint, tipos, pruebas y build` y `Gitleaks (secret scanning)` (GitHub Actions) |
| Bypass | Ninguno: aplica también a los administradores |
| Force push | Bloqueado |
| Borrado de la rama | Bloqueado |

**Evidencia:** el 2026-11-13 a las 11:06, un push directo a `main` fue rechazado con `GH013` (prueba de Jerónimo Núñez). La configuración se verificó por API (`gh api repos/{owner}/{repo}/rulesets/27205292`) el mismo día.

**Límite conocido:** los checks no exigen que la rama esté al día con `main` (`strict_required_status_checks_policy: false`). Un PR puede pasar el CI sobre una base vieja; el CI que corre al hacer push a `main` lo detecta después del merge.

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
