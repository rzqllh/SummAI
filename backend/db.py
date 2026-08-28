import sqlite3
from datetime import datetime
import os
import json
import hashlib
import secrets
from typing import Optional, List, Dict, Any

# Deterministic absolute path to meetings.db in root project directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_NAME = os.path.join(BASE_DIR, "meetings.db")

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    # Enable Write-Ahead Logging for better concurrent read/write performance
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def _migrate_columns(conn: sqlite3.Connection):
    cursor = conn.cursor()
    # Check meetings table columns
    cursor.execute("PRAGMA table_info(meetings)")
    meetings_cols = [col[1] for col in cursor.fetchall()]
    
    new_cols = [
        ("title", "TEXT DEFAULT NULL"),
        ("duration_seconds", "REAL DEFAULT 0"),
        ("provider_stt", "TEXT DEFAULT NULL"),
        ("provider_llm", "TEXT DEFAULT NULL"),
        ("segments_json", "TEXT DEFAULT '[]'"),
        ("speakers_json", "TEXT DEFAULT '[]'"),
        ("action_items_json", "TEXT DEFAULT '[]'"),
        ("status", "TEXT DEFAULT 'completed'"),
        ("folder_id", "INTEGER DEFAULT NULL"),
        ("processing_status", "TEXT DEFAULT 'completed'"),
        ("processing_error", "TEXT DEFAULT NULL"),
        ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ("user_email", "TEXT DEFAULT 'default'"),
    ]
    for col_name, col_def in new_cols:
        if col_name not in meetings_cols:
            cursor.execute(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_def}")

    # Check custom_presets table columns
    cursor.execute("PRAGMA table_info(custom_presets)")
    preset_cols = [col[1] for col in cursor.fetchall()]
    if "user_email" not in preset_cols:
        cursor.execute("ALTER TABLE custom_presets ADD COLUMN user_email TEXT DEFAULT 'default'")

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Schema Version Tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Meetings Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                title TEXT,
                media_type TEXT,
                raw_transcript TEXT,
                summary TEXT,
                duration_seconds REAL DEFAULT 0,
                provider_stt TEXT,
                provider_llm TEXT,
                segments_json TEXT DEFAULT '[]',
                speakers_json TEXT DEFAULT '[]',
                action_items_json TEXT DEFAULT '[]',
                status TEXT DEFAULT 'completed',
                folder_id INTEGER DEFAULT NULL,
                processing_status TEXT DEFAULT 'completed',
                processing_error TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default'
            )
        ''')
        
        # Presets Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default'
            )
        ''')
        
        # Folders Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#10b981',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default'
            )
        ''')
        
        # Tags Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default',
                UNIQUE(name, user_email)
            )
        ''')
        
        # Meeting Tags Relation
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meeting_tags (
                meeting_id INTEGER,
                tag_id INTEGER,
                PRIMARY KEY (meeting_id, tag_id),
                FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )
        ''')
        
        # Action Items Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER,
                task TEXT NOT NULL,
                owner TEXT DEFAULT NULL,
                target_date TEXT DEFAULT NULL,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default',
                FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            )
        ''')
        
        # Share Links Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS share_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                password_hash TEXT DEFAULT NULL,
                allow_transcript INTEGER DEFAULT 1,
                expires_at TIMESTAMP DEFAULT NULL,
                revoked_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_email TEXT DEFAULT 'default',
                FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            )
        ''')
        
        _migrate_columns(conn)
        
        # Performance Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_user_created ON meetings(user_email, created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_user_folder ON meetings(user_email, folder_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_custom_presets_user ON custom_presets(user_email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_user_status ON action_items(user_email, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_email)")
        
        conn.commit()

# --- MEETINGS CRUD ---

def save_meeting(
    filename: str,
    media_type: str,
    raw_transcript: str,
    summary: str,
    user_email: str = "default",
    title: Optional[str] = None,
    duration_seconds: float = 0,
    provider_stt: Optional[str] = None,
    provider_llm: Optional[str] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    speakers: Optional[List[str]] = None,
    action_items: Optional[List[Dict[str, Any]]] = None,
    folder_id: Optional[int] = None,
) -> int:
    norm_user = (user_email or "default").strip().lower()
    clean_title = title.strip() if title and title.strip() else filename.replace("_", " ").replace("-", " ")
    segments_str = json.dumps(segments or [])
    speakers_str = json.dumps(speakers or [])
    action_items_str = json.dumps(action_items or [])
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO meetings (
                filename, title, media_type, raw_transcript, summary,
                duration_seconds, provider_stt, provider_llm,
                segments_json, speakers_json, action_items_json,
                folder_id, created_at, updated_at, user_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            filename, clean_title, media_type, raw_transcript, summary,
            duration_seconds, provider_stt, provider_llm,
            segments_str, speakers_str, action_items_str,
            folder_id, datetime.now(), datetime.now(), norm_user
        ))
        meeting_id = cursor.lastrowid
        
        # Also index action items into action_items table if present
        if action_items and meeting_id is not None:
            for item in action_items:
                cursor.execute('''
                    INSERT INTO action_items (meeting_id, task, owner, target_date, status, user_email)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    meeting_id,
                    item.get("task", ""),
                    item.get("owner"),
                    item.get("target_date") or item.get("target"),
                    item.get("status", "open"),
                    norm_user,
                ))
                
        conn.commit()
        return meeting_id if meeting_id is not None else 0

