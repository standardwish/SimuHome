from __future__ import annotations

import os
import subprocess
import time

import click

from src.logging_config import configure_logging, get_logger


logger = get_logger(__name__)


def get_pids(port: int) -> list[str]:
    cmd = ["lsof", "-ti", f"tcp:{port}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip().split()


def stop_server_on_port(port: int) -> None:
    try:
        pids = get_pids(port)
        if not pids:
            return

        logger.info("[stop_servers] Stopping port %s (PIDs: %s)", port, ", ".join(pids))
        subprocess.run(["kill"] + pids, check=False)

        time.sleep(1)

        remaining_pids = get_pids(port)
        if remaining_pids:
            logger.warning(
                "[stop_servers] Force killing port %s (PIDs: %s)",
                port,
                ", ".join(remaining_pids),
            )
            subprocess.run(["kill", "-9"] + remaining_pids, check=False)

    except Exception as e:
        logger.error("[stop_servers] Error on port %s: %s", port, e)


def _resolve_ports(explicit_ports: tuple[int, ...]) -> list[int]:
    ports: set[int] = set()

    ports.update(explicit_ports)

    if env_port := os.environ.get("PORT"):
        ports.add(int(env_port))

    return sorted(ports)


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--port", "ports", type=int, multiple=True, help="Port(s) to stop.")
def cli(ports: tuple[int, ...]) -> int:
    configure_logging()
    resolved_ports = _resolve_ports(ports)
    if not resolved_ports:
        return 0

    logger.info("[stop_servers] Target ports: %s", resolved_ports)
    for port in resolved_ports:
        stop_server_on_port(port)
    return 0


def main(argv: list[str] | None = None) -> int:
    configure_logging()
    result = cli.main(args=argv, prog_name="stop-servers", standalone_mode=False)
    return 0 if result is None else int(result)


if __name__ == "__main__":
    raise SystemExit(main())
