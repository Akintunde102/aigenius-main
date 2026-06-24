"""
Internal implementation for ``voice_sidecar.py``.

- **TTS:** Pocket-TTS (PyTorch + Hugging Face cache).
- **STT:** default **auto** (``stt_config``): whisper.cpp when CLI + weights are configured, otherwise **faster-whisper**.
  Set ``AIGENIUS_STT_BACKEND=whisper_cpp`` or ``faster_whisper`` to force one engine (see ``stt_runtime``).
"""
