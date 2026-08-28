"""Migration 005: Create share_links table."""

def up(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS share_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            password_hash TEXT DEFAULT NULL,
            password_salt TEXT DEFAULT NULL,
            allow_transcript INTEGER DEFAULT 1,
            view_count INTEGER DEFAULT 0,
            expires_at TIMESTAMP DEFAULT NULL,
            is_revoked INTEGER DEFAULT 0,
            user_email TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token_hash);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_share_links_meeting ON share_links(meeting_id);")

def down(cursor):
    cursor.execute("DROP TABLE IF EXISTS share_links;")
