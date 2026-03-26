from __future__ import annotations

import logging


DEFAULT_LOG_LEVEL = logging.INFO
DEFAULT_LOG_FORMAT = "%(levelname)s:%(name)s:%(message)s"
_SIMUHOME_HANDLER_ATTR = "_simuhome_handler"


def configure_logging(level: int = DEFAULT_LOG_LEVEL) -> logging.Logger:
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in root_logger.handlers:
        if getattr(handler, _SIMUHOME_HANDLER_ATTR, False):
            handler.setLevel(level)
            return root_logger

    handler = logging.StreamHandler()
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(DEFAULT_LOG_FORMAT))
    setattr(handler, _SIMUHOME_HANDLER_ATTR, True)
    root_logger.addHandler(handler)
    return root_logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
