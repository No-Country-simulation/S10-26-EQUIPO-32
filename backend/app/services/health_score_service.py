"""Deterministic Health Score Engine for Open-Source Repositories.

Adheres to:
- Principle P7: Real, reproducible and auditable metrics.
Computes a comprehensive health score (0-100 pts) evaluating maintenance,
community responsiveness, OSI license validity, and documentation quality.
"""

from datetime import datetime, timezone
import math
from typing import Any, Dict
from backend.app.schemas.metrics import HealthScoreBreakdown


# OSI recognized permissive and copyleft licenses
OSI_PERMISSIVE_LICENSES = {
    "MIT", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC",
    "MPL-2.0", "UNLICENSE", "CC0-1.0"
}
OSI_COPYLEFT_LICENSES = {
    "GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0"
}


class HealthScoreService:
    """Calculates deterministic health scores based on objective GitHub telemetry."""

    @classmethod
    def calculate_health_score(cls, repo_data: Dict[str, Any]) -> HealthScoreBreakdown:
        """Calculates breakdown scores and total score for a repository."""
        commit_score = cls._score_commit_recency(repo_data.get("pushed_at"))
        issue_score = cls._score_issue_responsiveness(
            repo_data.get("open_issues_count", 0),
            repo_data.get("stars_count", 0),
        )
        license_score = cls._score_license(repo_data.get("license_spdx"))
        community_score = cls._score_community(
            repo_data.get("stars_count", 0),
            repo_data.get("forks_count", 0),
        )
        doc_score = cls._score_documentation(
            repo_data.get("description"),
            repo_data.get("readme_content"),
        )

        subtotal = commit_score + issue_score + license_score + community_score + doc_score

        # Apply penalty if archived
        is_archived = bool(repo_data.get("is_archived", False))
        if is_archived:
            subtotal = max(5.0, subtotal - 50.0)

        total = round(min(100.0, max(0.0, subtotal)), 2)

        return HealthScoreBreakdown(
            commit_frequency_score=round(commit_score, 2),
            issue_resolution_score=round(issue_score, 2),
            license_score=round(license_score, 2),
            community_score=round(community_score, 2),
            documentation_score=round(doc_score, 2),
            total_score=total,
            penalty_archived=is_archived,
        )

    @staticmethod
    def _score_commit_recency(pushed_at_iso: Any) -> float:
        """Evaluates recency of code changes (max 25 pts)."""
        if not pushed_at_iso:
            return 2.0

        try:
            # Parse ISO date
            if isinstance(pushed_at_iso, str):
                pushed_dt = datetime.fromisoformat(pushed_at_iso.replace("Z", "+00:00"))
            else:
                pushed_dt = pushed_at_iso

            now = datetime.now(timezone.utc)
            delta_days = (now - pushed_dt).days

            if delta_days <= 30:
                return 25.0
            elif delta_days <= 90:
                return 20.0
            elif delta_days <= 180:
                return 15.0
            elif delta_days <= 365:
                return 8.0
            return 2.0
        except Exception:
            return 5.0

    @staticmethod
    def _score_issue_responsiveness(open_issues: int, stars: int) -> float:
        """Evaluates issue management hygiene (max 20 pts)."""
        open_issues = max(0, int(open_issues))
        if open_issues == 0:
            return 20.0
        elif open_issues < 25:
            return 18.0
        elif open_issues < 100:
            return 14.0
        elif open_issues < 300:
            return 10.0
        elif open_issues < 800:
            return 6.0
        return 3.0

    @staticmethod
    def _score_license(license_spdx: Any) -> float:
        """Evaluates clarity and permissiveness of open-source license (max 20 pts)."""
        if not license_spdx or not isinstance(license_spdx, str):
            return 0.0

        key = license_spdx.strip().upper()
        if key in OSI_PERMISSIVE_LICENSES:
            return 20.0
        elif key in OSI_COPYLEFT_LICENSES:
            return 16.0
        elif key != "NOASSERTION" and len(key) >= 2:
            return 10.0
        return 0.0

    @staticmethod
    def _score_community(stars: int, forks: int) -> float:
        """Evaluates community adoption and resilience (max 20 pts)."""
        stars = max(0, int(stars))
        forks = max(0, int(forks))
        combined = stars + (forks * 2)

        if combined >= 5000:
            return 20.0
        elif combined >= 1000:
            return 17.0
        elif combined >= 250:
            return 13.0
        elif combined >= 50:
            return 9.0
        elif combined >= 10:
            return 5.0
        return 2.0

    @staticmethod
    def _score_documentation(description: Any, readme_content: Any) -> float:
        """Evaluates documentation completeness and quality (max 15 pts)."""
        score = 0.0

        # Description presence
        desc_text = str(description or "").strip()
        if len(desc_text) >= 15:
            score += 5.0

        # README presence and depth
        readme_text = str(readme_content or "").strip()
        if len(readme_text) >= 1500:
            score += 10.0
        elif len(readme_text) >= 400:
            score += 7.0
        elif len(readme_text) >= 50:
            score += 3.0

        return score


# Global instance
health_score_service = HealthScoreService()

