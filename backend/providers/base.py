from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

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

    @abstractmethod
    async def test_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Test authentication and connectivity."""
        pass
