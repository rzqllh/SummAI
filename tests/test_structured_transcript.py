import pytest
import os
import json
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.providers.base import TranscriptSegment, TranscriptionResult
import backend.db as db

client = TestClient(app)

def test_transcription_result_serialization():
    seg1 = TranscriptSegment(id=1, start=0.0, end=5.2, text="Meeting starts now.", speaker="Alice")
    seg2 = TranscriptSegment(id=2, start=5.5, end=12.1, text="We are launching the new features.", speaker="Bob")
    res = TranscriptionResult(
        text="Meeting starts now. We are launching the new features.",
        segments=[seg1, seg2],
        duration=12.1,
        language="en"
    )
    d = res.to_dict()
    assert len(d["segments"]) == 2
    assert d["segments"][0]["speaker"] == "Alice"
    assert d["segments"][1]["start"] == 5.5
    assert d["duration"] == 12.1

def test_chat_meeting_with_grounded_citation():
    segments = [
        {"id": 1, "start": 0.0, "end": 4.0, "text": "Welcome to the Q3 financial review.", "speaker": "CEO"},
        {"id": 2, "start": 4.5, "end": 10.0, "text": "Our Q3 revenue increased by 25% due to cloud subscriptions.", "speaker": "CFO"},
        {"id": 3, "start": 10.5, "end": 15.0, "text": "Action item for Sarah to send the deck.", "speaker": "CEO"},
    ]

    mock_llm_result = {
        "summary": "Revenue increased by 25% driven by cloud subscriptions in Q3 [seg_2].",
        "provider": "Mock LLM",
        "fallback_applied": False
    }

    with patch("backend.main.generate_summary_with_fallback", new=AsyncMock(return_value=mock_llm_result)):
        response = client.post(
            "/api/chat-meeting",
            json={
                "raw_transcript": "Welcome to the Q3 financial review. Our Q3 revenue increased by 25% due to cloud subscriptions. Action item for Sarah to send the deck.",
                "question": "What was the revenue increase in Q3?",
                "segments": segments,
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "evidence" in data
        assert len(data["evidence"]) >= 1
        # Cited segment [seg_2] was accurately extracted
        assert data["evidence"][0]["id"] == 2
        assert data["evidence"][0]["speaker"] == "CFO"
        assert data["evidence"][0]["start"] == 4.5

def test_synthesis_sse_stream():
    async def mock_stream_gen(*args, **kwargs):
        yield {"type": "provider", "provider": "Mock LLM", "fallback": False}
        yield {"type": "token", "delta": "Executive "}
        yield {"type": "token", "delta": "Summary"}
        yield {"type": "done", "full_summary": "Executive Summary", "provider": "Mock LLM", "fallback": False}

    with patch("backend.main.generate_summary_stream_with_fallback", side_effect=mock_stream_gen):
        response = client.post(
            "/api/synthesis/stream",
            json={
                "raw_transcript": "Team sync completed deliverables on schedule.",
                "filename": "team_sync.mp3",
                "media_type": "mp3",
            }
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        content = response.text
        assert "event: start" in content
        assert "event: provider" in content
        assert "event: token" in content
        assert "event: done" in content

def test_synthesis_stream_user_email_persistence():
    async def mock_stream_gen(*args, **kwargs):
        yield {"type": "provider", "provider": "Mock LLM", "fallback": False}
        yield {"type": "token", "delta": "Meeting discussion notes."}
        yield {"type": "done", "full_summary": "Meeting discussion notes.", "provider": "Mock LLM", "fallback": False}

    target_email = "auditor@acme.com"
    with patch("backend.main.generate_summary_stream_with_fallback", side_effect=mock_stream_gen):
        response = client.post(
            "/api/synthesis/stream",
            headers={"x-user-email": target_email},
            json={
                "raw_transcript": "Discussion on Q4 strategic goals and key deliverables.",
                "filename": "q4_strategy.mp3",
                "media_type": "mp3",
                "title": "Q4 Strategy Meeting",
            }
        )
        assert response.status_code == 200
        content = response.text
        assert "event: done" in content

        # Extract meeting id from SSE event: done data
        meeting_id = None
        for line in content.split("\n"):
            if line.startswith("data:"):
                try:
                    payload = json.loads(line.replace("data:", "").strip())
                    if "id" in payload:
                        meeting_id = payload["id"]
                        break
                except Exception:
                    pass

        assert meeting_id is not None, f"meeting_id was not emitted in SSE stream done payload: {content}"

        # Assert meeting is persisted with exact user_email
        saved_meeting = db.get_meeting(meeting_id, user_email=target_email)
        assert saved_meeting is not None
        assert saved_meeting["user_email"] == target_email
        assert saved_meeting["title"] == "Q4 Strategy Meeting"
        assert saved_meeting["summary"] == "Meeting discussion notes."

        # Verify tenant isolation: cannot be accessed by default user or other emails
        isolated_check = db.get_meeting(meeting_id, user_email="default")
        assert isolated_check is None

