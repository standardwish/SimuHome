from __future__ import annotations

from click.testing import CliRunner

from src.cli import main as cli_main


def test_root_help_lists_existing_commands() -> None:
    runner = CliRunner()

    result = runner.invoke(cli_main.cli, ["--help"])

    assert result.exit_code == 0
    assert "server-start" in result.output
    assert "artifact-audit" in result.output
    assert "verify-sim-parity" in result.output
    assert "dashboard" in result.output


def test_episode_command_delegates_to_episode_generator(monkeypatch) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_run_module(module: str, args: list[str], env_overrides=None) -> int:
        captured["module"] = module
        captured["args"] = args
        captured["env_overrides"] = env_overrides
        return 0

    monkeypatch.setattr(cli_main, "_run_module", fake_run_module)

    result = runner.invoke(cli_main.cli, ["episode", "--spec", "gen.yaml"])

    assert result.exit_code == 0
    assert captured == {
        "module": "src.cli.episode_generator",
        "args": ["--spec", "gen.yaml"],
        "env_overrides": None,
    }


def test_artifact_audit_command_passes_expected_arguments(monkeypatch) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_main(argv: list[str] | None = None) -> int:
        captured["argv"] = argv
        return 0

    monkeypatch.setattr(cli_main.artifact_audit, "main", fake_main)

    result = runner.invoke(
        cli_main.cli,
        [
            "artifact-audit",
            "--run-dir",
            "runs/demo",
            "--type",
            "evaluation",
            "--report",
            "report.json",
            "--rerun-plan",
            "rerun.json",
            "--strict",
        ],
    )

    assert result.exit_code == 0
    assert captured["argv"] == [
        "--run-dir",
        "runs/demo",
        "--type",
        "evaluation",
        "--report",
        "report.json",
        "--rerun-plan",
        "rerun.json",
        "--strict",
    ]


def test_verify_sim_parity_force_flag_is_forwarded(monkeypatch) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_run_module(module: str, args: list[str], env_overrides=None) -> int:
        captured["module"] = module
        captured["args"] = args
        return 0

    monkeypatch.setattr(cli_main, "_run_module", fake_run_module)

    result = runner.invoke(cli_main.cli, ["verify-sim-parity", "--force"])

    assert result.exit_code == 0
    assert captured == {
        "module": "src.cli.sim_parity_guard",
        "args": ["--force"],
    }


def test_dashboard_command_runs_frontend_dev_server_when_backend_is_healthy(
    monkeypatch,
) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_check_health(url: str, timeout: float = 2.0) -> bool:
        captured["url"] = url
        captured["timeout"] = timeout
        return True

    def fake_run(command, cwd=None, check=False, env=None):
        captured["command"] = command
        captured["cwd"] = cwd
        captured["check"] = check
        captured["env"] = env
        return 0

    monkeypatch.setattr(cli_main, "_check_health", fake_check_health)
    monkeypatch.setattr(cli_main.subprocess, "run", fake_run)

    result = runner.invoke(cli_main.cli, ["dashboard"])

    assert result.exit_code == 0
    assert captured["url"] == "http://127.0.0.1:8000/api/__health__"
    assert captured["command"] == ["npm", "run", "dev"]
    assert captured["cwd"] == cli_main._repo_root() / "src/dashboard/frontend"
    assert captured["check"] is False


def test_dashboard_command_prints_recovery_command_when_backend_is_unhealthy(
    monkeypatch, capsys
) -> None:
    monkeypatch.setattr(cli_main, "_check_health", lambda url, timeout=2.0: False)

    exit_code = cli_main.main(["dashboard"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "uv run simuhome server-start --port 8000" in captured.out
