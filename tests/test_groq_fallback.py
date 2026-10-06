import pytest
from unittest.mock import patch, MagicMock
from groq import RateLimitError, APIError
from backend.providers.groq_provider import GroqLLMProvider, GROQ_LLM_CANDIDATE_MODELS
from backend.providers.base import ProviderError

@pytest.mark.asyncio
async def test_groq_llm_fallback_order():
    provider = GroqLLMProvider()
    call_order = []

    def mock_create(*args, **kwargs):
        model = kwargs.get("model")
        call_order.append(model)
        if model == GROQ_LLM_CANDIDATE_MODELS[0]:
            # First model rate limited
            mock_response = MagicMock(status_code=429, headers={})
            raise RateLimitError("Rate limited on primary model", response=mock_response, body=None)
        elif model == GROQ_LLM_CANDIDATE_MODELS[1]:
            # Second model succeeds
            mock_choice = MagicMock()
            mock_choice.message.content = "Summary from second candidate model"
            mock_res = MagicMock()
            mock_res.choices = [mock_choice]
            return mock_res
        raise RuntimeError("Should not reach third model")

    with patch("backend.providers.groq_provider.Groq") as mock_groq_class:
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = mock_create
        mock_groq_class.return_value = mock_client

        result = await provider.generate("Test prompt", api_key="dummy_key")

        # Verify exact fallback order
        assert call_order == [
            GROQ_LLM_CANDIDATE_MODELS[0],
            GROQ_LLM_CANDIDATE_MODELS[1],
        ]
        assert result == "Summary from second candidate model"

@pytest.mark.asyncio
async def test_groq_llm_all_models_fail():
    provider = GroqLLMProvider()
    call_order = []

    def mock_create_all_fail(*args, **kwargs):
        model = kwargs.get("model")
        call_order.append(model)
        mock_response = MagicMock(status_code=503, headers={})
        raise APIError("Service down", response=mock_response, body=None)

    with patch("backend.providers.groq_provider.Groq") as mock_groq_class:
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = mock_create_all_fail
        mock_groq_class.return_value = mock_client

        with pytest.raises(ProviderError) as exc_info:
            await provider.generate("Test prompt", api_key="dummy_key")

        # Asserts all models in the constant were attempted in order
        assert call_order == GROQ_LLM_CANDIDATE_MODELS
        assert "Groq LLM failed across all candidate models" in str(exc_info.value)
