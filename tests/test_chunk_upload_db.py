import os
import tempfile
import gc
import pytest
import backend.db as db

@pytest.fixture
def temp_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    db.init_db(db_path)
    yield db_path
    gc.collect()
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass

def test_persistent_chunk_upload_sessions(temp_db):
    upload_id = "test-session-12345"
    
    # 1. Create upload session
    sess = db.create_upload_session(
        upload_id=upload_id,
        filename="big_recording.mp4",
        filesize=25 * 1024 * 1024,
        media_type="mp4",
        total_chunks=5,
        job_dir="/tmp/summai_job_test",
        user_email="user@test.com",
        db_path=temp_db,
    )
    assert sess["upload_id"] == upload_id
    assert sess["total_chunks"] == 5
    assert sess["received_chunks"] == []

    # 2. Add chunks (including duplicate retry)
    chunks = db.add_received_chunk(upload_id, 0, db_path=temp_db)
    assert chunks == [0]
    chunks = db.add_received_chunk(upload_id, 2, db_path=temp_db)
    assert chunks == [0, 2]
    # Retrying chunk 0 should not duplicate
    chunks = db.add_received_chunk(upload_id, 0, db_path=temp_db)
    assert chunks == [0, 2]

    # 3. Simulate backend restart & restore session
    restored = db.get_upload_session(upload_id, db_path=temp_db)
    assert restored is not None
    assert restored["filename"] == "big_recording.mp4"
    assert restored["received_chunks"] == [0, 2]

    # 4. Clean up session
    db.delete_upload_session(upload_id, db_path=temp_db)
    assert db.get_upload_session(upload_id, db_path=temp_db) is None
