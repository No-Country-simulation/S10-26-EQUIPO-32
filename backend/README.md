# OpenBridge Backend & Pipeline de Ingesta

Servicio central de API REST, pipeline de ingesta automatizado y base vectorial para **OpenBridge**.  
Diseñado y desarrollado bajo **Spec-Driven Development (SDD)**, **Security by Design**, cumplimiento **NIST CSF 2.0** y mitigaciones exhaustivas contra el **OWASP Top 10 Web** y **OWASP Top 10 for LLM Applications**.

---

## 1. Arquitectura y Capacidades

- **API REST Asíncrona (FastAPI):** Endpoints estructurados para catálogo de herramientas, ingesta, búsqueda vectorial semántica y auditoría.
- **Pipeline de Ingesta de Repositorios:** Extracción limpia de metadatos y READMEs de GitHub, con protección anti-SSRF y validación de esquemas.
- **Motor de Health Score Determinista (0-100 pts):** Algoritmo reproducible basado en métricas tangibles: recencia de commits (25%), resolución de issues (20%), licencia OSI (20%), comunidad (20%) y documentación (15%), con penalización para repositorios archivados.
- **Almacenamiento Vectorial y RAG Seguro (Principio P6):** Vectores densos de 384 dimensiones compatibles con `pgvector` en Supabase y función RPC `match_repositories`. **Garantía estricta de no alucinación:** solo se recomiendan repositorios catalogados y auditados en la base de datos.
- **Seguridad en Profundidad:**
  - **RBAC (Role-Based Access Control):** Separación de privilegios (`anonymous`, `readonly`, `service_role`, `admin`).
  - **Hardened HTTP Headers:** HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.
  - **Rate Limiting con Ventana Deslizante:** 60 peticiones/minuto por IP/Token para mitigar abusos y DoS.
  - **Anti-SSRF:** Bloqueo de rangos privados (RFC 1918), loopback (`127.0.0.1`), link-local (`169.254.169.254`) y restricción a dominios oficiales de GitHub.
  - **Sanitización Anti-XSS y Anti-Prompt-Injection:** Neutralización de scripts e instrucciones de evasión en READMEs.
  - **Logging de Auditoría Estructurado:** Trazabilidad JSON (NIST CSF DE.AE) con redacción automática de secretos y tokens.
  - **Captura Global de Excepciones:** Respuestas genéricas de error con `error_id` opaco para evitar Information Disclosure (OWASP A05).

---

## 2. Estructura del Proyecto

```
backend/
├── app/
│   ├── main.py                  # Entrypoint de FastAPI y middlewares
│   ├── core/                    # Configuración, RBAC, headers, rate limiter, sanitizador, auditoría
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── headers.py
│   │   ├── rate_limiter.py
│   │   ├── sanitizer.py
│   │   └── audit.py
│   ├── database/                # DDL de Supabase con RLS y cliente con fallback local
│   │   ├── schema.sql
│   │   └── client.py
│   ├── schemas/                 # Contratos Pydantic v2 para peticiones y respuestas
│   │   ├── repository.py
│   │   ├── metrics.py
│   │   ├── ingestion.py
│   │   ├── rag.py
│   │   └── audit.py
│   ├── services/                # Lógica de negocio, GitHub API, Health Score, Vectores, RAG
│   │   ├── github_service.py
│   │   ├── health_score_service.py
│   │   ├── vector_service.py
│   │   ├── ingestion_pipeline.py
│   │   └── rag_service.py
│   └── api/                     # Routers y dependencias de autenticación
│       ├── dependencies.py
│       ├── router.py
│       └── routes/
│           ├── health.py
│           ├── repositories.py
│           ├── ingestion.py
│           ├── rag.py
│           └── audit.py
├── tests/                       # Suite integral de pruebas unitarias y de integración
│   ├── test_sanitizer.py
│   ├── test_security.py
│   ├── test_health_score.py
│   ├── test_vector_service.py
│   ├── test_ingestion_pipeline.py
│   ├── test_rag_service.py
│   └── test_api.py
├── Dockerfile                   # Contenedor seguro multi-stage no-root
├── requirements.txt
└── pyproject.toml
```

---

## 3. Instalación y Ejecución

### 3.1. Requisitos Previos
- Python 3.10 o superior.

### 3.2. Configuración de Variables de Entorno
Copia `.env.example` en la raíz del proyecto a `.env`:
```bash
cp .env.example .env
```
Completa las variables según tu entorno:
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase (solo backend).
- `GITHUB_TOKEN`: Token de GitHub (lectura de repositorios públicos).
- `ADMIN_API_KEY`: Clave Bearer para operaciones de administración.

> **Nota de Resiliencia:** Si las credenciales de Supabase no están configuradas al iniciar, el backend activa automáticamente su motor seguro en memoria (`mock_in_memory`), permitiendo el desarrollo y la ejecución de pruebas sin bloqueos.

### 3.3. Ejecutar el Servidor
Desde la raíz del repositorio:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Endpoints Principales

| Método | Endpoint | Rol Requerido | Descripción |
| --- | --- | --- | --- |
| `GET` | `/health` | Público | Verificación de liveness del servicio |
| `GET` | `/health/ready` | Público | Estado de readiness y controles de seguridad activos |
| `GET` | `/api/v1/repositories` | Público | Listado paginado con filtros (`category`, `license_spdx`, `min_health_score`, `search`) |
| `GET` | `/api/v1/repositories/{id_or_slug}` | Público | Detalle de herramienta y desglose analítico de salud |
| `POST` | `/api/v1/ingestion/repository` | `service_role` o `admin` | Ingesta, auditoría y vectorización de repositorio GitHub |
| `POST` | `/api/v1/ingestion/batch` | `service_role` o `admin` | Ingesta en lote (hasta 20 repositorios) |
| `POST` | `/api/v1/rag/search` | Público | Búsqueda semántica de stack recomendando herramientas verificadas |
| `GET` | `/api/v1/audit/logs` | `admin` | Consulta de eventos de seguridad y transacciones |

---

## 5. Ejecutar Pruebas Automatizadas

El backend incluye una suite de 25 pruebas unitarias y de integración que cubren el 100% de los flujos críticos de negocio y controles de seguridad:
```bash
python -m unittest discover -s backend/tests -p "test_*.py"
```

---

## 6. Despliegue en Contenedores (Docker)

Construir la imagen hardened multi-stage:
```bash
docker build -t openbridge-backend:latest -f backend/Dockerfile .
```

Ejecutar el contenedor:
```bash
docker run -p 8000:8000 --env-file .env openbridge-backend:latest
```

