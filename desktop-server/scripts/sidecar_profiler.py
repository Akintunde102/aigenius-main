"""
Sidecar Performance Profiler
============================
Runs a series of STT and TTS benchmarks to measure end-to-end latency
and identify bottlenecks.

Generates a JSON report and a console summary.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# Allow running from desktop-server root
sys.path.insert(0, str(Path(__file__).parent.parent / "python"))

from voice_sidecar_lib.timing import profiling_session


def _bold(t: str) -> str:
    return f"\033[1m{t}\033[0m"


def _green(t: str) -> str:
    return f"\033[32m{t}\033[0m"


def _yellow(t: str) -> str:
    return f"\033[33m{t}\033[0m"


def _red(t: str) -> str:
    return f"\033[31m{t}\033[0m"


def run_stt_benchmark() -> dict:
    from voice_sidecar_lib.stt_whisper_cpp import transcribe_audio
    
    # Use a dummy audio file if it exists, or create a tiny one
    audio_path = Path("scratch/test_audio.wav")
    if not audio_path.exists():
        # Create a 1-second silent WAV
        import wave
        import struct
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(audio_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(16000)
            for _ in range(16000):
                w.writeframes(struct.pack("<h", 0))

    print(f"  [>] Running STT Benchmark (whisper.cpp)...")
    with profiling_session("STT Benchmark") as session:
        result = transcribe_audio(str(audio_path), model_size="small.en-q5_1")
        print(f"      Result: {result}")
    
    return session.get_report()


def run_tts_benchmark() -> dict:
    from voice_sidecar_lib.tts_pocket import generate_speech
    
    text = "Performance optimization is the key to a great user experience."
    print(f"  [>] Running TTS Benchmark (pocket-tts)...")
    
    with profiling_session("TTS Benchmark") as session:
        # This will use the default backend (or whatever is set in env)
        output_path = generate_speech(text)
        print(f"      Result: {output_path}")
        
    return session.get_report()


def main() -> None:
    print(_bold("\n--- AIGenius Sidecar Profiler ---"))
    print(f"  Python: {sys.version.split()[0]}")
    print(f"  OS    : {sys.platform}")
    
    reports = []
    
    try:
        stt_report = run_stt_benchmark()
        reports.append(stt_report)
    except Exception as e:
        print(_red(f"  [X] STT Benchmark failed: {e}"))
        
    try:
        tts_report = run_tts_benchmark()
        reports.append(tts_report)
    except Exception as e:
        print(_red(f"  [X] TTS Benchmark failed: {e}"))

    # Summary
    print(_bold("\n--- Latency Summary ---"))
    for report in reports:
        name = report.get("session_name", "Unknown")
        total = report.get("total_duration_ms", 0)
        print(f"  {_bold(name):<20} : {_green(f'{total:.1f}ms') if total < 500 else _yellow(f'{total:.1f}ms')}")
        
        for step in report.get("steps", []):
            s_name = step.get("name")
            s_dur = step.get("duration_ms")
            print(f"    - {s_name:<25}: {s_dur:>7.1f}ms")

    # Save to file
    out_file = Path("profiling_report.json")
    with open(out_file, "w") as f:
        json.dump(reports, f, indent=2)
    print(f"\n  [OK] Full report saved to {out_file.resolve()}")


if __name__ == "__main__":
    main()
