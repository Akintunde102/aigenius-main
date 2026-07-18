"""Tests for JSON stdio sidecar startup and lazy TTS loading."""

from __future__ import annotations

import asyncio
import sys
import unittest
from unittest.mock import MagicMock, patch

from voice_sidecar_lib.json_stdio_server import _handle_generate, run_stdio_json_command_loop


class RunStdioJsonCommandLoopStartupTests(unittest.TestCase):
    @patch("voice_sidecar_lib.json_stdio_server.generate_speech")
    @patch("voice_sidecar_lib.json_stdio_server.warm_stt_at_sidecar_startup")
    @patch("voice_sidecar_lib.json_stdio_server.log_timed_step")
    def test_startup_warms_stt_only_not_tts(
        self,
        mock_timed_step: MagicMock,
        mock_warm_stt: MagicMock,
        mock_generate_speech: MagicMock,
    ) -> None:
        mock_timed_step.return_value.__enter__ = MagicMock(return_value=None)
        mock_timed_step.return_value.__exit__ = MagicMock(return_value=False)

        loop = MagicMock()

        async def fake_run_in_executor(_executor, fn, *args):
            if fn is sys.stdin.readline:
                return ""
            return fn(*args)

        loop.run_in_executor = fake_run_in_executor

        with patch("asyncio.get_running_loop", return_value=loop):
            asyncio.run(run_stdio_json_command_loop())

        mock_warm_stt.assert_called_once()
        mock_generate_speech.assert_not_called()


class HandleGenerateTests(unittest.TestCase):
    @patch("voice_sidecar_lib.json_stdio_server.generate_speech", return_value="/tmp/out.wav")
    @patch("voice_sidecar_lib.json_stdio_server._safe_print_json")
    def test_handle_generate_loads_tts_lazily_on_first_request(
        self,
        _mock_print: MagicMock,
        mock_generate_speech: MagicMock,
    ) -> None:
        _handle_generate(
            {
                "text": "hello",
                "voice": "alba",
                "output": "out.wav",
                "req_id": "req-1",
            }
        )

        mock_generate_speech.assert_called_once()


if __name__ == "__main__":
    unittest.main()