def get_all_meetings(user_email: str = "default", folder_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if not os.path.exists(DB_NAME):
        return []
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        if folder_id is not None:
            cursor.execute(
                'SELECT id, filename, title, media_type, raw_transcript, summary, duration_seconds, provider_stt, provider_llm, segments_json, speakers_json, action_items_json, folder_id, created_at, user_email FROM meetings WHERE user_email = ? AND folder_id = ? ORDER BY created_at DESC',
                (norm_user, folder_id)
            )
        else:
            cursor.execute(
                'SELECT id, filename, title, media_type, raw_transcript, summary, duration_seconds, provider_stt, provider_llm, segments_json, speakers_json, action_items_json, folder_id, created_at, user_email FROM meetings WHERE user_email = ? ORDER BY created_at DESC',
                (norm_user,)
            )
        rows = cursor.fetchall()
        
    return [
        {
            "id": row[0],
            "filename": row[1],
            "title": row[2] or row[1],
            "media_type": row[3],
            "raw_transcript": row[4],
            "summary": row[5],
            "duration_seconds": row[6],
            "provider_stt": row[7],
            "provider_llm": row[8],
            "segments": json.loads(row[9] or "[]"),
            "speakers": json.loads(row[10] or "[]"),
            "action_items": json.loads(row[11] or "[]"),
            "folder_id": row[12],
            "created_at": row[13],
            "user_email": row[14],
        }
        for row in rows
    ]

def get_meeting(meeting_id: int, user_email: str = "default") -> Optional[Dict[str, Any]]:
    if not os.path.exists(DB_NAME):
        return None
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, filename, title, media_type, raw_transcript, summary, duration_seconds, provider_stt, provider_llm, segments_json, speakers_json, action_items_json, folder_id, created_at, user_email FROM meetings WHERE id = ? AND user_email = ?',
            (meeting_id, norm_user)
        )
        row = cursor.fetchone()
        
    if row:
        return {
            "id": row[0],
            "filename": row[1],
            "title": row[2] or row[1],
            "media_type": row[3],
            "raw_transcript": row[4],
            "summary": row[5],
            "duration_seconds": row[6],
            "provider_stt": row[7],
            "provider_llm": row[8],
            "segments": json.loads(row[9] or "[]"),
            "speakers": json.loads(row[10] or "[]"),
            "action_items": json.loads(row[11] or "[]"),
            "folder_id": row[12],
            "created_at": row[13],
            "user_email": row[14],
        }
    return None

