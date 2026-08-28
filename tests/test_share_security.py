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

def test_share_link_lifecycle_and_security(temp_db):
    # 1. Create meeting
    mid = db.save_meeting(
        filename="Security_Review.mp4",
        media_type="mp4",
        raw_transcript="Discussion about security protocols and secrets.",
        summary="Security protocols reviewed.",
        user_email="alice@example.com",
        db_path=temp_db
    )

    # 2. Create password protected share link
    share_res = db.create_share_link(
        meeting_id=mid,
        allow_transcript=True,
        password="SuperSecretPassword123!",
        user_email="alice@example.com",
        db_path=temp_db
    )
    raw_token = share_res["share_token"]
    assert raw_token is not None

    # 3. Accessing without password should return password_required
    view_no_pw = db.get_shared_meeting(raw_token, db_path=temp_db)
    assert view_no_pw["password_required"] is True
    assert "summary" not in view_no_pw or view_no_pw["summary"] is None

    # 4. Accessing with WRONG password should return error
    view_wrong_pw = db.get_shared_meeting(raw_token, password="WrongPassword", db_path=temp_db)
    assert view_wrong_pw["error"] == "Invalid password"

    # 5. Accessing with CORRECT password should return full summary & transcript
    view_correct = db.get_shared_meeting(raw_token, password="SuperSecretPassword123!", db_path=temp_db)
    assert view_correct["summary"] == "Security protocols reviewed."
    assert view_correct["raw_transcript"] == "Discussion about security protocols and secrets."

    # 6. Revoke link
    revoked = db.revoke_share_link(raw_token, user_email="alice@example.com", db_path=temp_db)
    assert revoked is True

    # 7. Accessing revoked link should return None
    view_revoked = db.get_shared_meeting(raw_token, password="SuperSecretPassword123!", db_path=temp_db)
    assert view_revoked is None
