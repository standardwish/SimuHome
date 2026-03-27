from __future__ import annotations

import logging
import sys


DEFAULT_LOG_LEVEL = logging.INFO
DEFAULT_LOG_FORMAT = "%(levelname)s:%(name)s:%(message)s"
_SIMUHOME_HANDLER_ATTR = "_simuhome_handler"
_SIMUHOME_TQDM_HANDLER_ATTR = "_simuhome_tqdm_handler"


def _emit_with_tqdm(message: str) -> None:
    try:
        from tqdm import tqdm
    except Exception:
        sys.stderr.write(f"{message}\n")
        sys.stderr.flush()
        return

    tqdm.write(message, file=sys.stderr)


class _TqdmLoggingHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            _emit_with_tqdm(self.format(record))
        except Exception:
            self.handleError(record)


def configure_logging(
    level: int = DEFAULT_LOG_LEVEL, *, use_tqdm: bool = False
) -> logging.Logger:
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in list(root_logger.handlers):
        if not getattr(handler, _SIMUHOME_HANDLER_ATTR, False):
            continue
        if getattr(handler, _SIMUHOME_TQDM_HANDLER_ATTR, False) == use_tqdm:
            handler.setLevel(level)
            return root_logger
        root_logger.removeHandler(handler)

    handler: logging.Handler
    if use_tqdm:
        handler = _TqdmLoggingHandler()
    else:
        handler = logging.StreamHandler()
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(DEFAULT_LOG_FORMAT))
    setattr(handler, _SIMUHOME_HANDLER_ATTR, True)
    setattr(handler, _SIMUHOME_TQDM_HANDLER_ATTR, use_tqdm)
    root_logger.addHandler(handler)
    return root_logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
