"""Migration 003: Create folders, tags, and meeting_tags tables."""

def up(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#10b981',
            user_email TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#38bdf8',
            user_email TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, user_email)
        );
    """)
    try:
        cursor.execute("ALTER TABLE tags ADD COLUMN color TEXT DEFAULT '#38bdf8';")
    except Exception:
        pass
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_tags (
            meeting_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (meeting_id, tag_id),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_email);")

def down(cursor):
    cursor.execute("DROP TABLE IF EXISTS meeting_tags;")
    cursor.execute("DROP TABLE IF EXISTS tags;")
    cursor.execute("DROP TABLE IF EXISTS folders;")
