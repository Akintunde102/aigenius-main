"""CLI for local Pocket-TTS + desktop STT (default: auto → whisper.cpp or faster-whisper)."""

from __future__ import annotations

import argparse

from voice_sidecar_lib.json_stdio_server import run_stdio_json_command_loop
from voice_sidecar_lib.tts_pocket import generate_speech


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate speech audio from text using Pocket-TTS (and optional local STT server mode).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python python/voice_sidecar.py --server-json
    # JSON IPC mode (spawned by desktop-server Node process)

  cd desktop-server && python python/voice_sidecar.py --server-json
        """,
    )
    parser.add_argument(
        "--server-json",
        action="store_true",
        help="JSON IPC server mode for desktop-server integration",
    )

    args = parser.parse_args()

    if args.server_json:
        import asyncio
        asyncio.run(run_stdio_json_command_loop())
        return

    text = input("Enter text to convert to speech: ").strip()
    if text:
        generate_speech(text)
