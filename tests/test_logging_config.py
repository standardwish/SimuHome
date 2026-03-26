from __future__ import annotations

import logging

from src.logging_config import configure_logging, get_logger


def test_configure_logging_is_idempotent() -> None:
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    original_level = root_logger.level

    try:
        root_logger.handlers.clear()
        root_logger.setLevel(logging.NOTSET)

        configure_logging()
        first_handlers = list(root_logger.handlers)
        configure_logging()
        second_handlers = list(root_logger.handlers)

        assert len(first_handlers) == 1
        assert second_handlers == first_handlers
        assert root_logger.level == logging.INFO
    finally:
        root_logger.handlers[:] = original_handlers
        root_logger.setLevel(original_level)


def test_get_logger_uses_requested_name() -> None:
    logger = get_logger("src.cli.main")

    assert logger.name == "src.cli.main"

