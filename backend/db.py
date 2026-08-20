import sqlite3
from datetime import datetime
import os

DB_NAME = "meetings.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
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
    conn.commit()
    conn.close()

def save_meeting(filename: str, media_type: str, raw_transcript: str, summary: str):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO meetings (filename, media_type, raw_transcript, summary, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (filename, media_type, raw_transcript, summary, datetime.now()))
    conn.commit()
    meeting_id = cursor.lastrowid
    conn.close()
    return meeting_id

def get_all_meetings():
    if not os.path.exists(DB_NAME):
        return []
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, media_type, raw_transcript, summary, created_at FROM meetings ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    meetings = []
    for row in rows:
        meetings.append({
            "id": row[0],
            "filename": row[1],
            "media_type": row[2],
            "raw_transcript": row[3],
            "summary": row[4],
            "created_at": row[5]
        })
    return meetings

def get_meeting(meeting_id: int):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, media_type, raw_transcript, summary, created_at FROM meetings WHERE id = ?', (meeting_id,))
    row = cursor.fetchone()
    conn.close()
    
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
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    conn.close()

def search_meetings(query: str = "", media_type: str = ""):
    if not os.path.exists(DB_NAME):
        return []
    conn = sqlite3.connect(DB_NAME)
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
    conn.close()
    
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
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), COALESCE(SUM(LENGTH(raw_transcript)), 0) FROM meetings")
    row = cursor.fetchone()
    conn.close()
    
    count = row[0] if row else 0
    total_chars = row[1] if row else 0
    
    return {
        "total_meetings": count,
        "total_characters": total_chars,
        "estimated_minutes": round(total_chars / 500, 1),
        "hours_saved": round(count * 0.75, 1)
    }

# Initialize on import
init_db()

