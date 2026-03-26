from __future__ import annotations

from click.testing import CliRunner

from src.cli import (
    episode_evaluator,
    episode_generator,
    parallel_model_evaluation,
    stop_servers,
)


def test_episode_generator_cli_forwards_spec_to_internal_runner(monkeypatch) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_run_cli(*, spec: str | None, resume: str | None) -> int:
        captured["spec"] = spec
        captured["resume"] = resume
        return 0

    monkeypatch.setattr(episode_generator, "_run_cli", fake_run_cli)

    result = runner.invoke(
        episode_generator.cli,
        ["--spec", "gen_spec.yaml"],
        standalone_mode=False,
    )

    assert result.return_value == 0
    assert captured == {"spec": "gen_spec.yaml", "resume": None}


def test_parallel_model_evaluation_cli_forwards_resume_to_internal_runner(
    monkeypatch,
) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    def fake_run_cli(*, spec: str | None, resume: str | None) -> int:
        captured["spec"] = spec
        captured["resume"] = resume
        return 0

    monkeypatch.setattr(parallel_model_evaluation, "_run_cli", fake_run_cli)

    result = runner.invoke(
        parallel_model_evaluation.cli,
        ["--resume", "experiments/run-1"],
        standalone_mode=False,
    )

    assert result.return_value == 0
    assert captured == {"spec": None, "resume": "experiments/run-1"}


def test_episode_evaluator_defaults_output_model_to_model(monkeypatch) -> None:
    runner = CliRunner()
    captured: dict[str, object] = {}

    monkeypatch.setattr(episode_evaluator, "validate_arguments", lambda args: None)

    def fake_evaluate_episodes(**kwargs):
        captured.update(kwargs)
        return {
            "processed": 1,
            "success": 1,
            "failed": 0,
            "initial_completed": 0,
            "total": 1,
        }

    monkeypatch.setattr(episode_evaluator, "evaluate_episodes", fake_evaluate_episodes)
    monkeypatch.setattr(episode_evaluator, "_cli_progress_emitter", lambda event: None)

    result = runner.invoke(
        episode_evaluator.cli,
        [
            "--model",
            "demo-model",
            "--api-base",
            "https://api.example.com/v1",
            "--api-key",
            "secret",
            "--judge-model",
            "judge-model",
            "--judge-api-base",
            "https://judge.example.com/v1",
            "--judge-api-key",
            "judge-secret",
        ],
        standalone_mode=False,
    )

    assert result.return_value == 0
    assert captured["model"] == "demo-model"
    assert captured["output_model"] == "demo-model"


def test_stop_servers_cli_stops_explicit_port(monkeypatch) -> None:
    runner = CliRunner()
    captured: list[int] = []

    monkeypatch.setattr(stop_servers, "stop_server_on_port", lambda port: captured.append(port))

    result = runner.invoke(
        stop_servers.cli,
        ["--port", "9000"],
        standalone_mode=False,
    )

    assert result.return_value == 0
    assert captured == [9000]
