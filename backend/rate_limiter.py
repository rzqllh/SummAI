import time
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException
from backend.errors import SummAIException, ErrorCode

class RateLimiter:
    def __init__(self):
        # Key: (bucket_name, client_identifier) -> List of timestamps
        self.buckets: Dict[Tuple[str, str], List[float]] = {}

    def check_rate_limit(self, bucket: str, client_id: str, max_requests: int, window_seconds: int):
        now = time.time()
        key = (bucket, client_id)
        timestamps = self.buckets.get(key, [])

        # Filter out timestamps older than the sliding window
        valid_timestamps = [t for t in timestamps if now - t < window_seconds]
        
        if len(valid_timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - valid_timestamps[0])) + 1
            self.buckets[key] = valid_timestamps
            raise SummAIException(
                code=ErrorCode.RATE_LIMITED,
                message=f"Rate limit exceeded for {bucket}. Please try again in {retry_after} seconds.",
                status_code=429,
                retryable=True,
                details={"retry_after": retry_after}
            )

        valid_timestamps.append(now)
        self.buckets[key] = valid_timestamps

limiter = RateLimiter()

def get_client_identifier(request: Request) -> str:
    """Derives client identifier from X-User-Email or forwarded/remote IP."""
    user_email = request.headers.get("x-user-email")
    if user_email and user_email.strip() and user_email.strip() != "default":
        return f"user:{user_email.strip().lower()}"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    return f"ip:{request.client.host if request.client else '127.0.0.1'}"
