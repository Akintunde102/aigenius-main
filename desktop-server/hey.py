"""
Pocket-TTS loads weights via huggingface_hub (see pocket_tts.utils.download_if_necessary).
Weights are read from the HF disk cache (typically %USERPROFILE%/.cache/huggingface/hub).

This script is local-only by default: it sets HF_HUB_OFFLINE before importing pocket_tts, so
huggingface_hub does not open HTTP connections to the Hub. There is no TCP "ping" or
reachability check.

Prime the cache first (e.g. huggingface-cli download, or run once with network allowed).
To allow Hub downloads from this process: HEY_HF_ALLOW_NETWORK=1 (disables the forced offline flag).
"""
import errno
import logging
import os
import socket
import time
from contextlib import contextmanager
from functools import lru_cache

logger = logging.getLogger(__name__)


@contextmanager
def _timer(step_name: str):
    """Context manager to time and log execution steps."""
    start = time.perf_counter()
    logger.info("⏱️  [START] %s", step_name)
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        logger.info("✅ [DONE]  %s (%.3fs)", step_name, elapsed)

# Pre-compute offline error codes at module level (avoid repeated getattr calls)
_OFFLINE_ERROR_CODES = {
    errno.ECONNREFUSED,
    errno.ENETUNREACH,
    errno.ETIMEDOUT,
    11001,  # WSAHOST_NOT_FOUND (Windows)
}
_eai = getattr(errno, "EAI_AGAIN", None)
if _eai is not None:
    _OFFLINE_ERROR_CODES.add(_eai)

# Pre-compile network error phrases (avoid repeated tuple creation)
_NETWORK_ERROR_PHRASES = (
    "getaddrinfo",
    "connection refused",
    "connection aborted",
    "timed out",
    "name or service not known",
    "temporary failure in name resolution",
)


