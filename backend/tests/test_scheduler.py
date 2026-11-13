"""Optional scheduler (feature 006; RF-29, RNF-36): off by default, resilient, no real waiting or network."""

import threading
import unittest

from backend.app.core.config import Settings
from backend.app.database.client import DatabaseClient
from backend.app.services.scheduler import IngestScheduler, build_scheduler_from_settings


class FakePipeline:
    def __init__(self, fail_on=()):
        self.calls, self.fail_on = [], set(fail_on)

    def ingest_repository(self, url_or_slug, category, actor, **_):
        self.calls.append((url_or_slug, category, actor))
        if url_or_slug in self.fail_on:
            raise RuntimeError("boom")


def repo(name, category="Pagos"):
    return {"owner": "o", "name": name, "full_name": f"o/{name}", "html_url": f"https://github.com/o/{name}", "category": category}


class TestScheduler(unittest.TestCase):
    def test_off_by_default(self):
        self.assertIsNone(build_scheduler_from_settings(Settings()))
        self.assertIsNone(build_scheduler_from_settings(Settings(ingest_schedule_hours=0)))
        self.assertIsNotNone(build_scheduler_from_settings(Settings(ingest_schedule_hours=24)))
        with self.assertRaises(ValueError):
            IngestScheduler(0)

    def test_run_once_reingests_every_repo_keeping_category_and_survives_failures(self):
        db = DatabaseClient()
        for n in ("a", "b", "c"):
            db.save_repository(repo(n, category=f"cat-{n}"))
        pipeline = FakePipeline(fail_on={"o/b"})
        result = IngestScheduler(1, db=db, pipeline=pipeline).run_once()
        self.assertEqual(result, {"ok": 2, "failed": 1})
        self.assertEqual({c[0] for c in pipeline.calls}, {"o/a", "o/b", "o/c"})
        self.assertIn(("o/a", "cat-a", "scheduler"), pipeline.calls)

    def test_loop_runs_on_each_tick_and_stops_cleanly(self):
        db = DatabaseClient()
        db.save_repository(repo("a"))
        pipeline = FakePipeline()
        ticks = iter([False, False, True])  # two runs, then stop
        ran = threading.Event()
        sched = IngestScheduler(1, db=db, pipeline=pipeline, sleep=lambda _s: next(ticks))
        sched.start()
        sched._thread.join(timeout=5)
        ran.set()
        self.assertEqual(len(pipeline.calls), 2)
        self.assertFalse(sched._thread.is_alive())


if __name__ == "__main__":
    unittest.main()
