import logging
import json
import time
import os
import re
from typing import Optional, Any, Dict

class StructuredJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach custom contextual attributes if present
        for key in ["trace_id", "operation", "duration_ms", "provider", "user_id_hash", "status"]:
            if hasattr(record, key):
                log_obj[key] = getattr(record, key)

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)

def sanitize_text(text: str) -> str:
    """Masks potential API keys, passwords, or tokens in logs."""
    if not text:
        return text
    # Mask OpenAI / Groq keys (gsk_...)
    text = re.sub(r'gsk_[a-zA-Z0-9]{20,}', 'gsk_***[MASKED]***', text)
    # Mask Gemini AI keys (AIza...)
    text = re.sub(r'AIza[a-zA-Z0-9_-]{25,}', 'AIza***[MASKED]***', text)
    # Mask Cloudflare tokens
    text = re.sub(r'Bearer\s+[a-zA-Z0-9_-]{20,}', 'Bearer ***[MASKED]***', text)
    return text

def setup_logger(name: str = "summai") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        
    return logger

app_logger = setup_logger("summai")
