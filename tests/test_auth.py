import pytest
from fastapi import Request
from backend.auth import get_current_user_email
from backend.errors import SummAIException, ErrorCode

class MockRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}

def test_anonymous_user_extraction(monkeypatch):
    monkeypatch.setattr("backend.auth.ALLOW_ANONYMOUS_LOCAL", True)
    
    # 1. Default when no header
    req = MockRequest()
    assert get_current_user_email(req) == "default"

    # 2. Extract from X-User-Email
    req_email = MockRequest({"x-user-email": "engineer@company.org"})
    assert get_current_user_email(req_email) == "engineer@company.org"

def test_anonymous_rejection_when_disabled(monkeypatch):
    monkeypatch.setattr("backend.auth.ALLOW_ANONYMOUS_LOCAL", False)
    
    req_email = MockRequest({"x-user-email": "unauthenticated@company.org"})
    with pytest.raises(SummAIException) as exc_info:
        get_current_user_email(req_email)
    assert exc_info.value.code == ErrorCode.UNAUTHORIZED
