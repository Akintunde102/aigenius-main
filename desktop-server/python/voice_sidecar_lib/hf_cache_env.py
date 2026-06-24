"""
Hugging Face Hub behaviour for Pocket-TTS (must run **before** ``import pocket_tts``).

This is about **network** vs **cache-only** mode for weight resolution — not STT.
"""

from __future__ import annotations

import errno
import os
import socket
from functools import lru_cache

from voice_sidecar_lib.log import LOGGER

_OFFLINE_ERROR_CODES = {
    errno.ECONNREFUSED,
    errno.ENETUNREACH,
    errno.ETIMEDOUT,
    11001,  # WSAHOST_NOT_FOUND (Windows)
}
_eai = getattr(errno, "EAI_AGAIN", None)
if _eai is not None:
    _OFFLINE_ERROR_CODES.add(_eai)

_NETWORK_ERROR_PHRASES = (
    "getaddrinfo",
    "connection refused",
    "connection aborted",
    "timed out",
    "name or service not known",
    "temporary failure in name resolution",
)


@lru_cache(maxsize=32)
def truthy_env(name: str) -> bool:
    """Cached environment flag check to avoid repeated os.environ lookups."""
    v = os.environ.get(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def is_likely_hub_network_error(exc: BaseException) -> bool:
    """True if the failure is likely DNS/network/timeout talking to the Hub (not missing cache)."""
    seen: set[int] = set()

    def walk(err: BaseException | None) -> bool:
        if err is None or id(err) in seen:
            return False
        seen.add(id(err))

        if isinstance(err, (socket.gaierror, TimeoutError, ConnectionError)):
            return True

        if isinstance(err, OSError):
            if err.errno in _OFFLINE_ERROR_CODES:
                return True
            err_s = str(err).lower()
            if "getaddrinfo" in err_s or "name or service not known" in err_s:
                return True

        if "requests" in str(type(err).__module__):
            try:
                import requests

                if isinstance(err, requests.RequestException):
                    return True
            except ImportError:
                pass

        msg = str(err).lower()
        if any(phrase in msg for phrase in _NETWORK_ERROR_PHRASES):
            return True

        if err.__cause__ is not None and walk(err.__cause__):
            return True
        if err.__context__ is not None and err.__context__ is not err.__cause__:
            return walk(err.__context__)
        return False

    return walk(exc)


def prepare_hf_hub_env_before_pocket_tts_import() -> None:
    """Force Hugging Face cache-only mode before huggingface_hub is imported (via pocket_tts)."""
    if truthy_env("HEY_HF_ALLOW_NETWORK"):
        LOGGER.debug("HEY_HF_ALLOW_NETWORK set; HF_HUB_OFFLINE not forced by this script")
        return

    prev = os.environ.get("HF_HUB_OFFLINE")
    os.environ["HF_HUB_OFFLINE"] = "1"
    if prev != "1":
        LOGGER.debug("Local-only: HF_HUB_OFFLINE=1 (Hub HTTP disabled)")
