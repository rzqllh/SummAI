import os
import sqlite3
import importlib.util
import logging
from typing import List, Tuple

logger = logging.getLogger("summai.migrations")

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")

def get_db_connection(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_migration_table(conn: sqlite3.Connection):
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

def get_applied_versions(conn: sqlite3.Connection) -> set[int]:
    init_migration_table(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC;")
    return {row[0] for row in cursor.fetchall()}

def discover_migrations() -> List[Tuple[int, str, str]]:
    if not os.path.exists(MIGRATIONS_DIR):
        return []
    
    migrations = []
    for fname in sorted(os.listdir(MIGRATIONS_DIR)):
        if fname.endswith(".py") and not fname.startswith("__"):
            parts = fname.split("_", 1)
            try:
                version = int(parts[0])
                name = parts[1][:-3] if len(parts) > 1 else fname[:-3]
                fpath = os.path.join(MIGRATIONS_DIR, fname)
                migrations.append((version, name, fpath))
            except ValueError:
                continue
    migrations.sort(key=lambda m: m[0])
    return migrations

def run_migrations(db_path: str) -> int:
    conn = get_db_connection(db_path)
    try:
        applied = get_applied_versions(conn)
        discovered = discover_migrations()
        count = 0

        for version, name, fpath in discovered:
            if version in applied:
                continue

            logger.info(f"Applying migration {version:03d}_{name}...")
            spec = importlib.util.spec_from_file_location(f"migration_{version}", fpath)
            if not spec or not spec.loader:
                raise ImportError(f"Cannot load migration file: {fpath}")
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if not hasattr(module, "up"):
                raise AttributeError(f"Migration {fpath} must define an up(cursor) function.")

            with conn:
                cursor = conn.cursor()
                module.up(cursor)
                cursor.execute(
                    "INSERT INTO schema_migrations (version, name) VALUES (?, ?);",
                    (version, name)
                )
                count += 1
            logger.info(f"Migration {version:03d}_{name} applied successfully.")

        return count
    finally:
        conn.close()

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "meetings.db")
    applied_count = run_migrations(db_file)
    print(f"Applied {applied_count} migrations to {db_file}")