def update_meeting_title(meeting_id: int, title: str, user_email: str = "default") -> bool:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE meetings SET title = ?, updated_at = ? WHERE id = ? AND user_email = ?",
            (title.strip(), datetime.now(), meeting_id, norm_user)
        )
        conn.commit()
        return cursor.rowcount > 0

def delete_meeting(meeting_id: int, user_email: str = "default"):
    if not os.path.exists(DB_NAME):
        return
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        if norm_user == "admin":
            cursor.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
        else:
            cursor.execute("DELETE FROM meetings WHERE id = ? AND user_email = ?", (meeting_id, norm_user))
        conn.commit()

def search_meetings(query: str = "", media_type: str = "", user_email: str = "default") -> List[Dict[str, Any]]:
    if not os.path.exists(DB_NAME):
        return []
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT id, filename, title, media_type, raw_transcript, summary, duration_seconds, provider_stt, provider_llm, segments_json, speakers_json, action_items_json, folder_id, created_at, user_email FROM meetings WHERE user_email = ?"
        params: List[Any] = [norm_user]
        if query:
            q = f"%{query}%"
            sql += " AND (filename LIKE ? OR title LIKE ? OR raw_transcript LIKE ? OR summary LIKE ?)"
            params.extend([q, q, q, q])
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
            "title": row[2] or row[1],
            "media_type": row[3],
            "raw_transcript": row[4],
            "summary": row[5],
            "duration_seconds": row[6],
            "provider_stt": row[7],
            "provider_llm": row[8],
            "segments": json.loads(row[9] or "[]"),
            "speakers": json.loads(row[10] or "[]"),
            "action_items": json.loads(row[11] or "[]"),
            "folder_id": row[12],
            "created_at": row[13],
            "user_email": row[14],
        }
        for row in rows
    ]

# --- STATS & ANALYTICS ---

def get_stats(user_email: str = "default") -> Dict[str, Any]:
    if not os.path.exists(DB_NAME):
        return {
            "total_meetings": 0,
            "total_characters": 0,
            "estimated_minutes": 0,
            "hours_saved": 0,
            "open_action_items": 0,
            "completed_action_items": 0,
        }
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(LENGTH(raw_transcript)), 0) FROM meetings WHERE user_email = ?", (norm_user,))
        m_row = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM action_items WHERE user_email = ? AND status = 'open'", (norm_user,))
        open_actions = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM action_items WHERE user_email = ? AND status = 'done'", (norm_user,))
        done_actions = cursor.fetchone()[0]
        
    count = m_row[0] if m_row else 0
    total_chars = m_row[1] if m_row else 0
    
    return {
        "total_meetings": count,
        "total_characters": total_chars,
        "estimated_minutes": round(total_chars / 500, 1),
        "hours_saved": round(count * 0.75, 1),
        "open_action_items": open_actions,
        "completed_action_items": done_actions,
    }

# --- PRESETS CRUD ---

def get_custom_presets(user_email: str = "default") -> list[dict]:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, prompt FROM custom_presets WHERE user_email = ? ORDER BY created_at ASC", (norm_user,))
        rows = cursor.fetchall()
    return [{"id": f"custom_{row[0]}", "db_id": row[0], "title": row[1], "prompt": row[2], "custom": True} for row in rows]

def save_custom_preset(title: str, prompt: str, user_email: str = "default") -> dict:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO custom_presets (title, prompt, user_email) VALUES (?, ?, ?)", (title, prompt, norm_user))
        conn.commit()
        new_id = cursor.lastrowid
    return {"id": f"custom_{new_id}", "db_id": new_id, "title": title, "prompt": prompt, "custom": True}

def delete_custom_preset(db_id: int, user_email: str = "default"):
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM custom_presets WHERE id = ? AND user_email = ?", (db_id, norm_user))
        conn.commit()

# --- ACTION ITEMS CRUD ---

