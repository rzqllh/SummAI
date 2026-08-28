"""Migration 001: Initial schema with meetings table and presets."""

def up(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            media_type TEXT,
            raw_transcript TEXT,
            summary TEXT,
            user_email TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS custom_presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            prompt TEXT NOT NULL,
            user_email TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

def down(cursor):
    cursor.execute("DROP TABLE IF EXISTS meetings;")
    cursor.execute("DROP TABLE IF EXISTS custom_presets;")
