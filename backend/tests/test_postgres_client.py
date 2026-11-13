"""Tests of the Postgres data layer and its RLS (feature 006; RF-27, RNF-34, RNF-35, MU-33, MU-34).

They need a real database (docker compose up -d db) and are SKIPPED without these variables, so the unit suite
keeps running offline with the in-memory store:
  TEST_DATABASE_URL        DSN of the backend login role (member of service_role)
  TEST_ADMIN_DATABASE_URL  DSN of the superuser, only to create a throwaway anon login and to run one RLS probe
"""

import os
import unittest
import uuid

import psycopg2
from psycopg2 import errors

from backend.app.database.client import DatabaseClient
from backend.app.database.postgres_client import PostgresDatabaseClient, _escape_like

DSN = os.getenv("TEST_DATABASE_URL", "")
ADMIN = os.getenv("TEST_ADMIN_DATABASE_URL", "")
needs_db = unittest.skipUnless(DSN and ADMIN, "TEST_DATABASE_URL / TEST_ADMIN_DATABASE_URL not set")

REPO = {
    "github_id": 1, "owner": "acme", "name": "tool", "full_name": "acme/tool", "description": "A tool",
    "html_url": "https://github.com/acme/tool", "category": "Pagos", "language": "Python",
    "license_spdx": "MIT", "stars_count": 10, "forks_count": 2, "open_issues_count": 1, "is_archived": False,
    "health_score": 80.0,
}
EMB = [0.1] * 384