def get_user_action_items(user_email: str = "default", status: Optional[str] = None) -> List[Dict[str, Any]]:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                "SELECT a.id, a.meeting_id, a.task, a.owner, a.target_date, a.status, a.created_at, m.title FROM action_items a LEFT JOIN meetings m ON a.meeting_id = m.id WHERE a.user_email = ? AND a.status = ? ORDER BY a.created_at DESC",
                (norm_user, status)
            )
        else:
            cursor.execute(
                "SELECT a.id, a.meeting_id, a.task, a.owner, a.target_date, a.status, a.created_at, m.title FROM action_items a LEFT JOIN meetings m ON a.meeting_id = m.id WHERE a.user_email = ? ORDER BY a.created_at DESC",
                (norm_user,)
            )
        rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "meeting_id": r[1],
            "task": r[2],
            "owner": r[3],
            "target_date": r[4],
            "status": r[5],
            "created_at": r[6],
            "meeting_title": r[7] or "Untitled Meeting",
        }
        for r in rows
    ]

def update_action_item_status(item_id: int, status: str, user_email: str = "default") -> bool:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE action_items SET status = ? WHERE id = ? AND user_email = ?",
            (status, item_id, norm_user)
        )
        conn.commit()
        return cursor.rowcount > 0

# --- FOLDERS & TAGS ---

def get_folders(user_email: str = "default") -> List[Dict[str, Any]]:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, color, created_at FROM folders WHERE user_email = ? ORDER BY name ASC", (norm_user,))
        rows = cursor.fetchall()
    return [{"id": r[0], "name": r[1], "color": r[2], "created_at": r[3]} for r in rows]

def create_folder(name: str, color: str = "#10b981", user_email: str = "default") -> Dict[str, Any]:
    norm_user = (user_email or "default").strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO folders (name, color, user_email) VALUES (?, ?, ?)", (name.strip(), color, norm_user))
        conn.commit()
        new_id = cursor.lastrowid
    return {"id": new_id, "name": name.strip(), "color": color}

# --- SECURE SHAREABLE LINKS ---

def create_share_link(meeting_id: int, allow_transcript: bool = True, password: Optional[str] = None, user_email: str = "default") -> Dict[str, Any]:
    norm_user = (user_email or "default").strip().lower()
    token = secrets.token_urlsafe(24)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    pw_hash = hashlib.sha256(password.encode()).hexdigest() if password else None
    
    with get_connection() as conn:
        cursor = conn.cursor()
        # Verify meeting belongs to user
        cursor.execute("SELECT id FROM meetings WHERE id = ? AND user_email = ?", (meeting_id, norm_user))
        if not cursor.fetchone():
            raise ValueError("Meeting not found or access denied.")
            
        cursor.execute('''
            INSERT INTO share_links (meeting_id, token_hash, password_hash, allow_transcript, user_email)
            VALUES (?, ?, ?, ?, ?)
        ''', (meeting_id, token_hash, pw_hash, 1 if allow_transcript else 0, norm_user))
        conn.commit()
        
    return {
        "share_token": token,
        "allow_transcript": allow_transcript,
        "is_password_protected": bool(password),
    }

def get_shared_meeting(token: str, password: Optional[str] = None) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT s.meeting_id, s.password_hash, s.allow_transcript, s.expires_at, s.revoked_at,
                   m.title, m.filename, m.media_type, m.summary, m.raw_transcript, m.created_at
            FROM share_links s
            JOIN meetings m ON s.meeting_id = m.id
            WHERE s.token_hash = ?
        ''', (token_hash,))
        row = cursor.fetchone()
        
    if not row:
        return None
        
    pw_hash, allow_transcript, expires_at, revoked_at = row[1], row[2], row[3], row[4]
    if revoked_at:
        return {"error": "Link has been revoked."}
        
    if pw_hash:
        if not password:
            return {"password_required": True, "title": row[5] or row[6]}
        entered_hash = hashlib.sha256(password.encode()).hexdigest()
        if entered_hash != pw_hash:
            return {"error": "Invalid password.", "password_required": True}
            
    return {
        "title": row[5] or row[6],
        "filename": row[6],
        "media_type": row[7],
        "summary": row[8],
        "raw_transcript": row[9] if allow_transcript else None,
        "created_at": row[10],
    }

# Initialize on import
init_db()
