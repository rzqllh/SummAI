import sqlite3
from datetime import datetime
import os

# Deterministic absolute path to meetings.db in root project directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_NAME = os.path.join(BASE_DIR, "meetings.db")

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    # Enable Write-Ahead Logging for better concurrent read/write performance
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                media_type TEXT,
                raw_transcript TEXT,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

def save_meeting(filename: str, media_type: str, raw_transcript: str, summary: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO meetings (filename, media_type, raw_transcript, summary, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (filename, media_type, raw_transcript, summary, datetime.now()))
        conn.commit()
        return cursor.lastrowid

def get_all_meetings():
    if not os.path.exists(DB_NAME):
        return []
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, filename, media_type, raw_transcript, summary, created_at FROM meetings ORDER BY created_at DESC')
        rows = cursor.fetchall()
        
    return [
        {
            "id": row[0],
            "filename": row[1],
            "media_type": row[2],
            "raw_transcript": row[3],
            "summary": row[4],
            "created_at": row[5]
        }
        for row in rows
    ]

def get_meeting(meeting_id: int):
    if not os.path.exists(DB_NAME):
        return None
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, filename, media_type, raw_transcript, summary, created_at FROM meetings WHERE id = ?', (meeting_id,))
        row = cursor.fetchone()
        
    if row:
        return {
            "id": row[0],
            "filename": row[1],
            "media_type": row[2],
            "raw_transcript": row[3],
            "summary": row[4],
            "created_at": row[5]
        }
    return None

def delete_meeting(meeting_id: int):
    if not os.path.exists(DB_NAME):
        return
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
        conn.commit()

def search_meetings(query: str = "", media_type: str = ""):
    if not os.path.exists(DB_NAME):
        return []
    with get_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT id, filename, media_type, raw_transcript, summary, created_at FROM meetings WHERE 1=1"
        params = []
        if query:
            q = f"%{query}%"
            sql += " AND (filename LIKE ? OR raw_transcript LIKE ? OR summary LIKE ?)"
            params.extend([q, q, q])
        if media_type and media_type != "all":
            sql += " AND media_type = ?"
            params.append(media_type)
        sql += " ORDER BY created_at DESC"
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
    return [
        {
            "id": row[0],
            "filename": row[1],
            "media_type": row[2],
            "raw_transcript": row[3],
            "summary": row[4],
            "created_at": row[5]
        }
        for row in rows
    ]

def get_stats():
    if not os.path.exists(DB_NAME):
        return {"total_meetings": 0, "total_characters": 0, "estimated_minutes": 0, "hours_saved": 0}
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(LENGTH(raw_transcript)), 0) FROM meetings")
        row = cursor.fetchone()
        
    count = row[0] if row else 0
    total_chars = row[1] if row else 0
    
    return {
        "total_meetings": count,
        "total_characters": total_chars,
        "estimated_minutes": round(total_chars / 500, 1),
        "hours_saved": round(count * 0.75, 1)
    }

def get_custom_presets() -> list[dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, prompt FROM custom_presets ORDER BY created_at ASC")
        rows = cursor.fetchall()
    return [{"id": f"custom_{row[0]}", "db_id": row[0], "title": row[1], "prompt": row[2], "custom": True} for row in rows]

def save_custom_preset(title: str, prompt: str) -> dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO custom_presets (title, prompt) VALUES (?, ?)", (title, prompt))
        conn.commit()
        new_id = cursor.lastrowid
    return {"id": f"custom_{new_id}", "db_id": new_id, "title": title, "prompt": prompt, "custom": True}

def delete_custom_preset(db_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM custom_presets WHERE id = ?", (db_id,))
        conn.commit()

# Initialize on import
init_db()
