"""
Local voice sidecar for AIGenius desktop-server.

**TTS:** Pocket-TTS (PyTorch; Hugging Face Hub cache on disk — see ``voice_sidecar_lib/tts_pocket.py``).

**STT:** Default **auto** (``stt_config``): whisper.cpp when CLI + weights exist, else **faster-whisper**.
Force with ``AIGENIUS_STT_BACKEND=whisper_cpp`` or ``faster_whisper``.

**Hub / offline:** Before Pocket-TTS imports, we may force ``HF_HUB_OFFLINE=1`` so
``huggingface_hub`` does not open HTTP connections. Prime the cache first, or set
``HEY_HF_ALLOW_NETWORK=1`` to allow Hub downloads from this process.
"""

from voice_sidecar_lib.cli import main
from voice_sidecar_lib.logging_config import configure_main_logging

if __name__ == "__main__":
    configure_main_logging()
    main()
