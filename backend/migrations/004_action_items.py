"""Migration 004: Create action_items table."""

def up(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS action_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            user_email TEXT DEFAULT 'default',
            task TEXT NOT NULL,
            owner TEXT,
            target_date TEXT,
            status TEXT DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_user_status ON action_items(user_email, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_id);")

def down(cursor):
    cursor.execute("DROP TABLE IF EXISTS action_items;")
