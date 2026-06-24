"""
Speech-to-text via **whisper.cpp** local HTTP server.

Requires a built ``whisper-server`` (or legacy ``server``) binary and GGML/GGUF weights.
Audio is normalized to 16 kHz mono WAV via the Rust audio-transcoder extension (zero
subprocess overhead) or ffmpeg fallback before inference (matches WebM from the app).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import atexit
import time
import json
import uuid
import threading
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

from voice_sidecar_lib.log import LOGGER
from voice_sidecar_lib.timing import log_timed_step

_server_process: Optional[subprocess.Popen] = None
_server_lock = threading.Lock()
# whisper-server handles one inference at a time reliably on Windows
_inference_lock = threading.Lock()
WHISPER_SERVER_PORT = int(os.environ.get("WHISPER_CPP_PORT", "8085"))
WHISPER_HEALTH_URL = f"http://127.0.0.1:{WHISPER_SERVER_PORT}/health"


def resolve_whisper_server_cli() -> Optional[str]:
    """Return path to whisper.cpp server executable, or None."""
    explicit = (os.environ.get("WHISPER_CPP_SERVER_CLI") or "").strip().strip('"')
    if explicit:
        if os.path.isfile(explicit):
            return explicit
        return shutil.which(explicit)
    # 1. Check local bin/ folder (supports running from src or dist)
    candidates = [
        Path(__file__).parent.parent.parent / "bin",        # from python/
        Path(__file__).parent.parent.parent.parent / "bin", # from dist/python/
        Path.cwd() / "desktop-server" / "bin",
        Path.cwd().parent / "desktop-server" / "bin",
        Path.cwd() / "bin",
    ]
    
    for cand in candidates:
        for name in ("whisper-server.exe", "whisper-server", "server.exe", "server"):
            local_bin = cand / name
            if local_bin.is_file():
                return str(local_bin)

    # 2. Check PATH
    for name in ("whisper-server", "server"):
        found = shutil.which(name)
        if found and not found.lower().endswith(".cpl"):
            return found
    return None


def resolve_model_path(model_size: str) -> Optional[str]:
    """
    Resolve GGML/GGUF model file.
    """
    full = (os.environ.get("WHISPER_CPP_MODEL") or "").strip().strip('"')
    if full and os.path.isfile(full):
        return full

    model_dir = (os.environ.get("WHISPER_CPP_MODEL_DIR") or "").strip().strip('"').rstrip("/\\")
    
    if model_dir and not os.path.isdir(model_dir):
        model_dir = ""

    if not model_dir:
        candidates = [
            (Path(__file__).parent.parent.parent / "models").resolve(),
            (Path.cwd() / "desktop-server" / "models").resolve(),
            (Path.cwd().parent / "desktop-server" / "models").resolve(),
        ]
        for cand in candidates:
            if cand.is_dir():
                model_dir = str(cand)
                break
        
        if not model_dir:
            return None
    
    env_ms = (os.environ.get("AIGENIUS_STT_MODEL_SIZE") or "").strip().lower()
    ms = env_ms if env_ms else model_size.strip().lower()
    for name in (
        f"ggml-{ms}.bin",
        f"ggml-{ms}.en.bin",
        f"ggml-{ms}.gguf",
        f"ggml-{ms}.en.gguf",
    ):
        candidate = os.path.join(model_dir, name)
        if os.path.isfile(candidate):
            return candidate

    # Wildcard search for quantized or variant names (e.g. small.en-q5_1 when small or small.en requested)
    for ext in (".bin", ".gguf"):
        prefix = f"ggml-{ms}"
        try:
            for item in os.listdir(model_dir):
                if item.startswith(prefix) and item.endswith(ext) and os.path.isfile(os.path.join(model_dir, item)):
                    return os.path.join(model_dir, item)
        except Exception:
            pass
    return None


def _to_wav16k_mono(src: str, dst_wav: str) -> None:
    """
    Convert *src* to a 16 kHz mono WAV at *dst_wav*.
    """
    from voice_sidecar_lib.audio_transcoder_shim import BACKEND, transcode_to_wav
    LOGGER.debug("Audio transcode via %s: %s → %s", BACKEND, src, dst_wav)
    transcode_to_wav(src, dst_wav)


def _server_health_ok() -> bool:
    """True when whisper-server responds with status ok (model loaded)."""
    try:
        req = urllib.request.Request(WHISPER_HEALTH_URL, method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as response:
            if response.status != 200:
                return False
            body = json.loads(response.read().decode("utf-8"))
            return body.get("status") == "ok"
    except Exception:
        return False


def _wait_for_server_ready(timeout_sec: float = 60.0) -> bool:
    """Poll /health until the model is ready or the child process exits."""
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        if _server_health_ok():
            return True
        proc = _server_process
        if proc is not None and proc.poll() is not None:
            return False
        time.sleep(0.25)
    return _server_health_ok()


def _terminate_server_process() -> None:
    global _server_process
    if _server_process is None:
        return
    LOGGER.info("Stopping local whisper.cpp server...")
    _server_process.terminate()
    try:
        _server_process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        _server_process.kill()
    _server_process = None


def _cleanup_server():
    with _server_lock:
        _terminate_server_process()


atexit.register(_cleanup_server)


def _start_whisper_server_unlocked(model_size: str = "base") -> None:
    """Start whisper-server; caller must hold ``_server_lock``."""
    global _server_process

    if _server_health_ok():
        LOGGER.info("whisper.cpp server is already running.")
        return

    if _server_process is not None:
        _terminate_server_process()

    cli = resolve_whisper_server_cli()
    if not cli:
        LOGGER.warning("whisper.cpp server executable not found. Transcriptions will fail until resolved.")
        return

    model_path = resolve_model_path(model_size)
    if not model_path:
        LOGGER.warning(f"whisper.cpp model not found for size: {model_size}. Transcriptions will fail.")
        return

    cmd = [
        cli,
        "-m", model_path,
        "--port", str(WHISPER_SERVER_PORT),
        "--host", "127.0.0.1"
    ]

    use_gpu = False
    
    # 1. Explicit environment override
    if os.environ.get("WHISPER_CPP_GPU", "").strip().lower() in ("1", "true", "yes"):
        use_gpu = True
    else:
        # 2. Lightweight hardware detection (NVIDIA)
        try:
            result = subprocess.run(["nvidia-smi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if result.returncode == 0:
                use_gpu = True
        except FileNotFoundError:
            pass
            
        # 3. Fallback to PyTorch (for AMD/DirectML detection if present)
        if not use_gpu:
            try:
                import torch
                if torch.cuda.is_available():
                    use_gpu = True
            except ImportError:
                pass
        
    if use_gpu:
        LOGGER.info("🚀 Starting whisper.cpp server utilizing GPU")
    else:
        cmd.extend(["-ng"])

    threads = (os.environ.get("WHISPER_CPP_THREADS") or "").strip()
    if threads.isdigit():
        cmd.extend(["-t", threads])
    else:
        import multiprocessing
        try:
            cpu_count = multiprocessing.cpu_count()
            # Optimal safe thread count: half of CPU cores (capped between 1 and 4)
            safe_threads = str(max(1, min(4, cpu_count // 2 if cpu_count > 4 else cpu_count)))
            cmd.extend(["-t", safe_threads])
            LOGGER.info(f"whisper.cpp auto-allocated {safe_threads} CPU threads (responsive UI default).")
        except Exception:
            cmd.extend(["-t", "4"])

    bin_dir = os.path.dirname(cli)
    env = os.environ.copy()
    env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")

    LOGGER.info("Starting whisper.cpp server on port %s...", WHISPER_SERVER_PORT)

    _server_process = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )

    if not _wait_for_server_ready():
        stderr_output = ""
        if _server_process.stderr:
            stderr_output = _server_process.stderr.read().strip()
        exit_code = _server_process.poll()
        LOGGER.error(
            "whisper.cpp server failed to become ready (exit code: %s). Error: %s",
            exit_code,
            stderr_output,
        )
        _terminate_server_process()
        return

    LOGGER.info("whisper.cpp server is running and model is loaded in memory.")
    if _server_process.stderr:
        _server_process.stderr.close()


def start_whisper_server(model_size: str = "base"):
    LOGGER.info("Starting whisper.cpp server with model size: %s", model_size)
    with _server_lock:
        _start_whisper_server_unlocked(model_size)


def _ensure_whisper_server(model_size: str) -> None:
    with _server_lock:
        if _server_health_ok():
            return
        LOGGER.info("whisper.cpp server is not running. Attempting to start it...")
        _start_whisper_server_unlocked(model_size)
        if _server_process is None or not _server_health_ok():
            raise RuntimeError("whisper.cpp server failed to start.")


def probe_whisper_cpp_env() -> None:
    """Log configuration hints at sidecar startup (non-fatal) and start the server."""
    from voice_sidecar_lib.audio_transcoder_shim import BACKEND
    LOGGER.info("Audio transcoder backend: %s", BACKEND)
    
    # Start the server early
    ms = (os.environ.get("AIGENIUS_STT_MODEL_SIZE") or "base").strip().lower() or "base"
    start_whisper_server(ms)


def _post_multipart(url: str, file_path: str, params: Optional[dict] = None) -> dict:
    boundary = uuid.uuid4().hex
    headers = {'Content-Type': f'multipart/form-data; boundary=' + boundary}
    
    body = b""
    if params:
        for key, val in params.items():
            if val is not None:
                body += (
                    f'--{boundary}\r\n'
                    f'Content-Disposition: form-data; name="{key}"\r\n\r\n'
                    f'{val}\r\n'
                ).encode('utf-8')

    with open(file_path, 'rb') as f:
        file_data = f.read()
        
    filename = os.path.basename(file_path)
    
    body += (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: audio/wav\r\n\r\n'
    ).encode('utf-8')
    body += file_data
    body += f'\r\n--{boundary}--\r\n'.encode('utf-8')
    
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=30) as response:
        resp_body = response.read()
        return json.loads(resp_body.decode('utf-8'))


def transcribe_audio(
    audio_path: str,
    model_size: str = "base",
    beam_size: int = 5,
    language: str = "en",
) -> str:
    """
    Transcribe using local whisper.cpp HTTP server.
    """
    env_ms = (os.environ.get("AIGENIUS_STT_MODEL_SIZE") or "").strip().lower()
    ms = env_ms if env_ms else model_size.strip().lower()

    _ensure_whisper_server(ms)

    with log_timed_step(f"Transcribe (whisper.cpp server): {audio_path}"):
        td = tempfile.mkdtemp(prefix="aigenius-whisper-cpp-")
        try:
            wav_path = os.path.join(td, "input.wav")
            _to_wav16k_mono(audio_path, wav_path)

            url = f"http://127.0.0.1:{WHISPER_SERVER_PORT}/inference"

            post_params = {
                "language": language,
                "temperature": "0.0",
                "beam_size": str(beam_size),
            }

            with _inference_lock:
                if not _server_health_ok():
                    _ensure_whisper_server(ms)
                try:
                    response_data = _post_multipart(url, wav_path, params=post_params)
                except urllib.error.URLError as e:
                    raise RuntimeError(f"Failed to connect to local whisper.cpp server: {e}") from e

            text = response_data.get("text", "").strip()
            return text
        finally:
            shutil.rmtree(td, ignore_errors=True)
