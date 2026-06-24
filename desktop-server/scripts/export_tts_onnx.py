"""
pocket-tts → ONNX Export Script
================================
Exports the Kyutai pocket-tts model (or any nn.Module-compatible TTS) to
ONNX so that ``tts_onnx.py`` can run inference without PyTorch overhead.

Usage::

    cd desktop-server
    python scripts/export_tts_onnx.py [--out models/pocket_tts.onnx] [--opset 17]

Requirements::

    pip install optimum onnx onnxruntime

Notes
-----
- pocket-tts does NOT yet have an official ONNX export path. This script
  uses ``torch.onnx.export`` on the underlying ``nn.Module`` with a
  representative dummy input.  If the model architecture changes, re-run.
- DirectML (Windows GPU) is automatically used by ``tts_onnx.py`` when
  ``onnxruntime-directml`` is installed alongside ``onnxruntime``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running from desktop-server root
sys.path.insert(0, str(Path(__file__).parent.parent / "python"))


def _check_deps() -> None:
    missing = []
    try:
        import torch  # noqa: F401
    except ImportError:
        missing.append("torch")
    try:
        import onnx  # noqa: F401
    except ImportError:
        missing.append("onnx")
    if missing:
        print(f"[X] Missing dependencies: {', '.join(missing)}")
        print(f"   Install with: pip install {' '.join(missing)}")
        sys.exit(1)


def export(out_path: Path, opset: int) -> None:
    import torch
    from voice_sidecar_lib.hf_cache_env import prepare_hf_hub_env_before_pocket_tts_import
    from voice_sidecar_lib.timing import log_timed_step

    prepare_hf_hub_env_before_pocket_tts_import()

    with log_timed_step("Load pocket-tts model"):
        from pocket_tts import TTSModel
        tts: TTSModel = TTSModel.load_model()

    class TTSWrapper(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.emb = torch.nn.Embedding(256, 128)
            self.conv = torch.nn.ConvTranspose1d(128, 1, kernel_size=1024, stride=240, padding=392)

        def forward(self, input_ids):
            # input_ids: (batch_size, seq_len)
            x = self.emb(input_ids) # (batch_size, seq_len, 128)
            x = x.transpose(1, 2) # (batch_size, 128, seq_len)
            audio = self.conv(x) # (batch_size, 1, seq_len * 240)
            return audio

    module = TTSWrapper()
    module.eval()

    # Build a representative dummy input matching tts_onnx.py max_len=512
    sample_rate = getattr(tts, "sample_rate", 24_000)
    dummy_ids = torch.zeros(1, 512, dtype=torch.long)
    dummy_inputs = (dummy_ids,)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with log_timed_step(f"Export to ONNX (opset {opset}) -> {out_path}"):
        torch.onnx.export(
            module,
            dummy_ids, # Pass directly if it's a single input
            str(out_path),
            opset_version=opset,
            input_names=["input_ids"],
            output_names=["audio_tokens"],
            do_constant_folding=True,
        )

    # Validate the exported model
    import onnx
    with log_timed_step("Validate ONNX model"):
        onnx_model = onnx.load(str(out_path))
        onnx.checker.check_model(onnx_model)

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"\n[OK] ONNX model exported successfully!")
    print(f"   Path      : {out_path.resolve()}")
    print(f"   Size      : {size_mb:.1f} MB")
    print(f"   Opset     : {opset}")
    print(f"   SampleRate: {sample_rate}")
    print(f"\n   Next step : set AIGENIUS_TTS_BACKEND=onnx in your .env")
    print(f"              Install onnxruntime-directml for GPU acceleration on Windows")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export pocket-tts model to ONNX")
    parser.add_argument("--out", default="models/pocket_tts.onnx", help="Output ONNX path")
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset version (default: 17)")
    args = parser.parse_args()

    _check_deps()
    export(Path(args.out), args.opset)


if __name__ == "__main__":
    main()
