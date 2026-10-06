import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.providers.cloudflare_provider import _get_cf_credentials

client = TestClient(app)

def test_cf_credentials_resolution_primary():
    with patch.dict(os.environ, {
        "CLOUDFLARE_ACCOUNT_ID": "primary_acc_id",
        "CLOUDFLARE_API_TOKEN": "primary_token",
        "CF_ACCOUNT_ID": "fallback_acc_id",
        "CF_API_TOKEN": "fallback_token",
    }, clear=False):
        acc, tok = _get_cf_credentials()
        assert acc == "primary_acc_id"
        assert tok == "primary_token"

def test_cf_credentials_resolution_fallback_alias():
    env_clean = {
        "CLOUDFLARE_ACCOUNT_ID": "",
        "CLOUDFLARE_API_TOKEN": "",
        "CF_ACCOUNT_ID": "fallback_acc_id",
        "CF_API_TOKEN": "fallback_token",
    }
    with patch.dict(os.environ, env_clean, clear=False):
        acc, tok = _get_cf_credentials()
        assert acc == "fallback_acc_id"
        assert tok == "fallback_token"

def test_settings_keys_cloudflare_configured_with_primary():
    with patch.dict(os.environ, {
        "CLOUDFLARE_API_TOKEN": "cf_super_token_12345",
        "CF_API_TOKEN": "",
    }, clear=False):
        res = client.get("/api/settings/keys")
        assert res.status_code == 200
        data = res.json()
        assert data["cloudflare_configured"] is True

def test_settings_keys_cloudflare_configured_with_fallback():
    with patch.dict(os.environ, {
        "CLOUDFLARE_API_TOKEN": "",
        "CF_API_TOKEN": "cf_legacy_token_12345",
    }, clear=False):
        res = client.get("/api/settings/keys")
        assert res.status_code == 200
        data = res.json()
        assert data["cloudflare_configured"] is True
