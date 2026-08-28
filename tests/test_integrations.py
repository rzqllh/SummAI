import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_slack_webhook_validation():
    # 1. Invalid webhook URL rejected
    res = client.post(
        "/api/integrations/slack",
        json={
            "webhook_url": "https://malicious.site/hook",
            "title": "Weekly Sprint",
            "summary": "Meeting summary notes",
        }
    )
    assert res.status_code == 400
    assert "Invalid Slack webhook URL" in res.json()["error"]["message"]

def test_notion_webhook_validation():
    # 1. Invalid schema rejected
    res = client.post(
        "/api/integrations/notion",
        json={
            "webhook_url": "invalid_url_without_http",
            "title": "Architecture Sync",
            "summary": "System specs discussion",
        }
    )
    assert res.status_code == 400

def test_notion_official_api_dispatch(monkeypatch):
    from unittest.mock import AsyncMock
    import httpx

    mock_resp = httpx.Response(200, json={"id": "page_123", "url": "https://notion.so/page_123"}, request=httpx.Request("POST", "https://api.notion.com/v1/pages"))

    async def mock_post(*args, **kwargs):
        return mock_resp

    with monkeypatch.context() as m:
        m.setattr("httpx.AsyncClient.post", mock_post)
        res = client.post(
            "/api/integrations/notion",
            json={
                "notion_api_token": "secret_mock_12345",
                "parent_id": "db_abcdef123456",
                "parent_type": "database",
                "title": "Architecture Sync",
                "summary": "## Summary\n- Decision: Approved\n| Task | PIC |\n| :--- | :--- |\n| Ship | Team |",
            }
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["page_url"] == "https://notion.so/page_123"

def test_tags_endpoints():
    # 1. Create tag
    res = client.post("/api/tags", json={"name": "backend-core", "color": "#10b981"})
    assert res.status_code == 201
    tag_id = res.json()["tag"]["id"]

    # 2. List tags
    res = client.get("/api/tags")
    assert res.status_code == 200
    tags = res.json()["tags"]
    assert any(t["name"] == "backend-core" for t in tags)

    # 3. Delete tag
    res = client.delete(f"/api/tags/{tag_id}")
    assert res.status_code == 200
