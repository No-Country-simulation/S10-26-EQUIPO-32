"""Configuration settings for OpenBridge Backend.

Adheres to NIST CSF 2.0 (PR.AA, PR.DS) and OWASP Top 10 (A02, A05).
Strict environment parsing, fail-fast validations, and zero secrets exposure.
"""

import os
from typing import List
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application configuration settings."""

    app_name: str = "OpenBridge Backend API"
    app_version: str = "1.0.0"
    backend_env: str = Field(default="development")
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    # Supabase (Postgres + pgvector + RLS)
    supabase_url: str = Field(default="")
    supabase_anon_key: str = Field(default="")
    supabase_service_role_key: str = Field(default="")

    # GitHub API (Pipeline de Ingesta)
    github_token: str = Field(default="")

    # LLM & Embeddings
    llm_api_key: str = Field(default="")
    llm_model: str = Field(default="text-embedding-3-small")
    embedding_dimension: int = Field(default=384)

    # Security & RBAC
    admin_api_key: str = Field(default="openbridge-dev-admin-secret-key-32chars-min")
    rate_limit_per_minute: int = Field(default=60)
    allowed_origins_raw: str = Field(default="http://localhost:3000,http://127.0.0.1:3000")

    @property
    def is_production(self) -> bool:
        return self.backend_env.lower() in ("production", "prod")

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins_raw.split(",") if origin.strip()]

    def validate_production_guards(self) -> None:
        """Enforces security assertions in production environment (fail-fast)."""
        if self.is_production:
            if not self.supabase_service_role_key or len(self.supabase_service_role_key) < 20:
                raise ValueError("SECURITY ALERT: SUPABASE_SERVICE_ROLE_KEY is required and must be secure in production.")
            if not self.admin_api_key or "dev" in self.admin_api_key or len(self.admin_api_key) < 24:
                raise ValueError("SECURITY ALERT: ADMIN_API_KEY must be a strong production key (>= 24 chars).")

    def __repr__(self) -> str:
        """Prevents accidental secrets leakage in logs and tracebacks."""
        return (
            f"<Settings env={self.backend_env} host={self.host}:{self.port} "
            f"supabase_url={'configured' if self.supabase_url else 'none'} "
            f"rate_limit={self.rate_limit_per_minute}/min>"
        )


def load_settings() -> Settings:
    """Loads configuration from environment variables and .env file."""
    # Attempt to load .env from workspace root or current dir
    try:
        from dotenv import load_dotenv
        # Check current dir or parent dirs for .env
        env_paths = [".env", "../.env", "../../.env"]
        for p in env_paths:
            if os.path.exists(p):
                load_dotenv(p)
                break
    except ImportError:
        pass

    settings = Settings(
        backend_env=os.getenv("BACKEND_ENV", "development"),
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        supabase_url=os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", "")),
        supabase_anon_key=os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY", "")),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        github_token=os.getenv("GITHUB_TOKEN", ""),
        llm_api_key=os.getenv("LLM_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", "text-embedding-3-small"),
        admin_api_key=os.getenv("ADMIN_API_KEY", "openbridge-dev-admin-secret-key-32chars-min"),
        rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
        allowed_origins_raw=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"),
    )
    settings.validate_production_guards()
    return settings


# Global settings singleton
settings = load_settings()

