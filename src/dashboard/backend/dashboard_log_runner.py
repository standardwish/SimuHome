from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


DASHBOARD_LOG_PATH_ENV = "SIMUHOME_DASHBOARD_LOG_PATH"
DASHBOARD_LOG_MODE_ENV = "SIMUHOME_DASHBOARD_LOG_MODE"


def _open_log_handle(log_path: Path, mode: str):
    log_path.parent.mkdir(parents=True, exist_ok=True)
    return log_path.open(mode, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    command = list(sys.argv[1:] if argv is None else argv)
    if not command:
        raise SystemExit("dashboard_log_runner requires a command to execute")

    log_path_raw = os.environ.get(DASHBOARD_LOG_PATH_ENV)
    if not log_path_raw:
        raise SystemExit(f"{DASHBOARD_LOG_PATH_ENV} is required")

    log_mode = os.environ.get(DASHBOARD_LOG_MODE_ENV, "a")
    log_path = Path(log_path_raw)

    child_env = os.environ.copy()
    child_env.pop(DASHBOARD_LOG_PATH_ENV, None)
    child_env.pop(DASHBOARD_LOG_MODE_ENV, None)
    child_env.setdefault("PYTHONUNBUFFERED", "1")

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=child_env,
    )

    log_handle = None
    try:
        if process.stdout is None:
            return process.wait()

        for chunk in process.stdout:
            if log_handle is None:
                log_handle = _open_log_handle(log_path, log_mode)
                log_mode = "a"
            log_handle.write(chunk)
            log_handle.flush()
        return process.wait()
    finally:
        if process.stdout is not None:
            process.stdout.close()
        if log_handle is not None:
            log_handle.close()


if __name__ == "__main__":
    raise SystemExit(main())
