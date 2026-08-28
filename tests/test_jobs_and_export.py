import pytest
import os
import json
from fastapi.testclient import TestClient
from backend.main import app
import backend.db as db

client = TestClient(app)

def test_jobs_crud():
    # 1. Enqueue Job
    res = client.post(
        "/api/jobs",
        json={
            "filename": "quarterly_all_hands.mp4",
            "media_type": "mp4",
            "filesize": 104857600,
        },
        headers={"x-user-email": "batch_user@corp.com"}
    )
    assert res.status_code == 201
    job_id = res.json()["job"]["id"]
    assert job_id.startswith("job_")

    # 2. List User Jobs
    list_res = client.get(
        "/api/jobs",
        headers={"x-user-email": "batch_user@corp.com"}
    )
    assert list_res.status_code == 200
    jobs = list_res.json()["jobs"]
    assert any(j["id"] == job_id for j in jobs)

    # 3. Get Single Job
    get_res = client.get(
        f"/api/jobs/{job_id}",
        headers={"x-user-email": "batch_user@corp.com"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["filename"] == "quarterly_all_hands.mp4"

    # 4. Delete Job
    del_res = client.delete(
        f"/api/jobs/{job_id}",
        headers={"x-user-email": "batch_user@corp.com"}
    )
    assert del_res.status_code == 200

    # 5. Verify deleted
    verify_res = client.get(
        f"/api/jobs/{job_id}",
        headers={"x-user-email": "batch_user@corp.com"}
    )
    assert verify_res.status_code == 404

def test_account_workspace_export():
    test_email = "exporter_test@domain.com"
    # Seed meeting and folder
    folder = db.create_folder("Export Folder", "#10b981", user_email=test_email)
    meeting_id = db.save_meeting(
        filename="export_meeting.mp3",
        media_type="mp3",
        raw_transcript="Discussion regarding data export functionality.",
        summary="## Export Meeting Summary\nData export works seamlessly.",
        user_email=test_email,
        folder_id=folder["id"],
    )

    res = client.get(
        "/api/account/export",
        headers={"x-user-email": test_email}
    )
    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "")
    assert "attachment" in res.headers.get("content-disposition", "")
    
    data = res.json()
    assert data["user_email"] == test_email
    assert data["counts"]["meetings"] >= 1
    assert data["counts"]["folders"] >= 1
    assert any(m["id"] == meeting_id for m in data["meetings"])
