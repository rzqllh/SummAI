"""Migration 006: Create upload_sessions table for persistent resumable chunk uploads."""

def up(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS upload_sessions (
            id TEXT PRIMARY KEY,
            user_email TEXT DEFAULT 'default',
            filename TEXT NOT NULL,
            filesize INTEGER NOT NULL,
            media_type TEXT NOT NULL,
            total_chunks INTEGER NOT NULL,
            received_chunks TEXT NOT NULL DEFAULT '[]',
            job_dir TEXT NOT NULL,
            status TEXT DEFAULT 'uploading',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions(user_email, status);")

def down(cursor):
    cursor.execute("DROP TABLE IF EXISTS upload_sessions;")
