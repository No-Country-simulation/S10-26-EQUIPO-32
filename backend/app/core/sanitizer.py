"""Input Sanitization, Anti-SSRF and Security Validation Module.

Mitigates:
- OWASP A10: Server-Side Request Forgery (SSRF)
- OWASP A03: Cross-Site Scripting (XSS) & HTML Injection
- OWASP LLM01: Indirect Prompt Injection via untrusted external markdown/READMEs
- OWASP A02: Secret Leakage
"""

import ipaddress
import re
from typing import Tuple
from urllib.parse import urlparse


# Regex for valid GitHub owner and repository names
GITHUB_REPO_PATTERN = re.compile(r"^[a-zA-Z0-9_\-\.]{1,100}/[a-zA-Z0-9_\-\.]{1,100}$")

# Disallowed private and special CIDRs for SSRF mitigation
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # Cloud link-local metadata (AWS/GCP/Azure)
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

# Sensitive token patterns for automatic log redaction
SECRET_PATTERNS = [
    (re.compile(r"(ghp_[a-zA-Z0-9]{36})"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"(github_pat_[a-zA-Z0-9_]{82})"), "[REDACTED_GITHUB_PAT]"),
    (re.compile(r"(sk-[a-zA-Z0-9]{20,})"), "[REDACTED_LLM_KEY]"),
    (re.compile(r"(eyJh[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]*)"), "[REDACTED_JWT]"),
    (re.compile(r"(Bearer\s+)[a-zA-Z0-9_\-\.]{15,}", re.IGNORECASE), r"\1[REDACTED_BEARER_TOKEN]"),
]

# Prompt injection evasion patterns (indirect prompt injection)
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)", re.IGNORECASE),
    re.compile(r"system\s*override", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|secret|instructions)", re.IGNORECASE),
    re.compile(r"disregard\s+the\s+above", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
]

# Dangerous HTML tags and attributes for stored XSS mitigation
DANGEROUS_HTML_REGEX = re.compile(
    r"<\s*(script|iframe|object|embed|style|meta|link|base)[^>]*>.*?<\s*/\s*\1\s*>|"
    r"<\s*(script|iframe|object|embed|style|meta|link|base)[^>]*/>|"
    r"\bon\w+\s*=\s*['\"].*?['\"]|"
    r"javascript:\s*",
    re.IGNORECASE | re.DOTALL,
)


def validate_github_url(url_or_slug: str) -> Tuple[str, str]:
    """Validates and extracts owner/repo from a GitHub URL or slug.

    Enforces strict anti-SSRF guards:
    - Only HTTPS scheme allowed.
    - Host must be explicitly 'github.com' or 'api.github.com'.
    - Rejects private IP literals and localhost.
    - Owner and repository names are sanitized and regex validated.

    Returns:
        Tuple[str, str]: (owner, repo)

    Raises:
        ValueError: If input is invalid, malformed or represents an SSRF risk.
    """
    if not url_or_slug or not isinstance(url_or_slug, str):
        raise ValueError("URL o identificador de repositorio inválido.")

    cleaned = url_or_slug.strip()

    # Direct slug format: 'owner/repo'
    if "/" in cleaned and not cleaned.startswith(("http://", "https://")):
        parts = cleaned.strip("/").split("/")
        if len(parts) == 2 and GITHUB_REPO_PATTERN.match(f"{parts[0]}/{parts[1]}"):
            return parts[0], parts[1]

    # Full URL format
    parsed = urlparse(cleaned)
    if parsed.scheme.lower() != "https":
        raise ValueError("Esquema no permitido. Se requiere https:// para repositorios de GitHub.")

    hostname = (parsed.hostname or "").lower()

    # Reject localhost, loopback, or non-github domains
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0") or hostname.endswith(".local"):
        raise ValueError("Host prohibido: intento de acceso a red local.")

    # Check if host is an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        for net in PRIVATE_NETWORKS:
            if ip in net:
                raise ValueError("Host prohibido: IP privada o restringida detectada.")
        raise ValueError("No se permiten URLs basadas en direcciones IP directas.")
    except ValueError as e:
        # If it wasn't an IP, re-raise only if it matched our rejection message
        if "Host prohibido" in str(e) or "No se permiten URLs" in str(e):
            raise

    # Host whitelist
    if hostname not in ("github.com", "www.github.com", "api.github.com"):
        raise ValueError(f"Dominio no autorizado: '{hostname}'. Solo se permite 'github.com'.")

    # Extract owner and repo from path
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(path_parts) < 2:
        raise ValueError("Ruta de repositorio incompleta. Se esperaba '/owner/repo'.")

    owner, repo = path_parts[0], path_parts[1]
    # Remove .git suffix if present
    if repo.endswith(".git"):
        repo = repo[:-4]

    slug = f"{owner}/{repo}"
    if not GITHUB_REPO_PATTERN.match(slug):
        raise ValueError("Caracteres no permitidos en el identificador de repositorio.")

    return owner, repo


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Sanitizes text by stripping harmful HTML/JavaScript tags and limiting length.

    Mitigates Stored XSS and payload bloating.
    """
    if not text or not isinstance(text, str):
        return ""

    # Truncate to maximum allowed length to prevent memory exhaustion
    truncated = text[:max_length]

    # Strip dangerous HTML tags and event listeners
    clean = DANGEROUS_HTML_REGEX.sub("", truncated)

    # Clean non-printable control characters except standard whitespace
    clean = "".join(ch for ch in clean if ch.isprintable() or ch in "\n\r\t")

    return clean.strip()


def sanitize_prompt_text(text: str, max_length: int = 4000) -> str:
    """Sanitizes untrusted text (e.g. README or description) before LLM/RAG context.

    Mitigates OWASP LLM01: Indirect Prompt Injection.
    """
    clean = sanitize_text(text, max_length=max_length)

    # Neutralize prompt injection phrases
    for pattern in PROMPT_INJECTION_PATTERNS:
        clean = pattern.sub("[FILTERED_POTENTIAL_INJECTION]", clean)

    return clean


def redact_secrets(content: str) -> str:
    """Redacts known token and credential patterns from text and logs."""
    if not content or not isinstance(content, str):
        return ""

    sanitized = content
    for pattern, replacement in SECRET_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)

    return sanitized

