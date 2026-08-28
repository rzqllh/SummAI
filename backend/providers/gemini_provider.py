import os
import logging
from typing import Optional, Dict, Any
from google import genai
from google.genai import types, errors
from backend.providers.base import (
    BaseLLMProvider,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderError,
)

logger = logging.getLogger(__name__)

class GeminiLLMProvider(BaseLLMProvider):
    @property
    def name(self) -> str:
        return "Google Gemini (Flash)"

    async def generate(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> str:
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GEMINI_API_KEY is not configured.", provider_name=self.name)

        client = genai.Client(api_key=key.strip())
        
        # Try modern Flash models in order
        candidate_models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash"]
        last_error = None

        for model_id in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                    ),
                )
                if response and response.text:
                    return response.text
            except errors.ClientError as e:
                msg = str(e)
                code = getattr(e, "code", None)
                if code == 401 or "API_KEY_INVALID" in msg or "PERMISSION_DENIED" in msg:
                    raise ProviderAuthError(msg, provider_name=self.name, status_code=401)
                if code == 429 or "RESOURCE_EXHAUSTED" in msg:
                    raise ProviderRateLimitError(msg, provider_name=self.name, status_code=429)
                if code and code >= 500:
                    raise ProviderUnavailableError(msg, provider_name=self.name, status_code=code)
                last_error = e
                continue
            except Exception as e:
                last_error = e
                continue

        if last_error:
            raise ProviderError(f"Gemini generation failed: {last_error}", provider_name=self.name)
        raise ProviderError("Gemini returned empty response", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key or not key.strip():
            return {"valid": False, "message": "No Gemini API key configured."}
        try:
            client = genai.Client(api_key=key.strip())
            client.models.generate_content(
                model="gemini-3.6-flash",
                contents="Ping test. Respond with OK.",
            )
            return {"valid": True, "message": "Gemini API key is active and verified!"}
        except Exception as e:
            return {"valid": False, "message": f"Gemini Error: {str(e)}"}
