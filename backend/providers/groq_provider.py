import os
import logging
from typing import Optional, Dict, Any
from groq import Groq, AuthenticationError, RateLimitError, APIError
from backend.providers.base import (
    BaseSTTProvider,
    BaseLLMProvider,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderError,
)

logger = logging.getLogger(__name__)

class GroqSTTProvider(BaseSTTProvider):
    @property
    def name(self) -> str:
        return "Groq Whisper (Large-v3)"

    async def transcribe(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> str:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider_name=self.name)

        try:
            client = Groq(api_key=key.strip())
            with open(audio_file_path, "rb") as f:
                kwargs = {
                    "file": (os.path.basename(audio_file_path), f.read()),
                    "model": "whisper-large-v3",
                    "response_format": "text",
                }
                if language:
                    kwargs["language"] = language
                
                transcription = client.audio.transcriptions.create(**kwargs)
            return str(transcription)
        except AuthenticationError as e:
            logger.warning(f"[{self.name}] Auth error: {e}")
            raise ProviderAuthError(str(e), provider_name=self.name)
        except RateLimitError as e:
            logger.warning(f"[{self.name}] Rate limit reached: {e}")
            raise ProviderRateLimitError(str(e), provider_name=self.name)
        except APIError as e:
            status = getattr(e, "status_code", 500)
            if status and status >= 500:
                raise ProviderUnavailableError(str(e), provider_name=self.name, status_code=status)
            raise ProviderError(str(e), provider_name=self.name, status_code=status)
        except Exception as e:
            raise ProviderError(f"Unexpected Groq transcription failure: {e}", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            return {"valid": False, "message": "No Groq API key configured."}
        try:
            client = Groq(api_key=key.strip())
            client.models.list()
            return {"valid": True, "message": "Groq API is active and verified!"}
        except Exception as e:
            return {"valid": False, "message": f"Groq Error: {str(e)}"}

class GroqLLMProvider(BaseLLMProvider):
    @property
    def name(self) -> str:
        return "Groq Llama 3.3 (70B Versatile)"

    async def generate(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> str:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider_name=self.name)

        try:
            client = Groq(api_key=key.strip())
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional meeting minutes and executive intelligence assistant. Output high-fidelity structured Markdown.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                model="llama-3.3-70b-versatile",
                temperature=temperature,
            )
            return chat_completion.choices[0].message.content or ""
        except AuthenticationError as e:
            raise ProviderAuthError(str(e), provider_name=self.name)
        except RateLimitError as e:
            raise ProviderRateLimitError(str(e), provider_name=self.name)
        except APIError as e:
            status = getattr(e, "status_code", 500)
            if status and status >= 500:
                raise ProviderUnavailableError(str(e), provider_name=self.name, status_code=status)
            raise ProviderError(str(e), provider_name=self.name, status_code=status)
        except Exception as e:
            raise ProviderError(f"Unexpected Groq LLM failure: {e}", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            return {"valid": False, "message": "No Groq API key configured."}
        try:
            client = Groq(api_key=key.strip())
            client.models.list()
            return {"valid": True, "message": "Groq LLM connection verified!"}
        except Exception as e:
            return {"valid": False, "message": f"Groq Error: {str(e)}"}
