"""Step timing helpers with structured JSON profiling support."""

from __future__ import annotations

import threading
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional


class ProfilingReport:
    """Interface for retrieving timing data from a session."""
    def __init__(self, name: str, start_time: float):
        self.name = name
        self.start_time = start_time
        self.steps: List[Dict[str, Any]] = []

    def get_report(self) -> Dict[str, Any]:
        total = time.perf_counter() - self.start_time
        return {
            "session_name": self.name,
            "total_duration_ms": round(total * 1000, 2),
            "steps": [
                {"name": s["step"], "duration_ms": round(s["elapsed_s"] * 1000, 2)}
                for s in self.steps
            ],
        }


# Thread-local ledger
_session_ledger: threading.local = threading.local()


def _get_active_report() -> Optional[ProfilingReport]:
    return getattr(_session_ledger, "current_report", None)


@contextmanager
def profiling_session(name: str = "request"):
    """Wrap a full request to collect all step timings."""
    report = ProfilingReport(name, time.perf_counter())
    _session_ledger.current_report = report
    try:
        yield report
    finally:
        delattr(_session_ledger, "current_report")


@contextmanager
def log_timed_step(step_name: str):
    """Time and log one execution step; record into the active profiling session if any."""
    from voice_sidecar_lib.log import LOGGER
    start = time.perf_counter()
    LOGGER.info("[START] %s", step_name)
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        LOGGER.info("[DONE]  %s (%.3fs)", step_name, elapsed)
        report = _get_active_report()
        if report is not None:
            report.steps.append({"step": step_name, "elapsed_s": round(elapsed, 4)})
