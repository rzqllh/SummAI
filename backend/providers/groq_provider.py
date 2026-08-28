import os
import logging
import asyncio
from typing import Optional, Dict, Any
from groq import Groq, AuthenticationError, RateLimitError, APIError
from backend.providers.base import (
    BaseSTTProvider,
    BaseLLMProvider,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderError,
    TranscriptionResult,
    TranscriptSegment,
)

logger = logging.getLogger(__name__)

class GroqSTTProvider(BaseSTTProvider):
    @property
    def name(self) -> str:
        return "Groq Whisper (Large-v3)"

    async def transcribe(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> str:
        res = await self.transcribe_structured(audio_file_path, api_key=api_key, language=language)
        return res.text

    async def transcribe_structured(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> TranscriptionResult:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider_name=self.name)

        try:
            client = Groq(api_key=key.strip())
            with open(audio_file_path, "rb") as f:
                kwargs = {
                    "file": (os.path.basename(audio_file_path), f.read()),
                    "model": "whisper-large-v3",
                    "response_format": "verbose_json",
                }
                if language:
                    kwargs["language"] = language
                
                response = client.audio.transcriptions.create(**kwargs)
            
            raw_text = getattr(response, "text", str(response)).strip()
            raw_segments = getattr(response, "segments", []) or []
            
            segments = []
            for idx, s in enumerate(raw_segments):
                seg_dict = s if isinstance(s, dict) else (getattr(s, "__dict__", {}) or {})
                start = float(seg_dict.get("start", 0.0) or 0.0)
                end = float(seg_dict.get("end", 0.0) or 0.0)
                txt = str(seg_dict.get("text", "")).strip()
                speaker = seg_dict.get("speaker") or f"Speaker {1 + (idx % 2)}"
                if txt:
                    segments.append(TranscriptSegment(
                        id=idx + 1,
                        start=start,
                        end=end,
                        text=txt,
                        speaker=speaker,
                    ))
            
            if not segments and raw_text:
                segments.append(TranscriptSegment(
                    id=1,
                    start=0.0,
                    end=0.0,
                    text=raw_text,
                    speaker="Speaker 1",
                ))

            duration = getattr(response, "duration", 0.0) or (segments[-1].end if segments else 0.0)
            lang = getattr(response, "language", language or "en")

            return TranscriptionResult(
                text=raw_text,
                segments=segments,
                duration=float(duration or 0.0),
                language=str(lang),
            )
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
        return "Groq (GPT-OSS 120B / Qwen 27B)"

    async def generate(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> str:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider_name=self.name)

        client = Groq(api_key=key.strip())
        candidate_models = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
            "groq/compound",
        ]
        last_error = None

        def _do_chat(m: str):
            return client.chat.completions.create(
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
                model=m,
                temperature=temperature,
            )

        for model_id in candidate_models:
            try:
                logger.info(f"[Groq LLM] Attempting generation with {model_id}...")
                chat_completion = await asyncio.to_thread(_do_chat, model_id)
                if chat_completion.choices and chat_completion.choices[0].message.content:
                    return chat_completion.choices[0].message.content.strip()
            except AuthenticationError as e:
                raise ProviderAuthError(str(e), provider_name=self.name)
            except RateLimitError as e:
                logger.warning(f"[Groq LLM] Rate limited on {model_id}, trying next candidate...")
                last_error = e
                continue
            except APIError as e:
                status = getattr(e, "status_code", 500)
                logger.warning(f"[Groq LLM] {model_id} returned APIError {status}: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"[Groq LLM] {model_id} unexpected failure: {e}")
                last_error = e
                continue

        if last_error:
            raise ProviderError(f"Groq LLM failed across all candidate models: {last_error}", provider_name=self.name)
        raise ProviderError("Groq returned empty response", provider_name=self.name)

    async def generate_stream(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2):
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider_name=self.name)

        client = Groq(api_key=key.strip())
        candidate_models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama-3.3-70b-specdec",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ]
        last_error = None

        for model_id in candidate_models:
            try:
                logger.info(f"[Groq LLM Stream] Streaming generation with {model_id}...")
                stream = client.chat.completions.create(
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
                    model=model_id,
                    temperature=temperature,
                    stream=True,
                )
                emitted_any = False
                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        emitted_any = True
                        yield chunk.choices[0].delta.content
                if emitted_any:
                    return
            except AuthenticationError as e:
                raise ProviderAuthError(str(e), provider_name=self.name)
            except Exception as e:
                last_error = e
                continue

        if last_error:
            raise ProviderError(f"Groq LLM streaming failed across all models: {last_error}", provider_name=self.name)

    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key or not key.strip():
            return {"valid": False, "message": "No Groq API key configured."}
        try:
            client = Groq(api_key=key.strip())
            await asyncio.to_thread(client.models.list)
            return {"valid": True, "message": "Groq LLM connection verified!"}
        except Exception as e:
            return {"valid": False, "message": f"Groq Error: {str(e)}"}

