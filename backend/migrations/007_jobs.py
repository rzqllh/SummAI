import sqlite3

def up(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            user_email TEXT NOT NULL DEFAULT 'default',
            status TEXT NOT NULL DEFAULT 'pending',
            filename TEXT NOT NULL,
            media_type TEXT NOT NULL DEFAULT 'mp4',
            filesize INTEGER NOT NULL DEFAULT 0,
            progress INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_email, status);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);")

def down(conn: sqlite3.Connection):
    conn.execute("DROP TABLE IF EXISTS jobs;")
