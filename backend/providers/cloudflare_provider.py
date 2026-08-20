import os
import logging
from typing import Optional, Dict, Any
import httpx
from backend.providers.base import (
    BaseSTTProvider,
    BaseLLMProvider,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderError,
)

logger = logging.getLogger(__name__)

CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts"

class CloudflareSTTProvider(BaseSTTProvider):
    @property
    def name(self) -> str:
        return "Cloudflare Workers AI (Whisper)"

    async def transcribe(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> str:
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        api_token = api_key or os.environ.get("CLOUDFLARE_API_TOKEN")

        if not account_id or not api_token:
            raise ProviderAuthError("Cloudflare Account ID or API Token is not configured.", provider_name=self.name)

        url = f"{CF_API_BASE}/{account_id}/ai/run/@cf/openai/whisper"
        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "Content-Type": "application/octet-stream",
        }

        try:
            with open(audio_file_path, "rb") as f:
                audio_bytes = f.read()

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, content=audio_bytes)

            if response.status_code == 401 or response.status_code == 403:
                raise ProviderAuthError("Invalid Cloudflare API credentials.", provider_name=self.name, status_code=response.status_code)
            if response.status_code == 429:
                raise ProviderRateLimitError("Cloudflare Workers AI rate limit reached.", provider_name=self.name, status_code=429)
            if response.status_code >= 500:
                raise ProviderUnavailableError(f"Cloudflare service error: {response.text}", provider_name=self.name, status_code=response.status_code)

            data = response.json()
            if not data.get("success", False):
                errors = data.get("errors", [])
                raise ProviderError(f"Cloudflare error: {errors}", provider_name=self.name)

            result = data.get("result", {})
            return result.get("text", "")
        except (ProviderAuthError, ProviderRateLimitError, ProviderUnavailableError, ProviderError):
            raise
        except Exception as e:
            raise ProviderError(f"Cloudflare Whisper request failed: {e}", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        api_token = api_key or os.environ.get("CLOUDFLARE_API_TOKEN")
        if not account_id or not api_token:
            return {"valid": False, "message": "Cloudflare credentials not configured in host environment."}
        return {"valid": True, "message": "Cloudflare Workers AI is ready as zero-config fallback."}

class CloudflareLLMProvider(BaseLLMProvider):
    @property
    def name(self) -> str:
        return "Cloudflare Workers AI (Llama 3.3 70B)"

    async def generate(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> str:
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        api_token = api_key or os.environ.get("CLOUDFLARE_API_TOKEN")

        if not account_id or not api_token:
            raise ProviderAuthError("Cloudflare Account ID or API Token is not configured.", provider_name=self.name)

        url = f"{CF_API_BASE}/{account_id}/ai/run/@cf/meta/llama-3.3-70b-instruct"
        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional meeting intelligence secretary. Format clean, high-value Markdown summaries.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 401 or response.status_code == 403:
                raise ProviderAuthError("Invalid Cloudflare API credentials.", provider_name=self.name, status_code=response.status_code)
            if response.status_code == 429:
                raise ProviderRateLimitError("Cloudflare Workers AI rate limit reached.", provider_name=self.name, status_code=429)
            if response.status_code >= 500:
                raise ProviderUnavailableError(f"Cloudflare service error: {response.text}", provider_name=self.name, status_code=response.status_code)

            data = response.json()
            if not data.get("success", False):
                errors = data.get("errors", [])
                raise ProviderError(f"Cloudflare error: {errors}", provider_name=self.name)

            result = data.get("result", {})
            return result.get("response", "")
        except (ProviderAuthError, ProviderRateLimitError, ProviderUnavailableError, ProviderError):
            raise
        except Exception as e:
            raise ProviderError(f"Cloudflare LLM request failed: {e}", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        api_token = api_key or os.environ.get("CLOUDFLARE_API_TOKEN")
        if not account_id or not api_token:
            return {"valid": False, "message": "Cloudflare credentials not configured in host environment."}
        return {"valid": True, "message": "Cloudflare LLM is ready as zero-config fallback."}
