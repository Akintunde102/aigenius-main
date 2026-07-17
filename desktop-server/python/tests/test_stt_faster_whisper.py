"""Tests for faster-whisper STT model size normalization."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# voice_sidecar_lib lives next to this tests/ package under python/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from voice_sidecar_lib.stt_faster_whisper import (  # noqa: E402
    _FASTER_WHISPER_MODEL_SIZE,
    load_stt_model,
    normalize_faster_whisper_model_size,
)


class NormalizeFasterWhisperModelSizeTests(unittest.TestCase):
    def test_maps_whisper_cpp_and_env_sizes_to_tiny_en(self) -> None:
        cases = [
            "tiny",
            "tiny.en",
            "base",
            "BASE",
            "small",
            "small.en-q5_1",
            "medium",
            "large",
            "unknown-model",
            "",
        ]
        for model_size in cases:
            with self.subTest(model_size=model_size):
                self.assertEqual(
                    normalize_faster_whisper_model_size(model_size),
                    _FASTER_WHISPER_MODEL_SIZE,
                )


class LoadSttModelTests(unittest.TestCase):
    def setUp(self) -> None:
        import voice_sidecar_lib.stt_faster_whisper as stt_module

        stt_module._stt_model_singleton = None

    def tearDown(self) -> None:
        import voice_sidecar_lib.stt_faster_whisper as stt_module

        stt_module._stt_model_singleton = None

    @patch("faster_whisper.WhisperModel")
    def test_load_stt_model_uses_normalized_size(self, whisper_model_cls: MagicMock) -> None:
        whisper_model_cls.return_value = MagicMock(name="whisper-model")

        load_stt_model("small.en-q5_1")

        whisper_model_cls.assert_called_once()
        self.assertEqual(whisper_model_cls.call_args.args[0], _FASTER_WHISPER_MODEL_SIZE)


if __name__ == "__main__":
    unittest.main()
