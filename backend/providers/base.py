from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List, AsyncGenerator

@dataclass
class TranscriptSegment:
    id: int
    start: float
    end: float
    text: str
    speaker: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TranscriptionResult:
    text: str
    segments: List[TranscriptSegment] = field(default_factory=list)
    duration: float = 0.0
    language: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "segments": [s.to_dict() for s in self.segments],
            "duration": self.duration,
            "language": self.language,
        }

class ProviderError(Exception):
    """Base exception for provider failures."""
    def __init__(self, message: str, provider_name: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.provider_name = provider_name
        self.status_code = status_code

class ProviderAuthError(ProviderError):
    """Invalid or expired API key."""
    pass

class ProviderRateLimitError(ProviderError):
    """Rate limit (429) or quota exhausted."""
    pass

class ProviderUnavailableError(ProviderError):
    """Upstream service is unreachable (500/503/timeout)."""
    pass

class BaseSTTProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider display name."""
        pass

    @abstractmethod
    async def transcribe(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> str:
        """Transcribe an audio file and return the text."""
        pass

    async def transcribe_structured(self, audio_file_path: str, api_key: Optional[str] = None, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe an audio file and return structured segments."""
        raw_text = await self.transcribe(audio_file_path, api_key=api_key, language=language)
        return TranscriptionResult(
            text=raw_text,
            segments=[TranscriptSegment(id=0, start=0.0, end=0.0, text=raw_text)],
        )

    @abstractmethod
    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Test authentication and connectivity."""
        pass

class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider display name."""
        pass

    @abstractmethod
    async def generate(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> str:
        """Generate structured text based on prompt."""
        pass

    async def generate_stream(self, prompt: str, api_key: Optional[str] = None, temperature: float = 0.2) -> AsyncGenerator[str, None]:
        """Generate real-time token stream from the provider."""
        # Default fallback if provider does not support native streaming
        full_text = await self.generate(prompt, api_key=api_key, temperature=temperature)
        yield full_text

    @abstractmethod
    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Test authentication and connectivity."""
        pass
