from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any

class ErrorCode:
    PROVIDER_RATE_LIMIT = "PROVIDER_RATE_LIMIT"
    PROVIDER_QUOTA_EXCEEDED = "PROVIDER_QUOTA_EXCEEDED"
    PROVIDER_AUTH_INVALID = "PROVIDER_AUTH_INVALID"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    UPLOAD_INVALID = "UPLOAD_INVALID"
    UPLOAD_TOO_LARGE = "UPLOAD_TOO_LARGE"
    TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED"
    SYNTHESIS_FAILED = "SYNTHESIS_FAILED"
    RATE_LIMITED = "RATE_LIMITED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"

class SummAIException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        provider: Optional[str] = None,
        retryable: bool = False,
        fallback_available: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.provider = provider
        self.retryable = retryable
        self.fallback_available = fallback_available
        self.details = details or {}

async def summai_exception_handler(request: Request, exc: SummAIException) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", "unknown")
    payload = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "provider": exc.provider,
            "retryable": exc.retryable,
            "fallback_available": exc.fallback_available,
            "trace_id": trace_id,
            "details": exc.details,
        }
    }
    return JSONResponse(status_code=exc.status_code, content=payload)
