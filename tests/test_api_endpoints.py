import pytest
import tempfile
import os
import gc
from fastapi.testclient import TestClient
from backend.main import app
import backend.db as db

@pytest.fixture
def client(monkeypatch):
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        test_db_path = tmp.name
    
    # Initialize test DB
    db.init_db(test_db_path)
    monkeypatch.setattr(db, "DB_PATH", test_db_path)
    
    test_client = TestClient(app)
    yield test_client
    
    gc.collect()
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
    except Exception:
        pass

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "sqlite_wal"
    assert data["schema_version"] == 6

def test_preset_validation(client):
    # Empty title should fail Pydantic validation (422)
    res = client.post("/api/presets", json={"title": "", "prompt": "Some valid prompt here"})
    assert res.status_code == 422

    # Short prompt (<10 chars) should fail Pydantic validation (422)
    res = client.post("/api/presets", json={"title": "Valid Title", "prompt": "short"})
    assert res.status_code == 422

    # Valid preset should succeed (201)
    res = client.post("/api/presets", json={
        "title": "Custom Executive MoM",
        "prompt": "Synthesize this transcript into formal executive minutes."
    })
    assert res.status_code == 201
    assert res.json()["preset"]["title"] == "Custom Executive MoM"

def test_chunk_upload_flow(client):
    # 1. Init upload session
    init_res = client.post("/api/uploads/init", json={
        "filename": "quarterly_all_hands.mp4",
        "filesize": 1048576,
        "media_type": "mp4",
        "total_chunks": 2,
    })
    assert init_res.status_code == 200
    upload_id = init_res.json()["upload_id"]
    assert upload_id is not None

    # 2. Query session status
    get_res = client.get(f"/api/uploads/{upload_id}")
    assert get_res.status_code == 200
    assert get_res.json()["filename"] == "quarterly_all_hands.mp4"
    assert get_res.json()["received_chunks"] == []

    # 3. Upload chunk index out of bounds
    out_of_bounds = client.put(f"/api/uploads/{upload_id}/chunks/5", content=b"chunk data")
    assert out_of_bounds.status_code == 400
    assert out_of_bounds.json()["error"]["code"] == "UPLOAD_INVALID"

    # 4. Upload valid chunk 0
    c0 = client.put(f"/api/uploads/{upload_id}/chunks/0", content=b"first chunk data")
    assert c0.status_code == 200
    assert c0.json()["received_count"] == 1

    # 5. Cancel upload session
    del_res = client.delete(f"/api/uploads/{upload_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "cancelled"

    # Verify session is cleaned up
    not_found = client.get(f"/api/uploads/{upload_id}")
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "NOT_FOUND"

def test_rate_limiting(client):
    # Trigger share view rate limiting
    for i in range(12):
        res = client.get("/api/share/fake_token_test")
        if res.status_code == 429:
            assert res.json()["error"]["code"] == "RATE_LIMITED"
            assert res.json()["error"]["retryable"] is True
            break