@lru_cache(maxsize=32)
def _env_flag(name: str) -> bool:
    """Cached environment flag check to avoid repeated os.environ lookups."""
    v = os.environ.get(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _is_hub_connection_error(exc: BaseException) -> bool:
    """True if the failure is likely DNS/network/timeout talking to the Hub (not missing cache)."""
    seen: set[int] = set()

    def walk(err: BaseException | None) -> bool:
        if err is None or id(err) in seen:
            return False
        seen.add(id(err))
        
        # Fast type checks (most common first)
        if isinstance(err, (socket.gaierror, TimeoutError, ConnectionError)):
            return True
        
        if isinstance(err, OSError):
            if err.errno in _OFFLINE_ERROR_CODES:
                return True
            err_s = str(err).lower()
            if "getaddrinfo" in err_s or "name or service not known" in err_s:
                return True
        
        # Lazy import requests only if needed
        if "requests" in str(type(err).__module__):
            try:
                import requests
                if isinstance(err, requests.RequestException):
                    return True
            except ImportError:
                pass
        
        # String matching (expensive, do last)
        msg = str(err).lower()
        if any(phrase in msg for phrase in _NETWORK_ERROR_PHRASES):
            return True
        
        # Walk exception chain
        if err.__cause__ is not None and walk(err.__cause__):
            return True
        if err.__context__ is not None and err.__context__ is not err.__cause__:
            return walk(err.__context__)
        return False

    return walk(exc)


def _prepare_hub_env() -> None:
    """Force Hugging Face cache-only mode before huggingface_hub is imported."""
    if _env_flag("HEY_HF_ALLOW_NETWORK"):
        logger.debug("HEY_HF_ALLOW_NETWORK set; HF_HUB_OFFLINE not forced by this script")
        return

    prev = os.environ.get("HF_HUB_OFFLINE")
    os.environ["HF_HUB_OFFLINE"] = "1"
    if prev != "1":
        logger.debug("Local-only: HF_HUB_OFFLINE=1 (Hub HTTP disabled)")


# Global model cache to avoid reloading
_MODEL_CACHE = None
_STT_MODEL_CACHE = None


def load_tts_model():
    """Load TTS model with caching to avoid repeated loads."""
    global _MODEL_CACHE
    
    if _MODEL_CACHE is not None:
        logger.debug("Returning cached TTS model")
        return _MODEL_CACHE
    
    # HF_HUB_OFFLINE must be set before importing pocket_tts (pulls in huggingface_hub).
    _prepare_hub_env()
    
    # Optimize torch settings before import to reduce initialization overhead
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")  # macOS optimization
    os.environ.setdefault("OMP_NUM_THREADS", "4")  # Limit CPU threads
    os.environ.setdefault("MKL_NUM_THREADS", "4")
    
    with _timer("Import pocket_tts"):
        from pocket_tts import TTSModel

    with _timer("Load TTS model from disk"):
        try:
            model = TTSModel.load_model()
            _MODEL_CACHE = model
            return model
        except Exception as e:
            if os.environ.get("HF_HUB_OFFLINE") == "1" or os.environ.get("TRANSFORMERS_OFFLINE"):
                logger.debug("Load failed while HF offline / cache-only", exc_info=True)
                raise
            if not _is_hub_connection_error(e):
                logger.exception("TTS model load failed (not classified as hub connectivity)")
                raise
            logger.warning(
                "First load failed (%s); retrying with HF_HUB_OFFLINE=1", e, exc_info=logger.isEnabledFor(logging.DEBUG)
            )
            os.environ["HF_HUB_OFFLINE"] = "1"
            model = TTSModel.load_model()
            logger.info("TTS model loaded after offline retry")
            _MODEL_CACHE = model
            return model


def load_stt_model(model_size: str = "base"):
    """Load Faster-Whisper model with caching."""
    global _STT_MODEL_CACHE
    if _STT_MODEL_CACHE is not None:
        return _STT_MODEL_CACHE

    # Faster-Whisper optimization: base/tiny is best for live feel
    with _timer(f"Import and load Faster-Whisper model: {model_size}"):
        try:
            from faster_whisper import WhisperModel
            
            device = "cpu"
            compute_type = "int8"
            
            try:
                import torch
                if torch.cuda.is_available():
                    device = "cuda"
                    compute_type = "float16"
                    logger.info("🚀 NVIDIA GPU detected! Faster-Whisper will use CUDA (float16)")
                else:
                    logger.info("💻 No NVIDIA GPU detected. Faster-Whisper will use CPU (int8)")
            except ImportError:
                logger.info("💻 PyTorch not available for device check. Faster-Whisper will use CPU (int8)")

            model = WhisperModel(model_size, device=device, compute_type=compute_type)
            _STT_MODEL_CACHE = model
            return model
        except ImportError:
            logger.error("faster-whisper not installed. Run: pip install faster-whisper")
            raise
        except Exception as e:
            logger.error("Failed to load STT model: %s", e)
            raise


def transcribe_audio(audio_path: str, model_size: str = "base", beam_size: int = 5, language: str = "en") -> str:
    """Transcribe an audio file using Faster-Whisper."""
    with _timer(f"Transcribe audio: {audio_path} (beam_size={beam_size}, lang={language})"):
        model = load_stt_model(model_size)
        
        # beam_size=1 is faster, 5 is more accurate.
        # vad_filter=True removes silence automatically
        segments, info = model.transcribe(audio_path, beam_size=beam_size, vad_filter=True, language=language)
        
        text = " ".join([segment.text for segment in segments]).strip()
        return text


def _configure_main_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    # HEY_DEBUG must not set the root logger to DEBUG: that enables httpcore/httpx DEBUG and
    # triggers real Hub connections alongside log noise.
    if _env_flag("HEY_DEBUG"):
        logger.setLevel(logging.DEBUG)


def generate_speech(text: str, voice: str = "alba", output_path: str = "output.wav", auto_play: bool = False, progress_callback=None) -> str:
    """
    Generate speech audio from text.
    
    Args:
        text: Text to convert to speech
        voice: Voice identifier (default: "alba")
        output_path: Output WAV file path (default: "output.wav")
        auto_play: If True, opens the audio in browser after generation
        progress_callback: Optional callback for progress updates
    
    Returns:
        Absolute path to the generated audio file
    """
    import scipy.io.wavfile
    
    total_start = time.perf_counter()
    
    if progress_callback:
        progress_callback('loading_model', 5)
    
    with _timer("Load TTS model (total)"):
        tts_model = load_tts_model()
    
    if progress_callback:
        progress_callback('loading_voice', 20)
    
    with _timer(f"Load voice state: {voice}"):
        voice_state = tts_model.get_state_for_audio_prompt(voice)
    
    if progress_callback:
        progress_callback('generating_audio', 40)
    
    with _timer(f"Generate audio (sample_rate={tts_model.sample_rate})"):
        audio = tts_model.generate_audio(voice_state, text)
    
    if progress_callback:
        progress_callback('writing_file', 90)
    
    with _timer(f"Write WAV file: {output_path}"):
        scipy.io.wavfile.write(output_path, tts_model.sample_rate, audio.numpy())
        abs_path = os.path.abspath(output_path)
    
    total_elapsed = time.perf_counter() - total_start
    logger.info("🎯 TOTAL TIME: %.3fs", total_elapsed)
    
    if auto_play:
        with _timer("Open browser for playback"):
            _open_in_browser(abs_path)
    
    return abs_path


def _send_progress(stage: str, percent: int = 0, req_id: str = None):
    """Send progress update via stdout."""
    import sys
    import json
    progress = {'status': 'progress', 'stage': stage, 'percent': percent, 'req_id': req_id}
    print(json.dumps(progress))
    sys.stdout.flush()


def server_mode_json():
    """Server mode with JSON-based IPC for desktop-server integration."""
    import sys
    import json
    
    logger.info("🚀 Starting server mode (model will stay loaded)...")
    with _timer("Initial model load"):
        load_tts_model()  # Pre-load TTS model
        try:
            load_stt_model()  # Pre-load STT model (Faster-Whisper)
        except Exception as e:
            logger.warning("Failed to eager-load STT model: %s", e)
    
    logger.info("✅ Model ready! Waiting for commands...")
    sys.stdout.flush()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                command = json.loads(line)
                action = command.get('action')
                req_id = command.get('req_id')
                
                if action == 'quit':
                    logger.info("Received quit command, shutting down.")
                    break
                elif action == 'generate':
                    text = command.get('text', '')
                    voice = command.get('voice', 'alba')
                    output = command.get('output', 'output.wav')
                    
                    result = generate_speech(
                        text, 
                        voice=voice, 
                        output_path=output, 
                        auto_play=False,
                        progress_callback=lambda stage, pct: _send_progress(stage, pct, req_id=req_id)
                    )
                    _send_progress('complete', 100, req_id=req_id)
                    response = {'status': 'success', 'path': result, 'req_id': req_id}
                    print(json.dumps(response))
                    sys.stdout.flush()
                elif action == 'transcribe':
                    audio_path = command.get('audio')
                    model_size = command.get('model_size', 'base')
                    beam_size = command.get('beam_size', 5)
                    
                    if not audio_path or not os.path.exists(audio_path):
                        response = {'status': 'error', 'message': f'Audio file not found: {audio_path}', 'req_id': req_id}
                    else:
                        text = transcribe_audio(audio_path, model_size=model_size, beam_size=beam_size)
                        response = {'status': 'success', 'text': text, 'req_id': req_id}
                    
                    print(json.dumps(response))
                    sys.stdout.flush()
                else:
                    logger.warning("Unknown action: %s", action)
                    response = {'status': 'error', 'message': f'Unknown action: {action}'}
                    print(json.dumps(response))
                    sys.stdout.flush()
                    
            except json.JSONDecodeError as e:
                logger.error("Invalid JSON command: %s", e)
            except Exception as e:
                logger.error("Command failed: %s", e)
                response = {'status': 'error', 'message': str(e)}
                print(json.dumps(response))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        logger.info("Server stopped.")


def main() -> None:
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate speech audio from text using Pocket-TTS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python hey.py "Hello world"
  python hey.py --server-json  # JSON IPC mode for desktop-server
        """
    )
    parser.add_argument(
        "--server-json",
        action="store_true",
        help="JSON IPC server mode for desktop-server integration"
    )
    
    args = parser.parse_args()
    
    # JSON IPC server mode
    if args.server_json:
        server_mode_json()
        return
    
    # Default: single generation mode
    text = input("Enter text to convert to speech: ").strip()
    if text:
        generate_speech(text)


if __name__ == "__main__":
    _configure_main_logging()
    main()
