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


def test_configure_logging_with_tqdm_routes_messages_via_tqdm_writer(
    monkeypatch,
) -> None:
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    original_level = root_logger.level
    written_messages: list[str] = []

    try:
        root_logger.handlers.clear()
        root_logger.setLevel(logging.NOTSET)
        monkeypatch.setattr(
            "src.logging_config._emit_with_tqdm",
            lambda message: written_messages.append(message),
        )

        configure_logging(use_tqdm=True)
        get_logger("src.cli.episode_generator").warning("progress-safe warning")

        assert written_messages == [
            "WARNING:src.cli.episode_generator:progress-safe warning"
        ]
    finally:
        root_logger.handlers[:] = original_handlers
        root_logger.setLevel(original_level)
