"""
JSON lines over stdin/stdout — protocol consumed by ``desktop-server`` (Node ``VoiceSidecar``).

Each inbound line is a JSON object with ``action`` and optional ``req_id``.
Progress lines use ``status: "progress"``; results use ``status: "success"`` or ``"error"``.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import threading
from typing import Optional

from voice_sidecar_lib.log import LOGGER
from voice_sidecar_lib.stt_runtime import transcribe_audio, warm_stt_at_sidecar_startup
from voice_sidecar_lib.timing import log_timed_step
from voice_sidecar_lib.tts_pocket import generate_speech


# Lock to ensure JSON strings are written cleanly to stdout without interleaving
_stdout_lock = threading.Lock()

def _safe_print_json(data: dict) -> None:
    """Thread-safe print to stdout."""
    line = json.dumps(data)
    with _stdout_lock:
        print(line)
        sys.stdout.flush()


def emit_progress_line(stage: str, percent: int = 0, req_id: Optional[str] = None) -> None:
    """Send one JSON progress object on stdout (Node parses lines starting with ``{``)."""
    progress = {"status": "progress", "stage": stage, "percent": percent, "req_id": req_id}
    _safe_print_json(progress)


def _handle_generate(command: dict) -> None:
    """Blocking worker for TTS generation."""
    try:
        text = command.get("text", "")
        voice = command.get("voice") or os.environ.get("AIGENIUS_TTS_VOICE", "alba")
        output = command.get("output", "output.wav")
        req_id = command.get("req_id")

        result = generate_speech(
            text,
            voice=voice,
            output_path=output,
            auto_play=False,
            progress_callback=lambda stage, pct: emit_progress_line(stage, pct, req_id=req_id),
        )
        emit_progress_line("complete", 100, req_id=req_id)
        response = {"status": "success", "path": result, "req_id": req_id}
        _safe_print_json(response)
    except Exception as e:
        LOGGER.error("Generate failed: %s", e)
        response = {"status": "error", "message": str(e), "req_id": command.get("req_id")}
        _safe_print_json(response)


def _handle_transcribe(command: dict) -> None:
    """Blocking worker for STT transcription."""
    try:
        audio_path = command.get("audio")
        model_size = command.get("model_size", "base")
        beam_size = command.get("beam_size", 5)
        req_id = command.get("req_id")

        if not audio_path or not os.path.exists(audio_path):
            response = {
                "status": "error",
                "message": f"Audio file not found: {audio_path}",
                "req_id": req_id,
            }
        else:
            text = transcribe_audio(
                audio_path,
                model_size=model_size,
                beam_size=beam_size,
            )
            response = {"status": "success", "text": text, "req_id": req_id}
        
        _safe_print_json(response)
    except Exception as e:
        LOGGER.error("Transcribe failed: %s", e)
        response = {"status": "error", "message": str(e), "req_id": command.get("req_id")}
        _safe_print_json(response)


async def run_stdio_json_command_loop() -> None:
    """Async block on stdin; dispatch ``generate``, ``transcribe``, ``quit`` actions concurrently."""
    LOGGER.info("🚀 Starting server mode (model will stay loaded)...")
    with log_timed_step("Initial model load"):
        # We run these synchronously at startup since they only happen once
        # Skip loading TTS model at startup to prevent network/Hugging Face hangs.
        # It will be loaded lazily on-demand when the first TTS generation is called.
        warm_stt_at_sidecar_startup()

    LOGGER.info("✅ Model ready! Waiting for commands...")
    sys.stdout.flush()

    loop = asyncio.get_running_loop()

    try:
        while True:
            # Read a line from stdin asynchronously without blocking the event loop
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                break  # EOF

            line = line.strip()
            if not line:
                continue

            try:
                command = json.loads(line)
                action = command.get("action")

                if action == "quit":
                    LOGGER.info("Received quit command, shutting down.")
                    break
                elif action == "generate":
                    # Fire and forget into a background thread
                    asyncio.create_task(asyncio.to_thread(_handle_generate, command))
                elif action == "transcribe":
                    # Fire and forget into a background thread
                    asyncio.create_task(asyncio.to_thread(_handle_transcribe, command))
                else:
                    LOGGER.warning("Unknown action: %s", action)
                    response = {"status": "error", "message": f"Unknown action: {action}"}
                    _safe_print_json(response)

            except json.JSONDecodeError as e:
                LOGGER.error("Invalid JSON command: %s", e)
            except Exception as e:
                LOGGER.error("Command failed: %s", e)
                response = {"status": "error", "message": str(e)}
                _safe_print_json(response)

    except KeyboardInterrupt:
        LOGGER.info("Server stopped.")
