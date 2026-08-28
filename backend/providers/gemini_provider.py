import os
import logging
import asyncio
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
        
        # Modern Flash models in order of stability & speed
        candidate_models = [
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-flash-latest",
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash-lite",
        ]
        last_error = None

        for model_id in candidate_models:
            try:
                logger.info(f"[Gemini] Attempting generation with {model_id}...")
                response = await client.aio.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                    ),
                )
                if response and response.text and response.text.strip():
                    return response.text.strip()
            except errors.ClientError as e:
                msg = str(e)
                code = getattr(e, "code", None)
                if code == 401 or "API_KEY_INVALID" in msg or "PERMISSION_DENIED" in msg:
                    raise ProviderAuthError(msg, provider_name=self.name, status_code=401)
                if code == 429 or "RESOURCE_EXHAUSTED" in msg:
                    logger.warning(f"[Gemini] {model_id} rate limited (429), trying next candidate...")
                    last_error = e
                    continue
                last_error = e
                continue
            except errors.ServerError as e:
                logger.warning(f"[Gemini] {model_id} server error / high demand (503), trying next candidate: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"[Gemini] {model_id} failed: {e}, trying next candidate...")
                last_error = e
                continue

        if last_error:
            msg = str(last_error)
            if "503" in msg or "UNAVAILABLE" in msg:
                raise ProviderUnavailableError(f"Gemini service unavailable: {msg}", provider_name=self.name, status_code=503)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                raise ProviderRateLimitError(f"Gemini quota exceeded: {msg}", provider_name=self.name, status_code=429)
            raise ProviderError(f"Gemini generation failed on all candidate models: {last_error}", provider_name=self.name)
        raise ProviderError("Gemini returned empty response", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key or not key.strip():
            return {"valid": False, "message": "No Gemini API key configured."}
        try:
            client = genai.Client(api_key=key.strip())
            await client.aio.models.generate_content(
                model="gemini-3.5-flash",
                contents="Ping test. Respond with OK.",
            )
            return {"valid": True, "message": "Gemini API key is active and verified!"}
        except Exception as e:
            return {"valid": False, "message": f"Gemini Error: {str(e)}"}

