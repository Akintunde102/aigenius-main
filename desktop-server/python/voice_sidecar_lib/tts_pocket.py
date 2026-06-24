"""
Pocket-TTS: local speech synthesis (PyTorch, Hugging Face weights on disk).

``load_tts_model`` must not import ``pocket_tts`` until :func:`prepare_hf_hub_env_before_pocket_tts_import`
has run (see ``hf_cache_env``).
"""

from __future__ import annotations

import logging
import os
import time
import webbrowser
from pathlib import Path

from voice_sidecar_lib.hf_cache_env import (
    is_likely_hub_network_error,
    prepare_hf_hub_env_before_pocket_tts_import,
)
from voice_sidecar_lib.log import LOGGER
from voice_sidecar_lib.timing import log_timed_step

_tts_model_singleton = None


def load_tts_model():
    """Load TTS model with caching to avoid repeated loads."""
    global _tts_model_singleton

    if _tts_model_singleton is not None:
        LOGGER.debug("Returning cached TTS model")
        return _tts_model_singleton

    prepare_hf_hub_env_before_pocket_tts_import()

    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    os.environ.setdefault("OMP_NUM_THREADS", "4")
    os.environ.setdefault("MKL_NUM_THREADS", "4")

    with log_timed_step("Import pocket_tts"):
        from pocket_tts import TTSModel

    with log_timed_step("Load TTS model from disk (kyutai/pocket-tts english)"):
        try:
            model = TTSModel.load_model()
            
            # Optimize PyTorch inference if available
            try:
                import torch
                if hasattr(torch, "compile"):
                    LOGGER.info("🚀 Optimizing pocket-tts using torch.compile()...")
                    model = torch.compile(model)
            except Exception as e:
                LOGGER.debug("torch.compile skipped or failed: %s", e)
                
            _tts_model_singleton = model
            return model
        except Exception as e:
            if os.environ.get("HF_HUB_OFFLINE") == "1" or os.environ.get("TRANSFORMERS_OFFLINE"):
                LOGGER.debug("Load failed while HF offline / cache-only", exc_info=True)
                raise
            if not is_likely_hub_network_error(e):
                LOGGER.exception("TTS model load failed (not classified as hub connectivity)")
                raise
            LOGGER.warning(
                "First load failed (%s); retrying with HF_HUB_OFFLINE=1",
                e,
                exc_info=LOGGER.isEnabledFor(logging.DEBUG),
            )
            os.environ["HF_HUB_OFFLINE"] = "1"
            model = TTSModel.load_model()
            LOGGER.info("TTS model loaded after offline retry")
            _tts_model_singleton = model
            return model


def _open_wav_in_default_browser(abs_path: str) -> None:
    webbrowser.open(Path(abs_path).resolve().as_uri())


def _get_tts_backend() -> str:
    """Resolve TTS backend from env: 'onnx', 'pytorch', or 'auto'."""
    raw = (os.environ.get("AIGENIUS_TTS_BACKEND") or "auto").strip().lower()
    if raw == "onnx":
        return "onnx"
    if raw in ("pytorch", "torch"):
        return "pytorch"
    # auto: prefer ONNX when available (model file + onnxruntime installed)
    try:
        from voice_sidecar_lib.tts_onnx import is_onnx_available
        if is_onnx_available():
            LOGGER.info("TTS: ONNX model detected — using ONNX Runtime (set AIGENIUS_TTS_BACKEND=pytorch to override)")
            return "onnx"
    except ImportError:
        pass
    return "pytorch"


def generate_speech(
    text: str,
    voice: str = "azelma",
    output_path: str = "output.wav",
    auto_play: bool = False,
    progress_callback=None,
) -> str:
    """
    Generate speech audio from text.

    Selects backend via ``AIGENIUS_TTS_BACKEND``:
    - ``onnx``    — ONNX Runtime (DirectML on Windows GPU, CPU fallback). Fastest.
    - ``pytorch`` — PyTorch pocket-tts (default when no ONNX model is available).
    - ``auto``    — ONNX if model is present and onnxruntime installed, else PyTorch.

    Returns:
        Absolute path to the generated audio file.
    """
    backend = _get_tts_backend()
    LOGGER.info("TTS backend: %s", backend)
    LOGGER.info("🎤 Synthesizing speech for text: %s", text)

    if backend == "onnx":
        from voice_sidecar_lib.tts_onnx import generate_speech_onnx
        return generate_speech_onnx(
            text,
            output_path=output_path,
            progress_callback=progress_callback,
        )

    # ── PyTorch path ──────────────────────────────────────────────────────────
    import scipy.io.wavfile

    total_start = time.perf_counter()

    if progress_callback:
        progress_callback("loading_model", 5)

    with log_timed_step("Load TTS model (kyutai/pocket-tts english)"):
        tts_model = load_tts_model()

    if progress_callback:
        progress_callback("loading_voice", 20)

    with log_timed_step(f"Load voice state: {voice}"):
        voice_state = tts_model.get_state_for_audio_prompt(voice)

    if progress_callback:
        progress_callback("generating_audio", 40)

    with log_timed_step(f"Generate audio (sample_rate={tts_model.sample_rate})"):
        audio = tts_model.generate_audio(voice_state, text)

    if progress_callback:
        progress_callback("writing_file", 90)

    with log_timed_step(f"Write WAV file: {output_path}"):
        scipy.io.wavfile.write(output_path, tts_model.sample_rate, audio.numpy())
        abs_path = os.path.abspath(output_path)

    total_elapsed = time.perf_counter() - total_start
    LOGGER.info("🎯 TOTAL TIME: %.3fs", total_elapsed)

    if auto_play:
        with log_timed_step("Open browser for playback"):
            _open_wav_in_default_browser(abs_path)

    return abs_path
