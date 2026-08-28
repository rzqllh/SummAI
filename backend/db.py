import sqlite3
import os
import json
import hashlib
import secrets
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from backend.migration_runner import run_migrations

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "meetings.db"))

def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db(db_path: Optional[str] = None):
    target_path = db_path or DB_PATH
    run_migrations(target_path)
    with get_connection(target_path) as conn:
        try:
            conn.execute("ALTER TABLE tags ADD COLUMN color TEXT DEFAULT '#38bdf8';")
        except Exception:
            pass

# --- PASSWORD HASHING (PBKDF2-HMAC-SHA256 with Salt) ---

def hash_password(password: str) -> tuple[str, str]:
    """Generates a secure PBKDF2-HMAC-SHA256 hash and 16-byte hex salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        600_000
    ).hex()
    return pw_hash, salt

def verify_password(password: str, pw_hash: str, salt: str) -> bool:
    """Verifies a password against a stored PBKDF2 hash using constant-time comparison."""
    if not password or not pw_hash or not salt:
        return False
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        600_000
    ).hex()
    return secrets.compare_digest(computed_hash, pw_hash)

# --- PERSISTENT CHUNK UPLOAD SESSIONS ---

def create_upload_session(
    upload_id: str,
    filename: str,
    filesize: int,
    media_type: str,
    total_chunks: int,
    job_dir: str,
    user_email: str = "default",
    db_path: Optional[str] = None
) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        conn.execute("""
            INSERT INTO upload_sessions (id, user_email, filename, filesize, media_type, total_chunks, received_chunks, job_dir, status)
            VALUES (?, ?, ?, ?, ?, ?, '[]', ?, 'uploading');
        """, (upload_id, user_email, filename, filesize, media_type, total_chunks, job_dir))
        return {
            "upload_id": upload_id,
            "filename": filename,
            "filesize": filesize,
            "total_chunks": total_chunks,
            "received_chunks": [],
            "status": "uploading"
        }

def get_upload_session(upload_id: str, user_email: Optional[str] = None, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        if user_email and user_email != "default":
            cursor = conn.execute("SELECT * FROM upload_sessions WHERE id = ? AND user_email = ?;", (upload_id, user_email))
        else:
            cursor = conn.execute("SELECT * FROM upload_sessions WHERE id = ?;", (upload_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "user_email": row["user_email"],
            "filename": row["filename"],
            "filesize": row["filesize"],
            "media_type": row["media_type"],
            "total_chunks": row["total_chunks"],
            "received_chunks": json.loads(row["received_chunks"] or "[]"),
            "job_dir": row["job_dir"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

def add_received_chunk(upload_id: str, chunk_index: int, db_path: Optional[str] = None) -> List[int]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("SELECT received_chunks FROM upload_sessions WHERE id = ?;", (upload_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Upload session not found")
        chunks = set(json.loads(row["received_chunks"] or "[]"))
        chunks.add(chunk_index)
        chunks_list = sorted(list(chunks))
        conn.execute("""
            UPDATE upload_sessions 
            SET received_chunks = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (json.dumps(chunks_list), upload_id))
        return chunks_list

def delete_upload_session(upload_id: str, user_email: Optional[str] = None, db_path: Optional[str] = None):
    with get_connection(db_path) as conn:
        if user_email and user_email != "default":
            conn.execute("DELETE FROM upload_sessions WHERE id = ? AND user_email = ?;", (upload_id, user_email))
        else:
            conn.execute("DELETE FROM upload_sessions WHERE id = ?;", (upload_id,))

