"""
Speech-to-text via the **faster-whisper** Python package (Guillaume Klein).

This wraps CTranslate2 + Whisper weights. Used when ``AIGENIUS_STT_BACKEND=faster_whisper``.
The default desktop STT backend is **whisper.cpp** (see ``stt_whisper_cpp.py``); faster-whisper
remains in ``requirements-tts.txt`` for optional use.
"""

from __future__ import annotations

from voice_sidecar_lib.log import LOGGER
from voice_sidecar_lib.timing import log_timed_step

_stt_model_singleton = None


def load_stt_model(model_size: str = "base"):
    """Load Faster-Whisper model with caching (single process-wide instance)."""
    global _stt_model_singleton
    if _stt_model_singleton is not None:
        return _stt_model_singleton

    with log_timed_step(f"Import and load Faster-Whisper model: {model_size}"):
        try:
            from faster_whisper import WhisperModel

            device = "cpu"
            compute_type = "int8"

            try:
                import torch

                if torch.cuda.is_available():
                    device = "cuda"
                    compute_type = "float16"
                    LOGGER.info("🚀 NVIDIA GPU detected! Faster-Whisper will use CUDA (float16)")
                else:
                    LOGGER.info("💻 No NVIDIA GPU detected. Faster-Whisper will use CPU (int8)")
            except ImportError:
                LOGGER.info("💻 PyTorch not available for device check. Faster-Whisper will use CPU (int8)")

            model = WhisperModel(model_size, device=device, compute_type=compute_type)
            _stt_model_singleton = model
            return model
        except ImportError:
            LOGGER.error("faster-whisper not installed. Run: pip install faster-whisper")
            raise
        except Exception as e:
            LOGGER.error("Failed to load STT model: %s", e)
            raise


def transcribe_audio(
    audio_path: str,
    model_size: str = "base",
    beam_size: int = 5,
    language: str = "en",
) -> str:
    """Transcribe an audio file using faster-whisper (same defaults as the monolithic script)."""
    with log_timed_step(f"Transcribe audio: {audio_path} (model=faster-whisper-{model_size}, beam_size={beam_size}, lang={language})"):
        model = load_stt_model(model_size)

        # beam_size=1 is faster, 5 is more accurate.
        # vad_filter=True removes silence automatically
        segments, info = model.transcribe(audio_path, beam_size=beam_size, vad_filter=True, language=language)

        text = " ".join([segment.text for segment in segments]).strip()
        return text
