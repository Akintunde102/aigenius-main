"""Tests for voice sidecar stdio server startup and lazy TTS loading."""

from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# voice_sidecar_lib lives next to this tests/ package under python/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from voice_sidecar_lib.json_stdio_server import run_stdio_json_command_loop  # noqa: E402


class RunStdioJsonCommandLoopStartupTests(unittest.IsolatedAsyncioTestCase):
    @patch("voice_sidecar_lib.tts_pocket.load_tts_model")
    @patch("voice_sidecar_lib.json_stdio_server.warm_stt_at_sidecar_startup")
    @patch("voice_sidecar_lib.json_stdio_server.sys.stdin")
    async def test_startup_warms_stt_without_eager_tts_load(
        self,
        mock_stdin: MagicMock,
        warm_stt: MagicMock,
        load_tts: MagicMock,
    ) -> None:
        mock_stdin.readline.return_value = ""

        await run_stdio_json_command_loop()

        warm_stt.assert_called_once_with()
        load_tts.assert_not_called()

    @patch("voice_sidecar_lib.json_stdio_server._safe_print_json")
    @patch("voice_sidecar_lib.json_stdio_server.generate_speech", return_value="out.wav")
    @patch("voice_sidecar_lib.tts_pocket.load_tts_model")
    @patch("voice_sidecar_lib.json_stdio_server.warm_stt_at_sidecar_startup")
    @patch("voice_sidecar_lib.json_stdio_server.sys.stdin")
    async def test_first_generate_uses_lazy_tts_path(
        self,
        mock_stdin: MagicMock,
        warm_stt: MagicMock,
        load_tts: MagicMock,
        generate_speech: MagicMock,
        _safe_print_json: MagicMock,
    ) -> None:
        mock_stdin.readline.side_effect = [
            '{"action": "generate", "text": "hello", "output": "out.wav", "req_id": "1"}\n',
            "",
        ]

        await run_stdio_json_command_loop()
        await asyncio.sleep(0.05)

        warm_stt.assert_called_once_with()
        load_tts.assert_not_called()
        generate_speech.assert_called_once()
        self.assertEqual(generate_speech.call_args.args[0], "hello")


if __name__ == "__main__":
    unittest.main()
