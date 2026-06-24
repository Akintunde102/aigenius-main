"""Process-wide logging for the voice sidecar CLI."""

from __future__ import annotations

import logging

from voice_sidecar_lib.hf_cache_env import truthy_env
from voice_sidecar_lib.log import LOGGER


def configure_main_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    # HEY_DEBUG must not set the root logger to DEBUG: that enables httpcore/httpx DEBUG and
    # triggers real Hub connections alongside log noise.
    if truthy_env("HEY_DEBUG"):
        LOGGER.setLevel(logging.DEBUG)
