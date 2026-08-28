"""Migration 002: Add structured meeting columns and composite indexes."""

def up(cursor):
    cursor.execute("PRAGMA table_info(meetings);")
    existing_cols = {col[1] for col in cursor.fetchall()}

    columns_to_add = [
        ("title", "TEXT"),
        ("duration_seconds", "REAL DEFAULT 0"),
        ("provider_stt", "TEXT DEFAULT 'Groq Whisper'"),
        ("provider_llm", "TEXT DEFAULT 'Google Gemini Flash'"),
        ("segments_json", "TEXT DEFAULT '[]'"),
        ("speakers_json", "TEXT DEFAULT '[]'"),
        ("action_items_json", "TEXT DEFAULT '[]'"),
        ("status", "TEXT DEFAULT 'completed'"),
        ("folder_id", "INTEGER DEFAULT NULL"),
        ("processing_status", "TEXT DEFAULT 'done'"),
        ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ]

    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_type};")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_user_created ON meetings(user_email, created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_folder ON meetings(folder_id);")

def down(cursor):
    pass
