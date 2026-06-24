"""
audio_transcoder Python stub / PyAV wrapper.

This module now uses PyAV unconditionally for zero-latency, in-memory audio decoding.
The original Rust (Symphonia) extension remains in crates/ but is currently bypassed.
"""

from __future__ import annotations
import os
from pathlib import Path

BACKEND = "av"
__version__ = "1.0.0-av"

def transcode_to_wav(input_path: str, output_path: str) -> str:
    """Convert audio to 16 kHz mono WAV using PyAV (in-memory FFmpeg)."""
    try:
        import av
    except ImportError:
        raise RuntimeError("PyAV ('av') is not installed. Please run `pip install av`.")
    
    import wave
    
    container = av.open(input_path)
    audio_stream = next((s for s in container.streams if s.type == 'audio'), None)
    if not audio_stream:
        raise RuntimeError(f"No audio stream found in {input_path}")
        
    resampler = av.AudioResampler(
        format='s16',
        layout='mono',
        rate=16000,
    )
    
    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        
        for frame in container.decode(audio_stream):
            frame.pts = None
            for resampled in resampler.resample(frame):
                wav_file.writeframes(bytes(resampled.planes[0]))

    return str(Path(output_path).resolve())

def decode_to_wav16k_mono_bytes(input_path: str) -> bytes:
    """Decode audio to 16 kHz mono WAV bytes using PyAV."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        transcode_to_wav(input_path, tmp_path)
        return Path(tmp_path).read_bytes()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

__all__ = ["BACKEND", "__version__", "transcode_to_wav", "decode_to_wav16k_mono_bytes"]