def get_stale_upload_sessions(max_age_seconds: int = 86400, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT * FROM upload_sessions 
            WHERE (strftime('%s', 'now') - strftime('%s', updated_at)) > ?;
        """, (max_age_seconds,))
        return [dict(row) for row in cursor.fetchall()]

# --- MEETINGS CRUD ---

def save_meeting(
    filename: str,
    media_type: str,
    raw_transcript: str,
    summary: str,
    user_email: str = "default",
    title: Optional[str] = None,
    duration_seconds: float = 0,
    provider_stt: str = "Groq Whisper",
    provider_llm: str = "Google Gemini Flash",
    segments: Optional[List[Dict[str, Any]]] = None,
    speakers: Optional[List[str]] = None,
    action_items: Optional[List[Dict[str, Any]]] = None,
    folder_id: Optional[int] = None,
    db_path: Optional[str] = None,
) -> int:
    resolved_title = title or filename
    segments_json = json.dumps(segments or [])
    speakers_json = json.dumps(speakers or [])
    action_items_json = json.dumps(action_items or [])

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO meetings (
                filename, media_type, raw_transcript, summary, user_email,
                title, duration_seconds, provider_stt, provider_llm,
                segments_json, speakers_json, action_items_json, folder_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            filename, media_type, raw_transcript, summary, user_email,
            resolved_title, duration_seconds, provider_stt, provider_llm,
            segments_json, speakers_json, action_items_json, folder_id
        ))
        meeting_id = cursor.lastrowid

        # Insert extracted action items into relational table
        if action_items:
            for item in action_items:
                cursor.execute("""
                    INSERT INTO action_items (meeting_id, user_email, task, owner, target_date, status)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    meeting_id,
                    user_email,
                    item.get("task", ""),
                    item.get("owner"),
                    item.get("target_date") or item.get("target"),
                    item.get("status", "open")
                ))

        return meeting_id

