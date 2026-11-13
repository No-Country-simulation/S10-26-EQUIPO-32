"""Optional scheduled re-ingestion (feature 006; RF-29, RNF-36). No new dependencies: one daemon thread.

OFF by default (``INGEST_SCHEDULE_HOURS`` unset or 0) and never started by the tests. Every N hours it re-ingests
the repositories already in the catalog (same pipeline, same sanitizer, same health score), keeping their category.
A failure on one repository is logged to the audit trail and does not stop the run or kill the thread.
"""

import logging
import threading
from typing import Callable, Optional

from backend.app.core.audit import audit_logger

logger = logging.getLogger("openbridge.scheduler")


class IngestScheduler:
    def __init__(self, interval_hours: float, db=None, pipeline=None, sleep: Optional[Callable[[float], bool]] = None):
        if interval_hours <= 0:
            raise ValueError("interval_hours must be > 0")
        self.interval_seconds = interval_hours * 3600.0
        self._db = db
        self._pipeline = pipeline
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        # `sleep` returns True when asked to stop; injectable so tests do not wait.
        self._wait = sleep or (lambda seconds: self._stop.wait(seconds))

    @property
    def db(self):
        if self._db is None:
            from backend.app.database.client import db_client

            self._db = db_client
        return self._db

    @property
    def pipeline(self):
        if self._pipeline is None:
            from backend.app.services.ingestion_pipeline import ingestion_pipeline

            self._pipeline = ingestion_pipeline
        return self._pipeline

    def run_once(self) -> dict:
        """Re-ingests every repository currently in the catalog. Returns counts (also audited)."""
        ok, failed = 0, 0
        for repo in self.db.list_all_repositories():
            if self._stop.is_set():
                break
            try:
                self.pipeline.ingest_repository(
                    url_or_slug=repo["full_name"], category=repo.get("category") or "Developer Tools", actor="scheduler"
                )
                ok += 1
            except Exception as exc:  # one bad repo must not stop the run (the pipeline already audits the cause)
                failed += 1
                logger.warning("scheduled ingest failed for %s: %s", repo.get("full_name"), type(exc).__name__)
        audit_logger.log(
            action="SCHEDULED_INGEST_RUN", actor="scheduler", resource="catalog",
            status="SUCCESS" if failed == 0 else "PARTIAL", details={"ok": ok, "failed": failed},
        )
        return {"ok": ok, "failed": failed}

    def _loop(self) -> None:
        while not self._wait(self.interval_seconds):
            try:
                self.run_once()
            except Exception:
                logger.exception("scheduled ingest run crashed; the next run will retry")

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="openbridge-ingest-scheduler", daemon=True)
        self._thread.start()
        logger.info("ingest scheduler started: every %.2f h", self.interval_seconds / 3600.0)

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)


def build_scheduler_from_settings(settings) -> Optional[IngestScheduler]:
    """Scheduler only if INGEST_SCHEDULE_HOURS > 0; otherwise None (default and tests)."""
    return IngestScheduler(settings.ingest_schedule_hours) if settings.ingest_schedule_hours > 0 else None
