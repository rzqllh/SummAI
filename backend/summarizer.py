import os
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

from backend.providers.base import (
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderError,
)
from backend.providers.groq_provider import GroqSTTProvider, GroqLLMProvider
from backend.providers.gemini_provider import GeminiLLMProvider
from backend.providers.cloudflare_provider import CloudflareSTTProvider, CloudflareLLMProvider

logger = logging.getLogger(__name__)

# Initialize singletons
groq_stt = GroqSTTProvider()
cloudflare_stt = CloudflareSTTProvider()

gemini_llm = GeminiLLMProvider()
groq_llm = GroqLLMProvider()
cloudflare_llm = CloudflareLLMProvider()

async def transcribe_audio_with_fallback(
    audio_file_path: str,
    custom_groq_key: Optional[str] = None,
    custom_cf_token: Optional[str] = None,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Transcribes audio with smart multi-provider fallback.
    Order:
      1. Groq Whisper Large-v3 (if user/server key available)
      2. Cloudflare Workers AI Whisper (zero-config fallback)
    """
    load_dotenv(override=True)
    
    stt_candidates = []
    
    # Check if Groq key exists
    has_groq = bool(custom_groq_key or os.environ.get("GROQ_API_KEY"))
    if has_groq:
        stt_candidates.append((groq_stt, custom_groq_key))
    
    # Always append Cloudflare as fallback or primary zero-config
    stt_candidates.append((cloudflare_stt, custom_cf_token))
    
    # If no Groq key, also try Groq last just in case
    if not has_groq:
        stt_candidates.append((groq_stt, None))

    errors_encountered: List[str] = []
    fallback_applied = False

    for idx, (provider, key) in enumerate(stt_candidates):
        try:
            logger.info(f"[STT] Attempting transcription via {provider.name} (Priority {idx+1})...")
            text = await provider.transcribe(audio_file_path, api_key=key, language=language)
            if text and text.strip():
                return {
                    "transcript": text.strip(),
                    "provider": provider.name,
                    "fallback_applied": fallback_applied,
                }
        except ProviderAuthError as e:
            logger.warning(f"[STT] {provider.name} auth error: {e}. Moving to next provider...")
            errors_encountered.append(f"{provider.name}: {e.message}")
            fallback_applied = True
            continue
        except (ProviderRateLimitError, ProviderUnavailableError) as e:
            logger.warning(f"[STT] {provider.name} quota/service issue: {e}. Executing automatic fallback...")
            errors_encountered.append(f"{provider.name}: {e.message}")
            fallback_applied = True
            continue
        except Exception as e:
            logger.error(f"[STT] {provider.name} unexpected error: {e}")
            errors_encountered.append(f"{provider.name}: {str(e)}")
            fallback_applied = True
            continue

    joined_errors = " | ".join(errors_encountered)
    raise RuntimeError(f"All Speech-to-Text providers failed. Details: {joined_errors}")

async def generate_summary_with_fallback(
    raw_transcript: str,
    custom_prompt: Optional[str] = None,
    custom_gemini_key: Optional[str] = None,
    custom_groq_key: Optional[str] = None,
    custom_cf_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Synthesizes transcript into structured intelligence with multi-provider fallback.
    Order:
      1. Google Gemini Flash (if user/server key available)
      2. Groq Llama 3.3 70B (if user/server key available)
      3. Cloudflare Workers AI Llama 3.3 70B (zero-config fallback)
    """
    load_dotenv(override=True)

    if custom_prompt and custom_prompt.strip():
        prompt = f"""
        {custom_prompt}

        TRANSKRIP MEETING:
        {raw_transcript}
        """
    else:
        prompt = f"""
        Kamu adalah Notulis Rapat Profesional. Tugasmu adalah menganalisis transkrip meeting berikut dan buat ringkasan yang terstruktur.

        TRANSKRIP MEETING:
        {raw_transcript}

        FORMAT OUTPUT (Gunakan Markdown):
        ## 📌 Ringkasan Eksekutif
        (Ringkasan 2-3 kalimat mengenai fokus utama rapat)

        ## 💬 Poin-Poin Diskusi Utama
        - (Detail topik yang dibahas)

        ## 🎯 Keputusan Final
        - (Keputusan yang disepakati bersama)

        ## 📝 Action Items & To-Do List
        | Task / Tugas | PIC (Jika ada) | Target / Deadline |
        | :--- | :--- | :--- |
        | Contoh task | Nama | YYYY-MM-DD / ASAP |

        ## ❓ Topik Pending / Follow-up Needed
        - (Isu yang belum selesai)
        """

    llm_candidates = []

    # Priority 1: Gemini
    has_gemini = bool(custom_gemini_key or os.environ.get("GEMINI_API_KEY"))
    if has_gemini:
        llm_candidates.append((gemini_llm, custom_gemini_key))

    # Priority 2: Groq Llama 3.3
    has_groq = bool(custom_groq_key or os.environ.get("GROQ_API_KEY"))
    if has_groq:
        llm_candidates.append((groq_llm, custom_groq_key))

    # Priority 3: Cloudflare Workers AI
    llm_candidates.append((cloudflare_llm, custom_cf_token))

    # If Gemini wasn't tested first, test as final candidate
    if not has_gemini:
        llm_candidates.append((gemini_llm, None))
    if not has_groq:
        llm_candidates.append((groq_llm, None))

    errors_encountered: List[str] = []
    fallback_applied = False

    for idx, (provider, key) in enumerate(llm_candidates):
        try:
            logger.info(f"[LLM] Attempting synthesis via {provider.name} (Priority {idx+1})...")
            summary_text = await provider.generate(prompt, api_key=key)
            if summary_text and summary_text.strip():
                return {
                    "summary": summary_text.strip(),
                    "provider": provider.name,
                    "fallback_applied": fallback_applied,
                }
        except ProviderAuthError as e:
            logger.warning(f"[LLM] {provider.name} auth error: {e}. Moving to next provider...")
            errors_encountered.append(f"{provider.name}: {e.message}")
            fallback_applied = True
            continue
        except (ProviderRateLimitError, ProviderUnavailableError) as e:
            logger.warning(f"[LLM] {provider.name} rate limit / outage: {e}. Executing automatic fallback...")
            errors_encountered.append(f"{provider.name}: {e.message}")
            fallback_applied = True
            continue
        except Exception as e:
            logger.error(f"[LLM] {provider.name} unexpected error: {e}")
            errors_encountered.append(f"{provider.name}: {str(e)}")
            fallback_applied = True
            continue

    joined_errors = " | ".join(errors_encountered)
    raise RuntimeError(f"All LLM synthesis providers failed. Details: {joined_errors}")