def get_all_meetings(user_email: str = "default", folder_id: Optional[int] = None, tag_id: Optional[int] = None, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        params: List[Any] = [user_email]
        sql = "SELECT m.* FROM meetings m"
        if tag_id is not None:
            sql += " JOIN meeting_tags mt ON mt.meeting_id = m.id WHERE m.user_email = ? AND mt.tag_id = ?"
            params.append(tag_id)
        else:
            sql += " WHERE m.user_email = ?"
        
        if folder_id is not None:
            sql += " AND m.folder_id = ?"
            params.append(folder_id)
            
        sql += " ORDER BY m.created_at DESC;"
        cursor = conn.execute(sql, params)
        meetings = [dict(row) for row in cursor.fetchall()]

        # Attach tags to each meeting
        for m in meetings:
            t_cursor = conn.execute("""
                SELECT t.id, t.name, t.color FROM tags t
                JOIN meeting_tags mt ON mt.tag_id = t.id
                WHERE mt.meeting_id = ?
                ORDER BY t.name ASC;
            """, (m["id"],))
            m["tags"] = [dict(r) for r in t_cursor.fetchall()]

        return meetings

def get_meeting(meeting_id: int, user_email: str = "default", db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT * FROM meetings 
            WHERE id = ? AND user_email = ?;
        """, (meeting_id, user_email))
        row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        t_cursor = conn.execute("""
            SELECT t.id, t.name, t.color FROM tags t
            JOIN meeting_tags mt ON mt.tag_id = t.id
            WHERE mt.meeting_id = ?
            ORDER BY t.name ASC;
        """, (meeting_id,))
        res["tags"] = [dict(r) for r in t_cursor.fetchall()]
        return res

def delete_meeting(meeting_id: int, user_email: str = "default", db_path: Optional[str] = None):
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM meeting_tags WHERE meeting_id = ?;", (meeting_id,))
        conn.execute("DELETE FROM meetings WHERE id = ? AND user_email = ?;", (meeting_id, user_email))

def search_meetings(query: str, media_type: str = "", user_email: str = "default", db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        params: List[Any] = [user_email]
        sql = "SELECT * FROM meetings WHERE user_email = ?"
        
        if query:
            sql += " AND (filename LIKE ? OR raw_transcript LIKE ? OR summary LIKE ? OR title LIKE ?)"
            like_q = f"%{query}%"
            params.extend([like_q, like_q, like_q, like_q])
            
        if media_type and media_type != "all":
            sql += " AND media_type = ?"
            params.append(media_type)
            
        sql += " ORDER BY created_at DESC;"
        cursor = conn.execute(sql, params)
        meetings = [dict(row) for row in cursor.fetchall()]

        for m in meetings:
            t_cursor = conn.execute("""
                SELECT t.id, t.name, t.color FROM tags t
                JOIN meeting_tags mt ON mt.tag_id = t.id
                WHERE mt.meeting_id = ?
                ORDER BY t.name ASC;
            """, (m["id"],))
            m["tags"] = [dict(r) for r in t_cursor.fetchall()]

        return meetings

# --- ACTION ITEMS CRUD ---

def get_user_action_items(user_email: str = "default", status: Optional[str] = None, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        if status and status != "all":
            cursor = conn.execute("""
                SELECT a.*, m.title as meeting_title, m.filename as meeting_filename
                FROM action_items a
                JOIN meetings m ON a.meeting_id = m.id
                WHERE a.user_email = ? AND a.status = ?
                ORDER BY a.created_at DESC;
            """, (user_email, status))
        else:
            cursor = conn.execute("""
                SELECT a.*, m.title as meeting_title, m.filename as meeting_filename
                FROM action_items a
                JOIN meetings m ON a.meeting_id = m.id
                WHERE a.user_email = ?
                ORDER BY a.created_at DESC;
            """, (user_email,))
        return [dict(row) for row in cursor.fetchall()]

def update_action_item_status(item_id: int, status: str, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            UPDATE action_items 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_email = ?;
        """, (status, item_id, user_email))
        return cursor.rowcount > 0

# --- FOLDERS & TAGS CRUD ---

def get_folders(user_email: str = "default", db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT f.*, COUNT(m.id) as meeting_count
            FROM folders f
            LEFT JOIN meetings m ON m.folder_id = f.id
            WHERE f.user_email = ?
            GROUP BY f.id
            ORDER BY f.name ASC;
        """, (user_email,))
        return [dict(row) for row in cursor.fetchall()]

def create_folder(name: str, color: str = "#10b981", user_email: str = "default", db_path: Optional[str] = None) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO folders (name, color, user_email) VALUES (?, ?, ?);", (name, color, user_email))
        return {"id": cursor.lastrowid, "name": name, "color": color, "meeting_count": 0}

def rename_folder(folder_id: int, name: str, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        cursor = conn.execute("UPDATE folders SET name = ? WHERE id = ? AND user_email = ?;", (name, folder_id, user_email))
        return cursor.rowcount > 0

def delete_folder(folder_id: int, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        # Move meetings in this folder to Uncategorized (NULL)
        conn.execute("UPDATE meetings SET folder_id = NULL WHERE folder_id = ? AND user_email = ?;", (folder_id, user_email))
        cursor = conn.execute("DELETE FROM folders WHERE id = ? AND user_email = ?;", (folder_id, user_email))
        return cursor.rowcount > 0

# --- TAGS CRUD ---

def get_tags(user_email: str = "default", db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT t.*, COUNT(mt.meeting_id) as meeting_count
            FROM tags t
            LEFT JOIN meeting_tags mt ON mt.tag_id = t.id
            WHERE t.user_email = ?
            GROUP BY t.id
            ORDER BY t.name ASC;
        """, (user_email,))
        return [dict(row) for row in cursor.fetchall()]

def create_tag(name: str, color: str = "#38bdf8", user_email: str = "default", db_path: Optional[str] = None) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        clean_name = name.strip()
        conn.execute("INSERT OR IGNORE INTO tags (name, color, user_email) VALUES (?, ?, ?);", (clean_name, color, user_email))
        cursor = conn.execute("SELECT id, name, color, user_email FROM tags WHERE name = ? AND user_email = ?;", (clean_name, user_email))
        row = cursor.fetchone()
        return dict(row) if row else {"id": 0, "name": clean_name, "color": color, "meeting_count": 0}

def delete_tag(tag_id: int, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM meeting_tags WHERE tag_id = ?;", (tag_id,))
        cursor = conn.execute("DELETE FROM tags WHERE id = ? AND user_email = ?;", (tag_id, user_email))
        return cursor.rowcount > 0

def assign_tag_to_meeting(meeting_id: int, tag_id: int, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        cursor = conn.execute("SELECT id FROM meetings WHERE id = ? AND user_email = ?;", (meeting_id, user_email))
        if not cursor.fetchone():
            return False
        conn.execute("INSERT OR IGNORE INTO meeting_tags (meeting_id, tag_id) VALUES (?, ?);", (meeting_id, tag_id))
        return True

def remove_tag_from_meeting(meeting_id: int, tag_id: int, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    with get_connection(db_path) as conn:
        cursor = conn.execute("DELETE FROM meeting_tags WHERE meeting_id = ? AND tag_id = ?;", (meeting_id, tag_id))
        return cursor.rowcount > 0

# --- SECURE SHAREABLE LINKS ---

def create_share_link(
    meeting_id: int,
    allow_transcript: bool = True,
    password: Optional[str] = None,
    expires_in_days: Optional[int] = 30,
    user_email: str = "default",
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    # 1. Verify meeting ownership
    meeting = get_meeting(meeting_id, user_email=user_email, db_path=db_path)
    if not meeting:
        raise ValueError("Meeting not found or unauthorized.")

    # 2. Generate cryptographically secure token and SHA-256 hash
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # 3. Hash password using PBKDF2-HMAC-SHA256 with salt
    pw_hash = None
    pw_salt = None
    if password and password.strip():
        pw_hash, pw_salt = hash_password(password.strip())

    # 4. Expiration timestamp
    expires_at = None
    if expires_in_days:
        expires_at = datetime.fromtimestamp(time.time() + expires_in_days * 86400, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    with get_connection(db_path) as conn:
        conn.execute("""
            INSERT INTO share_links (
                meeting_id, token_hash, password_hash, password_salt,
                allow_transcript, expires_at, user_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            meeting_id, token_hash, pw_hash, pw_salt,
            1 if allow_transcript else 0, expires_at, user_email
        ))

    return {
        "share_token": raw_token,
        "allow_transcript": allow_transcript,
        "has_password": bool(password and password.strip()),
        "expires_at": expires_at,
    }

def get_shared_meeting(token: str, password: Optional[str] = None, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT s.*, m.title, m.filename, m.media_type, m.summary, m.raw_transcript, m.created_at as meeting_created_at
            FROM share_links s
            JOIN meetings m ON s.meeting_id = m.id
            WHERE s.token_hash = ? AND s.is_revoked = 0;
        """, (token_hash,))
        row = cursor.fetchone()
        if not row:
            return None

        # Check expiration
        if row["expires_at"]:
            try:
                exp = datetime.strptime(row["expires_at"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > exp:
                    return None
            except Exception:
                pass

        # Check password requirement
        if row["password_hash"]:
            if not password:
                return {
                    "password_required": True,
                    "title": row["title"] or row["filename"],
                    "created_at": row["meeting_created_at"],
                }
            if not verify_password(password, row["password_hash"], row["password_salt"]):
                return {"error": "Invalid password", "password_required": True}

        # Increment view count
        conn.execute("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?;", (row["id"],))

        return {
            "title": row["title"] or row["filename"],
            "filename": row["filename"],
            "media_type": row["media_type"],
            "summary": row["summary"],
            "raw_transcript": row["raw_transcript"] if row["allow_transcript"] else None,
            "created_at": row["meeting_created_at"],
            "allow_transcript": bool(row["allow_transcript"]),
        }

def revoke_share_link(token: str, user_email: str = "default", db_path: Optional[str] = None) -> bool:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            UPDATE share_links 
            SET is_revoked = 1 
            WHERE token_hash = ? AND user_email = ?;
        """, (token_hash, user_email))
        return cursor.rowcount > 0

def regenerate_share_token(old_token: str, user_email: str = "default", db_path: Optional[str] = None) -> Optional[str]:
    old_hash = hashlib.sha256(old_token.encode("utf-8")).hexdigest()
    new_raw_token = secrets.token_urlsafe(32)
    new_hash = hashlib.sha256(new_raw_token.encode("utf-8")).hexdigest()
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            UPDATE share_links 
            SET token_hash = ?, is_revoked = 0 
            WHERE token_hash = ? AND user_email = ?;
        """, (new_hash, old_hash, user_email))
        if cursor.rowcount > 0:
            return new_raw_token
    return None

# --- PRESETS CRUD ---

def get_custom_presets(user_email: str = "default", db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT id, title, prompt, created_at
            FROM custom_presets
            WHERE user_email = ?
            ORDER BY id ASC;
        """, (user_email,))
        rows = cursor.fetchall()
        return [
            {
                "id": f"custom_{r['id']}",
                "title": r["title"],
                "description": r["prompt"][:80] + "..." if len(r["prompt"]) > 80 else r["prompt"],
                "prompt": r["prompt"],
                "custom": True,
            }
            for r in rows
        ]

def save_custom_preset(title: str, prompt: str, user_email: str = "default", db_path: Optional[str] = None) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO custom_presets (title, prompt, user_email) VALUES (?, ?, ?);", (title, prompt, user_email))
        db_id = cursor.lastrowid
        return {
            "id": f"custom_{db_id}",
            "title": title,
            "description": prompt[:80] + "..." if len(prompt) > 80 else prompt,
            "prompt": prompt,
            "custom": True,
        }

def delete_custom_preset(db_id: int, user_email: str = "default", db_path: Optional[str] = None):
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM custom_presets WHERE id = ? AND user_email = ?;", (db_id, user_email))

# --- JOBS BATCH PROCESSING CRUD ---

def create_job(
    job_id: str,
    filename: str,
    media_type: str = "mp4",
    filesize: int = 0,
    user_email: str = "default",
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        conn.execute("""
            INSERT INTO jobs (id, user_email, status, filename, media_type, filesize, progress)
            VALUES (?, ?, 'pending', ?, ?, ?, 0);
        """, (job_id, user_email, filename, media_type, filesize))
        return {
            "id": job_id,
            "status": "pending",
            "filename": filename,
            "media_type": media_type,
            "filesize": filesize,
            "progress": 0,
        }

def get_user_jobs(user_email: str = "default", db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT * FROM jobs
            WHERE user_email = ?
            ORDER BY created_at DESC
            LIMIT 50;
        """, (user_email,))
        return [dict(row) for row in cursor.fetchall()]

def get_job(job_id: str, user_email: str = "default", db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT * FROM jobs
            WHERE id = ? AND user_email = ?;
        """, (job_id, user_email))
        row = cursor.fetchone()
        return dict(row) if row else None

def update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    meeting_id: Optional[int] = None,
    error_message: Optional[str] = None,
    user_email: str = "default",
    db_path: Optional[str] = None,
):
    with get_connection(db_path) as conn:
        conn.execute("""
            UPDATE jobs
            SET status = ?, progress = ?, meeting_id = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_email = ?;
        """, (status, progress, meeting_id, error_message, job_id, user_email))

def get_pending_jobs(limit: int = 5, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT * FROM jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?;
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]

def delete_job(job_id: str, user_email: str = "default", db_path: Optional[str] = None):
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM jobs WHERE id = ? AND user_email = ?;", (job_id, user_email))

# --- USER WORKSPACE DATA BACKUP & EXPORT ---

def export_user_workspace(user_email: str = "default", db_path: Optional[str] = None) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        meetings = [dict(r) for r in conn.execute("SELECT * FROM meetings WHERE user_email = ? ORDER BY created_at ASC;", (user_email,)).fetchall()]
        actions = [dict(r) for r in conn.execute("SELECT * FROM action_items WHERE user_email = ? ORDER BY created_at ASC;", (user_email,)).fetchall()]
        folders = [dict(r) for r in conn.execute("SELECT * FROM folders WHERE user_email = ? ORDER BY id ASC;", (user_email,)).fetchall()]
        tags = [dict(r) for r in conn.execute("SELECT * FROM tags WHERE user_email = ? ORDER BY id ASC;", (user_email,)).fetchall()]
        presets = [dict(r) for r in conn.execute("SELECT * FROM custom_presets WHERE user_email = ? ORDER BY id ASC;", (user_email,)).fetchall()]
        
        return {
            "version": "1.0.0",
            "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "user_email": user_email,
            "counts": {
                "meetings": len(meetings),
                "action_items": len(actions),
                "folders": len(folders),
                "tags": len(tags),
                "presets": len(presets),
            },
            "meetings": meetings,
            "action_items": actions,
            "folders": folders,
            "tags": tags,
            "presets": presets,
        }

# --- STATS ---

def get_stats(user_email: str = "default", db_path: Optional[str] = None) -> Dict[str, Any]:
    with get_connection(db_path) as conn:
        m_count = conn.execute("SELECT COUNT(*) FROM meetings WHERE user_email = ?;", (user_email,)).fetchone()[0]
        a_count = conn.execute("SELECT COUNT(*) FROM action_items WHERE user_email = ? AND status = 'open';", (user_email,)).fetchone()[0]
        f_count = conn.execute("SELECT COUNT(*) FROM folders WHERE user_email = ?;", (user_email,)).fetchone()[0]
        return {
            "total_meetings": m_count,
            "open_action_items": a_count,
            "total_folders": f_count,
        }

# Run migrations at module load
init_db()
