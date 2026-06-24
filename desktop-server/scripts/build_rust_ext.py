"""
Build script for the audio-transcoder Python extension.

Wraps `maturin develop` (for development) and `maturin build` (for release).
Installs the compiled .pyd/.so into the active Python environment.

Usage (from desktop-server root):
    python scripts/build_rust_ext.py          # dev build (debug, fast)
    python scripts/build_rust_ext.py --release # release build (optimised)
    python scripts/build_rust_ext.py --check   # only run cargo tests
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CRATE_DIR = REPO_ROOT / "crates" / "audio-transcoder"


def _run(cmd: list[str], cwd: Path) -> None:
    print(f"\n> {' '.join(cmd)}\n   cwd: {cwd}\n")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Rust audio-transcoder Python extension")
    parser.add_argument("--release", action="store_true", help="Build in release mode")
    parser.add_argument("--check", action="store_true", help="Only run cargo tests, don't build Python extension")
    args = parser.parse_args()

    if args.check:
        # Run Rust unit tests (no Python needed)
        cargo = shutil.which("cargo")
        if not cargo:
            print("[X] cargo not found - install Rust from https://rustup.rs")
            sys.exit(1)
        _run([cargo, "test", "--all"], REPO_ROOT)
        print("\n[OK] Rust tests passed!")
        return

    # Call maturin via the active Python executable as a module to avoid PATH issues
    maturin_cmd = [sys.executable, "-m", "maturin"]

    if args.release:
        _run(
            maturin_cmd + ["build", "--features", "python", "--release", "-o", "dist"],
            CRATE_DIR,
        )
        # Install the wheel into the active environment
        import glob
        wheels = glob.glob(str(CRATE_DIR / "dist" / "*.whl"))
        if wheels:
            _run([sys.executable, "-m", "pip", "install", "--force-reinstall", wheels[0]], REPO_ROOT)
        print("\n[OK] Rust audio-transcoder installed (release build)")
    else:
        # Develop install: builds and installs directly into the active Python environment
        _run(
            maturin_cmd + ["develop", "--features", "python"],
            CRATE_DIR,
        )
        print("\n[OK] Rust audio-transcoder installed (dev build)")

    # Quick smoke test
    print("\n[?] Smoke test: import audio_transcoder...")
    _run([sys.executable, "-c", "import audio_transcoder; print(f'  [OK] Version: {audio_transcoder.__version__}')"], REPO_ROOT)


if __name__ == "__main__":
    main()
