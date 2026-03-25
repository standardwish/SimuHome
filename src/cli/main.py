from __future__ import annotations

import os
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.error import URLError
from urllib.request import urlopen

import click

from src.cli import artifact_audit


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_port() -> int:
    raw = os.getenv("PORT", "8000")
    return int(raw)


def _health_endpoint(host: str, port: int, endpoint: str | None) -> str:
    if endpoint:
        return endpoint
    return f"http://{host}:{port}/api/__health__"


def _run_module(
    module: str, args: list[str], env_overrides: dict[str, str] | None = None
) -> int:
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)
    command = [sys.executable, "-m", module, *args]
    completed = subprocess.run(command, cwd=_repo_root(), check=False, env=env)
    return int(completed.returncode)


def _check_health(url: str, timeout: float = 2.0) -> bool:
    try:
        with urlopen(url, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            return 200 <= int(status) < 300
    except URLError:
        return False
    except TimeoutError:
        return False


def _ns(**kwargs: object) -> SimpleNamespace:
    return SimpleNamespace(**kwargs)


def _handle_health(args: SimpleNamespace) -> int:
    endpoint = _health_endpoint(args.host, args.port, args.endpoint)
    if _check_health(endpoint, timeout=2.0):
        print("[health] OK")
        return 0
    print("[health] FAIL")
    return 1


def _handle_server_stop(args: SimpleNamespace) -> int:
    print("[server] Stopping servers...")
    return _run_module("src.cli.stop_servers", [], {"PORT": str(args.port)})


def _handle_server_start(args: SimpleNamespace) -> int:
    server_out = _repo_root() / "server.out"
    endpoint = _health_endpoint(args.host, args.port, args.endpoint)
    command = [sys.executable, "-m", "src.simulator.api.app"]
    print(f"[server] Starting: {' '.join(command)} (port {args.port})")
    with server_out.open("w", encoding="utf-8") as out_file:
        subprocess.Popen(
            command,
            cwd=_repo_root(),
            stdout=out_file,
            stderr=subprocess.STDOUT,
            env={**os.environ, "SERVER_PORT": str(args.port)},
            start_new_session=True,
        )
    time.sleep(1)
    if _check_health(endpoint, timeout=2.0):
        print("[server] Started")
        return 0
    print(
        "[server] Failed to start. "
        f"Check logs at {server_out} and retry with: uv run simuhome server-start --port {args.port}"
    )
    return 1


def _handle_server_restart(args: SimpleNamespace) -> int:
    stop_code = _handle_server_stop(args)
    if stop_code != 0:
        return stop_code
    return _handle_server_start(args)


def _handle_server_ensure(args: SimpleNamespace) -> int:
    endpoint = _health_endpoint(args.host, args.port, args.endpoint)
    if _check_health(endpoint, timeout=2.0):
        print("[server] Already running")
        return 0
    return _handle_server_start(args)


def _handle_logs(args: SimpleNamespace) -> int:
    server_out = _repo_root() / "server.out"
    print(f"[logs] tail -n {args.lines} {server_out.name}")
    if not server_out.exists():
        return 0
    lines = server_out.read_text(encoding="utf-8", errors="replace").splitlines()
    for line in lines[-args.lines :]:
        print(line)
    return 0


def _handle_episode(args: SimpleNamespace) -> int:
    return _run_module("src.cli.episode_generator", ["--spec", args.spec])


def _handle_episode_resume(args: SimpleNamespace) -> int:
    return _run_module("src.cli.episode_generator", ["--resume", args.resume])


def _handle_eval_start(args: SimpleNamespace) -> int:
    return _run_module("src.cli.parallel_model_evaluation", ["--spec", args.spec])


def _handle_eval_resume(args: SimpleNamespace) -> int:
    return _run_module("src.cli.parallel_model_evaluation", ["--resume", args.resume])


def _handle_aggregate(args: SimpleNamespace) -> int:
    return _run_module(
        "src.pipelines.episode_evaluation.aggregate_results",
        ["--result_dir", args.dir],
    )


def _handle_aggregate_all(args: SimpleNamespace) -> int:
    return _run_module(
        "src.pipelines.episode_evaluation.aggregate_all_results",
        ["--experiment_dir", args.dir],
    )


def _handle_verify_sim_parity(args: SimpleNamespace) -> int:
    command_args: list[str] = []
    if args.force:
        command_args.append("--force")
    return _run_module("src.cli.sim_parity_guard", command_args)


def _handle_install_local_hooks(_args: SimpleNamespace) -> int:
    repo_root = _repo_root()
    hooks_dir = repo_root / ".git" / "hooks"
    src_hook = repo_root / ".githooks" / "pre-commit"
    dst_hook = hooks_dir / "pre-commit"
    if not hooks_dir.exists():
        print("[install-local-hooks] .git/hooks not found")
        return 1
    shutil.copy2(src_hook, dst_hook)
    mode = dst_hook.stat().st_mode
    dst_hook.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    print("[install-local-hooks] Installed .git/hooks/pre-commit")
    return 0


def _handle_artifact_audit(args: SimpleNamespace) -> int:
    cli_args = [
        "--run-dir",
        args.run_dir,
        "--type",
        args.type,
        "--report",
        args.report,
        "--rerun-plan",
        args.rerun_plan,
    ]
    if args.strict:
        cli_args.append("--strict")
    return artifact_audit.main(cli_args)


def _server_shared_options(func):
    func = click.option("--endpoint", default=None)(func)
    func = click.option("--port", type=int, default=_default_port(), show_default=True)(
        func
    )
    func = click.option("--host", default="127.0.0.1", show_default=True)(func)
    return func


@click.group(
    context_settings={"help_option_names": ["-h", "--help"]},
    help="SimuHome unified command-line interface",
)
def cli() -> None:
    pass


@cli.command("health", help="Check server health")
@_server_shared_options
def health(host: str, port: int, endpoint: str | None) -> int:
    return _handle_health(_ns(host=host, port=port, endpoint=endpoint))


@cli.command("server-start", help="Start server")
@_server_shared_options
def server_start(host: str, port: int, endpoint: str | None) -> int:
    return _handle_server_start(_ns(host=host, port=port, endpoint=endpoint))


@cli.command("server-stop", help="Stop server")
@click.option("--port", type=int, default=_default_port(), show_default=True)
def server_stop(port: int) -> int:
    return _handle_server_stop(_ns(port=port))


@cli.command("server-restart", help="Restart server")
@_server_shared_options
def server_restart(host: str, port: int, endpoint: str | None) -> int:
    return _handle_server_restart(_ns(host=host, port=port, endpoint=endpoint))


@cli.command("server-ensure", help="Ensure server is running")
@_server_shared_options
def server_ensure(host: str, port: int, endpoint: str | None) -> int:
    return _handle_server_ensure(_ns(host=host, port=port, endpoint=endpoint))


@cli.command("logs", help="Show server logs")
@click.option("--lines", type=int, default=100, show_default=True)
def logs(lines: int) -> int:
    return _handle_logs(_ns(lines=lines))


@cli.command("episode", help="Start spec-driven episode generation")
@click.option("--spec", required=True)
def episode(spec: str) -> int:
    return _handle_episode(_ns(spec=spec))


@cli.command("episode-resume", help="Resume spec-driven episode generation run")
@click.option("--resume", required=True)
def episode_resume(resume: str) -> int:
    return _handle_episode_resume(_ns(resume=resume))


@cli.command("eval-start", help="Start spec-driven evaluation")
@click.option("--spec", required=True)
def eval_start(spec: str) -> int:
    return _handle_eval_start(_ns(spec=spec))


@cli.command("eval-resume", help="Resume evaluation run")
@click.option("--resume", required=True)
def eval_resume(resume: str) -> int:
    return _handle_eval_resume(_ns(resume=resume))


@cli.command(
    "artifact-audit",
    help="Audit generated/evaluated artifacts and emit rerun plan",
)
@click.option("--run-dir", required=True)
@click.option(
    "--type",
    "run_type",
    type=click.Choice(["auto", "generation", "evaluation"]),
    default="auto",
    show_default=True,
)
@click.option("--report", default="artifact_audit.json", show_default=True)
@click.option("--rerun-plan", default="artifact_rerun_plan.json", show_default=True)
@click.option(
    "--strict",
    is_flag=True,
    help="Exit non-zero if any item is not successful",
)
def artifact_audit_cmd(
    run_dir: str,
    run_type: str,
    report: str,
    rerun_plan: str,
    strict: bool,
) -> int:
    return _handle_artifact_audit(
        _ns(
            run_dir=run_dir,
            type=run_type,
            report=report,
            rerun_plan=rerun_plan,
            strict=strict,
        )
    )


@cli.command("aggregate", help="Aggregate single model results")
@click.option("--dir", "dir_", required=True)
def aggregate(dir_: str) -> int:
    return _handle_aggregate(_ns(dir=dir_))


@cli.command("aggregate-all", help="Aggregate all model results in experiment")
@click.option("--dir", "dir_", required=True)
def aggregate_all(dir_: str) -> int:
    return _handle_aggregate_all(_ns(dir=dir_))


@cli.command("verify-sim-parity", help="Run simulator parity verification")
@click.option("--force", is_flag=True)
def verify_sim_parity(force: bool) -> int:
    return _handle_verify_sim_parity(_ns(force=force))


@cli.command("install-local-hooks", help="Install local pre-commit hook")
def install_local_hooks() -> int:
    return _handle_install_local_hooks(_ns())


def main(argv: list[str] | None = None) -> int:
    result = cli.main(args=argv, prog_name="simuhome", standalone_mode=False)
    return 0 if result is None else int(result)


if __name__ == "__main__":
    raise SystemExit(main())
