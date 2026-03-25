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