@needs_db
class TestPostgresClient(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = PostgresDatabaseClient(DSN, allow_clear=True)

    @classmethod
    def tearDownClass(cls):
        cls.db.clear()
        cls.db.close()

    def setUp(self):
        self.db.clear()

    def test_same_public_interface_as_memory_store(self):
        for name in dir(DatabaseClient):
            if not name.startswith("_"):
                self.assertTrue(hasattr(PostgresDatabaseClient, name), name)

    def test_crud_and_upsert(self):
        saved = self.db.save_repository(REPO)
        self.assertEqual(saved["full_name"], "acme/tool")
        again = self.db.save_repository({**REPO, "stars_count": 99})
        self.assertEqual(again["id"], saved["id"])  # upsert by full_name, not a duplicate
        self.assertEqual(again["stars_count"], 99)
        self.assertEqual(self.db.get_repository_by_id(saved["id"])["full_name"], "acme/tool")
        self.assertEqual(self.db.get_repository_by_slug("acme/tool")["id"], saved["id"])
        self.assertIsNone(self.db.get_repository_by_id("not-a-uuid"))
        self.assertIsNone(self.db.get_repository_by_id(str(uuid.uuid4())))
        self.assertIsNone(self.db.get_repository_by_slug("acme/missing"))

    def test_metrics_and_embedding_roundtrip(self):
        repo = self.db.save_repository(REPO)
        m = self.db.save_metrics(repo["id"], {
            "commit_frequency_score": 20, "issue_resolution_score": 15, "license_score": 20,
            "community_score": 10, "documentation_score": 15,
        })
        self.assertEqual(m["repository_id"], repo["id"])
        self.assertEqual(m["total_score"], 80.0)
        self.assertEqual(self.db.get_metrics_by_repo_id(repo["id"])["license_score"], 20.0)
        self.db.save_embedding(repo["id"], EMB, "chunk")
        self.db.save_embedding(repo["id"], EMB, "chunk v2")  # upsert
        hits = self.db.match_repositories_vector(EMB, match_threshold=0.9)
        self.assertEqual([h["full_name"] for h in hits], ["acme/tool"])
        self.assertEqual(self.db.match_repositories_vector(EMB, filter_category="Otra"), [])

    def test_list_filters_pagination_and_order(self):
        for i in range(5):
            self.db.save_repository({**REPO, "github_id": 10 + i, "name": f"t{i}", "full_name": f"acme/t{i}",
                                     "html_url": f"https://github.com/acme/t{i}", "health_score": 10.0 * i,
                                     "category": "A" if i % 2 else "B"})
        items, total = self.db.list_repositories(limit=2)
        self.assertEqual((len(items), total), (2, 5))
        self.assertEqual(items[0]["full_name"], "acme/t4")  # health desc
        _, total_a = self.db.list_repositories(category="a")
        self.assertEqual(total_a, 2)
        _, total_h = self.db.list_repositories(min_health_score=25)
        self.assertEqual(total_h, 2)
        _, total_page2 = self.db.list_repositories(limit=2, offset=4)
        self.assertEqual(total_page2, 5)

    def test_sql_injection_in_search_is_neutralized(self):
        """MU-33: the search text is data, never SQL; wildcards of the user are literal too."""
        self.db.save_repository(REPO)
        for payload in ["'; DROP TABLE public.repositories; --", "' OR '1'='1", "acme/tool' --", "%", "_", "\\"]:
            items, total = self.db.list_repositories(search_query=payload)
            self.assertEqual((items, total), ([], 0), payload)
        # the table is still there and intact
        self.assertEqual(self.db.list_repositories()[1], 1)
        self.assertEqual(self.db.list_repositories(search_query="acme")[1], 1)
        self.assertEqual(_escape_like("50%_x\\"), "50\\%\\_x\\\\")
        # injection through category and license filters too
        self.assertEqual(self.db.list_repositories(category="x' OR '1'='1")[1], 0)
        self.assertEqual(self.db.list_repositories(license_spdx="MIT'; --")[1], 0)

    def test_clear_is_disabled_by_default(self):
        prod_like = PostgresDatabaseClient(DSN)
        with self.assertRaises(PermissionError):
            prod_like.clear()
        prod_like.close()

    def test_repr_never_leaks_the_dsn(self):
        self.assertNotIn("postgresql", repr(self.db))

    def test_audit_roundtrip(self):
        self.db.log_audit({"actor": "t", "action": "X", "resource": "r", "status": "OK", "details": {"a": 1}})
        self.assertEqual(self.db.get_audit_logs(1)[0]["action"], "X")


@needs_db
class TestRowLevelSecurity(unittest.TestCase):
    """MU-34: with anon credentials a write is rejected and the public read is allowed."""

    ANON_LOGIN = "rls_test_anon_login"

    @classmethod
    def setUpClass(cls):
        cls.db = PostgresDatabaseClient(DSN, allow_clear=True)
        cls.password = uuid.uuid4().hex
        cls.admin = psycopg2.connect(ADMIN)
        cls.admin.autocommit = True
        with cls.admin.cursor() as cur:
            cur.execute(f"DROP ROLE IF EXISTS {cls.ANON_LOGIN}")
            cur.execute(f"CREATE ROLE {cls.ANON_LOGIN} LOGIN PASSWORD %s", [cls.password])
            cur.execute(f"GRANT anon TO {cls.ANON_LOGIN}")
        # same host/port/db as the admin DSN, anon login
        params = cls.admin.get_dsn_parameters()
        cls.anon_dsn = (
            f"host={params['host']} port={params['port']} dbname={params['dbname']} "
            f"user={cls.ANON_LOGIN} password={cls.password} options='-c role=anon'"
        )

    @classmethod
    def tearDownClass(cls):
        cls.db.clear()
        cls.db.close()
        with cls.admin.cursor() as cur:
            cur.execute("REVOKE ALL ON public.repositories FROM anon")
            cur.execute("GRANT SELECT ON public.repositories TO anon, authenticated")
            cur.execute(f"DROP OWNED BY {cls.ANON_LOGIN}")
            cur.execute(f"DROP ROLE {cls.ANON_LOGIN}")
        cls.admin.close()

    def anon(self):
        conn = psycopg2.connect(self.anon_dsn)
        conn.autocommit = True
        return conn

    def run_anon(self, sql):
        """One statement per connection: a failed statement aborts its transaction, so never reuse it."""
        conn = self.anon()
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
                return cur.rowcount
        finally:
            conn.close()

    def test_rls_is_enabled_and_forced_on_all_tables(self):
        with self.admin.cursor() as cur:
            cur.execute(
                "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace "
                "AND relname IN ('repositories','repository_metrics','repository_embeddings','audit_logs')"
            )
            rows = dict(cur.fetchall())
        self.assertEqual(set(rows), {"repositories", "repository_metrics", "repository_embeddings", "audit_logs"})
        self.assertTrue(all(rows.values()), rows)

    def test_anon_can_read_the_public_catalog(self):
        self.db.clear()
        self.db.save_repository(REPO)
        with self.anon() as conn, conn.cursor() as cur:
            cur.execute("SELECT full_name FROM public.repositories")
            self.assertEqual(cur.fetchall(), [("acme/tool",)])

    INSERT = "INSERT INTO public.repositories (owner, name, full_name, html_url) VALUES ('x','y','x/y','https://github.com/x/y')"

    def test_anon_write_is_rejected(self):
        """No INSERT/UPDATE/DELETE privilege for anon: the write fails."""
        for sql in (self.INSERT, "UPDATE public.repositories SET stars_count = 0", "DELETE FROM public.repositories"):
            with self.assertRaises(errors.InsufficientPrivilege, msg=sql):
                self.run_anon(sql)

    def test_rls_alone_rejects_anon_writes_even_if_a_grant_leaked(self):
        """Defense in depth: with the privilege wrongly granted, the RLS policy (not the GRANT) still blocks it."""
        self.db.clear()
        self.db.save_repository(REPO)
        with self.admin.cursor() as cur:
            cur.execute("GRANT INSERT, UPDATE, DELETE ON public.repositories TO anon")
        try:
            with self.assertRaises(errors.InsufficientPrivilege) as ctx:
                self.run_anon(self.INSERT)
            self.assertIn("row-level security", str(ctx.exception))
            self.assertEqual(self.run_anon("UPDATE public.repositories SET stars_count = 0"), 0)  # RLS: 0 rows
            self.assertEqual(self.run_anon("DELETE FROM public.repositories"), 0)
            self.assertEqual(self.db.get_repository_by_slug("acme/tool")["stars_count"], 10)  # intact
        finally:
            with self.admin.cursor() as cur:
                cur.execute("REVOKE INSERT, UPDATE, DELETE ON public.repositories FROM anon")

    def test_anon_cannot_read_internal_tables(self):
        for table in ("repository_embeddings", "audit_logs"):
            with self.assertRaises(errors.InsufficientPrivilege):
                self.run_anon(f"SELECT * FROM public.{table}")

    def test_backend_login_does_not_bypass_rls_and_is_not_superuser(self):
        with self.db._cursor() as cur:
            cur.execute("SELECT current_user AS u, (SELECT rolsuper FROM pg_roles WHERE rolname = session_user) AS su, "
                        "(SELECT rolbypassrls FROM pg_roles WHERE rolname = session_user) AS bypass")
            row = cur.fetchone()
        self.assertEqual(row["u"], "service_role")
        self.assertFalse(row["su"])
        self.assertFalse(row["bypass"])


class TestSelection(unittest.TestCase):
    def test_without_database_url_the_memory_store_is_used(self):
        from backend.app.core.config import settings
        from backend.app.database import client as client_module

        original = settings.database_url
        try:
            settings.database_url = ""
            self.assertIsInstance(client_module.create_db_client(), DatabaseClient)
        finally:
            settings.database_url = original

    def test_postgres_requires_a_url(self):
        with self.assertRaises(ValueError):
            PostgresDatabaseClient("")


if __name__ == "__main__":
    unittest.main()
