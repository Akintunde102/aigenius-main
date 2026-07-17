"""Tests for faster-whisper STT model size normalization and loading."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import voice_sidecar_lib.stt_faster_whisper as stt_fw
from voice_sidecar_lib.stt_faster_whisper import (
    load_stt_model,
    normalize_faster_whisper_model_size,
)


class NormalizeFasterWhisperModelSizeTests(unittest.TestCase):
    def test_maps_whisper_cpp_style_sizes_to_tiny_en(self) -> None:
        cases = [
            "tiny",
            "tiny.en",
            "base",
            "base.en",
            "small",
            "small.en-q5_1",
            "medium",
            "medium.en",
            "large-v3",
            "BASE",
            "unknown-size",
        ]
        for model_size in cases:
            with self.subTest(model_size=model_size):
                self.assertEqual(
                    normalize_faster_whisper_model_size(model_size),
                    "tiny.en",
                )


class LoadSttModelTests(unittest.TestCase):
    def setUp(self) -> None:
        stt_fw._stt_model_singleton = None

    def tearDown(self) -> None:
        stt_fw._stt_model_singleton = None

    @patch("faster_whisper.WhisperModel")
    def test_load_stt_model_uses_normalized_size_for_whisper_cpp_name(
        self,
        whisper_model_cls: MagicMock,
    ) -> None:
        whisper_model_cls.return_value = MagicMock(name="model")

        load_stt_model("small.en-q5_1")

        whisper_model_cls.assert_called_once()
        self.assertEqual(whisper_model_cls.call_args.args[0], "tiny.en")

    @patch("faster_whisper.WhisperModel")
    def test_load_stt_model_returns_cached_singleton(
        self,
        whisper_model_cls: MagicMock,
    ) -> None:
        cached = MagicMock(name="cached-model")
        whisper_model_cls.return_value = cached

        first = load_stt_model("base")
        second = load_stt_model("medium")

        self.assertIs(first, second)
        whisper_model_cls.assert_called_once()


if __name__ == "__main__":
    unittest.main()
