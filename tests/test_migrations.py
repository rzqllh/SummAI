import os
import tempfile
import gc
import pytest
from backend.migration_runner import run_migrations, get_applied_versions, get_db_connection

def test_migration_runner_fresh_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        # 1. Run migrations on fresh DB
        count = run_migrations(db_path)
        assert count == 7

        # 2. Verify all versions applied
        conn = get_db_connection(db_path)
        applied = get_applied_versions(conn)
        assert applied == {1, 2, 3, 4, 5, 6, 7}

        # 3. Verify tables exist
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row[0] for row in cursor.fetchall()}
        assert "meetings" in tables
        assert "custom_presets" in tables
        assert "folders" in tables
        assert "tags" in tables
        assert "meeting_tags" in tables
        assert "action_items" in tables
        assert "share_links" in tables
        assert "upload_sessions" in tables
        assert "jobs" in tables
        assert "schema_migrations" in tables

        # 4. Idempotency test (second run should apply 0 migrations)
        count_second = run_migrations(db_path)
        assert count_second == 0

        conn.close()
    finally:
        gc.collect()
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
        except Exception:
            pass
