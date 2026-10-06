from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.main import app
import backend.db as db

client = TestClient(app)

def test_transcription_language_header_passed_to_transcriber():
    mock_transcription_result = {
        "transcript": "Hasil transkrip rapat integrasi jaringan metro.",
        "segments": [{"id": 1, "start": 0.0, "end": 2.5, "text": "Hasil transkrip rapat integrasi jaringan metro.", "speaker": "Speaker 1"}],
        "duration": 2.5,
        "language": "id",
        "provider": "Mock Whisper",
        "fallback_applied": False,
    }

    # 1. Test direct upload endpoint forwards language="id"
    with patch("backend.main.transcribe_audio_with_fallback", new=AsyncMock(return_value=mock_transcription_result)) as mock_transcribe:
        # Create a tiny dummy mp3 byte stream
        files = {"file": ("test_meeting.mp3", b"ID3\x03\x00\x00\x00\x00\x00\x00dummy-audio", "audio/mpeg")}
        response = client.post(
            "/api/upload",
            files=files,
            data={"language": "id"},
            headers={"x-transcription-language": "id"}
        )
        assert response.status_code == 200
        # Assert transcribe was called with language="id"
        mock_transcribe.assert_called()
        _, kwargs = mock_transcribe.call_args
        assert kwargs.get("language") == "id"

def test_transcription_language_auto_sets_none():
    mock_transcription_result = {
        "transcript": "Autonomous transcript.",
        "segments": [],
        "duration": 1.0,
        "language": "en",
        "provider": "Mock Whisper",
        "fallback_applied": False,
    }

    with patch("backend.main.transcribe_audio_with_fallback", new=AsyncMock(return_value=mock_transcription_result)) as mock_transcribe:
        files = {"file": ("test_auto.mp3", b"ID3\x03\x00\x00\x00\x00\x00\x00dummy-audio", "audio/mpeg")}
        response = client.post(
            "/api/upload",
            files=files,
            headers={"x-transcription-language": "auto"}
        )
        assert response.status_code == 200
        mock_transcribe.assert_called()
        _, kwargs = mock_transcribe.call_args
        assert kwargs.get("language") is None
