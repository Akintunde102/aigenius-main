"""
STT **facade** — one place to swap engines.

- **Default:** ``whisper.cpp`` CLI (``stt_whisper_cpp``). Set ``WHISPER_CPP_MODEL`` / ``WHISPER_CPP_MODEL_DIR``.
- **Alternative:** ``AIGENIUS_STT_BACKEND=faster_whisper`` → ``stt_faster_whisper`` (Python package).

``json_stdio_server`` should import only this module for STT, not the backends directly.
"""

from __future__ import annotations

from voice_sidecar_lib.log import LOGGER
from voice_sidecar_lib.stt_config import get_stt_backend
from voice_sidecar_lib.stt_faster_whisper import load_stt_model as load_faster_whisper_model
from voice_sidecar_lib.stt_faster_whisper import transcribe_audio as transcribe_faster_whisper
from voice_sidecar_lib.stt_whisper_cpp import probe_whisper_cpp_env
from voice_sidecar_lib.stt_whisper_cpp import transcribe_audio as transcribe_whisper_cpp


def warm_stt_at_sidecar_startup() -> None:
    """Eager-load or probe STT depending on ``AIGENIUS_STT_BACKEND``."""
    if get_stt_backend() == "faster_whisper":
        try:
            load_faster_whisper_model()
        except Exception as e:
            LOGGER.warning("Failed to eager-load Faster-Whisper STT model: %s", e)
    else:
        probe_whisper_cpp_env()


def transcribe_audio(
    audio_path: str,
    model_size: str = "small.en-q5_1",
    beam_size: int = 5,
    language: str = "en",
) -> str:
    """Transcribe using the configured backend (same signature for both engines)."""
    if get_stt_backend() == "faster_whisper":
        return transcribe_faster_whisper(
            audio_path,
            model_size=model_size,
            beam_size=beam_size,
            language=language,
        )
    return transcribe_whisper_cpp(
        audio_path,
        model_size=model_size,
        beam_size=beam_size,
        language=language,
    )
