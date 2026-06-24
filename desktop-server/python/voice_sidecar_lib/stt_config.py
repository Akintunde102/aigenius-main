"""Desktop voice sidecar STT backend selection (env-driven).

``AIGENIUS_STT_BACKEND`` (default ``auto``):

- ``auto`` — use ``whisper_cpp`` when the CLI **and** GGML/GGUF weights are available; otherwise
  **faster_whisper** so local STT works without manual whisper.cpp setup.

- ``whisper_cpp`` — **only** ggml-org whisper.cpp subprocess. Set ``WHISPER_CPP_MODEL`` or
  ``WHISPER_CPP_MODEL_DIR`` (``ggml-<size>.bin`` / ``.gguf``), optional ``WHISPER_CPP_CLI``.

- ``faster_whisper`` (aliases: ``faster-whisper``, ``fw``, ``ctranslate``) — in-process faster-whisper.
"""

from __future__ import annotations

import os


def _whisper_cpp_ready() -> bool:
    """True when whisper.cpp can run a default ``base`` model (env + files on disk)."""
    from voice_sidecar_lib.log import LOGGER
    try:
        from voice_sidecar_lib.stt_whisper_cpp import resolve_model_path, resolve_whisper_server_cli
    except Exception:
        return False
    ms = (os.environ.get("AIGENIUS_STT_MODEL_SIZE") or "base").strip().lower() or "base"
    LOGGER.debug(f"_whisper_cpp_ready: model_size='{ms}'")
    cli_ok = resolve_whisper_server_cli()
    model_ok = resolve_model_path(ms)
    LOGGER.debug(f"_whisper_cpp_ready: cli_ok={cli_ok}, model_ok={model_ok}")
    return bool(cli_ok and model_ok)


def get_stt_backend() -> str:
    """
    Which engine handles ``action: transcribe``.

    - ``auto`` (default): whisper.cpp when fully configured, else faster_whisper.
    - ``whisper_cpp``: whisper-cli only.
    - ``faster_whisper``: Python faster-whisper.
    """
    from voice_sidecar_lib.log import LOGGER
    
    raw = (os.environ.get("AIGENIUS_STT_BACKEND") or "auto").strip().lower()
    raw_r= os.environ.get("AIGENIUS_STT_MODEL_SIZE")
    LOGGER.debug(f"AIGENIUS_STT_MODEL_SIZE='{raw_r}'")
    LOGGER.debug(f"STT backend selection: raw='{raw}'")
    if raw in ("faster_whisper", "faster-whisper", "fw", "ctranslate"):
        return "faster_whisper"
    if raw in ("whisper_cpp", "whisper-cpp", "whisper"):
        return "whisper_cpp"
    return "whisper_cpp" if _whisper_cpp_ready() else "faster_whisper"