import os
from typing import Optional, Dict, Any
from fastapi import Request, Header
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from backend.errors import SummAIException, ErrorCode
from backend.logger import app_logger

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
ALLOW_ANONYMOUS_LOCAL = os.environ.get("ALLOW_ANONYMOUS_LOCAL", "true").lower() in ["true", "1", "yes"]

def verify_google_id_token(token: str) -> Dict[str, Any]:
    """Verifies a Google ID token from the frontend Google Identity Services SDK."""
    if not token or not token.strip():
        raise SummAIException(ErrorCode.UNAUTHORIZED, "Missing authentication token.", status_code=401)
        
    try:
        req = google_requests.Request()
        # If GOOGLE_CLIENT_ID is set, enforce audience check; otherwise verify signature
        audience = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        id_info = id_token.verify_oauth2_token(token, req, audience=audience)
        
        email = id_info.get("email")
        if not email:
            raise SummAIException(ErrorCode.UNAUTHORIZED, "Google token does not contain an email.", status_code=401)
            
        return {
            "email": email.lower(),
            "name": id_info.get("name", ""),
            "picture": id_info.get("picture", ""),
            "sub": id_info.get("sub", ""),
        }
    except ValueError as e:
        app_logger.warning(f"Google token verification failed: {str(e)}")
        raise SummAIException(ErrorCode.UNAUTHORIZED, f"Invalid Google authentication token: {str(e)}", status_code=401)
    except Exception as e:
        app_logger.error(f"Unexpected token verification error: {str(e)}", exc_info=True)
        raise SummAIException(ErrorCode.UNAUTHORIZED, "Failed to authenticate user identity.", status_code=401)

def get_current_user_email(
    request: Request,
    authorization: Optional[str] = None,
    x_user_email: Optional[str] = None,
) -> str:
    """
    Extracts the authoritative user email from:
    1. Bearer Google ID token in Authorization header (if present).
    2. Fallback to X-User-Email if local/anonymous mode is enabled.
    3. Default to 'default' workspace.
    """
    auth_header = authorization or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        user_info = verify_google_id_token(raw_token)
        return user_info["email"]
        
    user_email_header = x_user_email or request.headers.get("x-user-email")
    if user_email_header and user_email_header.strip():
        if ALLOW_ANONYMOUS_LOCAL:
            return user_email_header.strip().lower()
        else:
            raise SummAIException(ErrorCode.UNAUTHORIZED, "Authentication required. Anonymous access is disabled.", status_code=401)
            
    return "default"
