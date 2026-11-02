"""GitHub API Integration Service.

Adheres to:
- OWASP A10: SSRF prevention (uses pre-validated owner/repo)
- Principle P3: Minimal privilege (read-only token)
- Principle P5: Untrusted external data parsing
"""

import json
from typing import Any, Dict, Optional
import urllib.error
import urllib.request
from backend.app.core.config import settings
from backend.app.core.sanitizer import sanitize_text, validate_github_url


class GitHubService:
    """Safely retrieves repository metadata and README from GitHub REST API."""

    BASE_API_URL = "https://api.github.com"

    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.github_token

    def fetch_repository_data(self, url_or_slug: str) -> Dict[str, Any]:
        """Validates the URL and fetches repository details from GitHub API.

        Returns:
            Dict containing normalized metadata:
            - github_id, owner, name, full_name, description, html_url,
              language, license_spdx, stars_count, forks_count, open_issues_count,
              is_archived, pushed_at, readme_content
        """
        owner, repo = validate_github_url(url_or_slug)
        api_url = f"{self.BASE_API_URL}/repos/{owner}/{repo}"

        repo_json = self._make_request(api_url)

        # Attempt to fetch README (best-effort)
        readme_content = ""
        try:
            readme_url = f"{api_url}/readme"
            headers = {"Accept": "application/vnd.github.raw+json"}
            readme_content = self._make_request_raw(readme_url, extra_headers=headers)
        except Exception:
            # README not available or rate limited; fallback to description
            readme_content = repo_json.get("description") or ""

        # Extract SPDX license key
        license_info = repo_json.get("license") or {}
        license_spdx = license_info.get("spdx_id") or "NOASSERTION"

        return {
            "github_id": repo_json.get("id"),
            "owner": owner,
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "description": sanitize_text(repo_json.get("description") or "", max_length=1000),
            "html_url": repo_json.get("html_url", f"https://github.com/{owner}/{repo}"),
            "language": repo_json.get("language") or "Unknown",
            "license_spdx": license_spdx,
            "stars_count": int(repo_json.get("stargazers_count", 0)),
            "forks_count": int(repo_json.get("forks_count", 0)),
            "open_issues_count": int(repo_json.get("open_issues_count", 0)),
            "is_archived": bool(repo_json.get("archived", False)),
            "pushed_at": repo_json.get("pushed_at"),
            "readme_content": sanitize_text(readme_content, max_length=15000),
        }

    def _make_request(self, url: str) -> Dict[str, Any]:
        """Executes an HTTPS GET request returning parsed JSON."""
        raw = self._make_request_raw(url, extra_headers={"Accept": "application/vnd.github.v3+json"})
        return json.loads(raw)

    def _make_request_raw(self, url: str, extra_headers: Optional[Dict[str, str]] = None) -> str:
        """Executes an HTTPS GET request returning raw response text."""
        headers = {
            "User-Agent": "OpenBridge-IngestionPipeline/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        if extra_headers:
            headers.update(extra_headers)

        req = urllib.request.Request(url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(req, timeout=10.0) as response:
                return response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise ValueError(f"Repositorio no encontrado en GitHub (HTTP 404): {url}")
            elif e.code in (401, 403):
                raise PermissionError("Acceso a GitHub API denegado o límite de tasa excedido.")
            raise RuntimeError(f"Error en GitHub API: HTTP {e.code}")
        except urllib.error.URLError as e:
            raise ConnectionError(f"Error de conexión con GitHub API: {e.reason}")


# Global GitHub service instance
github_service = GitHubService()

