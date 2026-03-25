from __future__ import annotations

from pathlib import Path

from click.testing import CliRunner

from src.cli import artifact_audit


def test_artifact_audit_cli_writes_relative_outputs_under_run_dir(
    monkeypatch, tmp_path: Path
) -> None:
    runner = CliRunner()
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    writes: list[Path] = []

    monkeypatch.setattr(
        artifact_audit,
        "run_audit",
        lambda **_: (
            {
                "run_dir": str(run_dir),
                "summary": {"counts": {"success": 1, "missing": 0}},
                "items": [],
            },
            {"items": []},
        ),
    )

    def fake_json_write(path: Path, payload) -> None:
        writes.append(path)

    monkeypatch.setattr(artifact_audit, "_json_write", fake_json_write)

    result = runner.invoke(
        artifact_audit.cli,
        [
            "--run-dir",
            str(run_dir),
            "--report",
            "report.json",
            "--rerun-plan",
            "rerun.json",
        ],
    )

    assert result.exit_code == 0
    assert writes == [run_dir / "report.json", run_dir / "rerun.json"]


def test_artifact_audit_cli_returns_two_for_strict_failures(
    monkeypatch, tmp_path: Path
) -> None:
    runner = CliRunner()
    run_dir = tmp_path / "run"
    run_dir.mkdir()

    monkeypatch.setattr(
        artifact_audit,
        "run_audit",
        lambda **_: (
            {
                "run_dir": str(run_dir),
                "summary": {"counts": {"success": 0, "missing": 1}},
                "items": [],
            },
            {"items": []},
        ),
    )
    monkeypatch.setattr(artifact_audit, "_json_write", lambda *args, **kwargs: None)

    result = runner.invoke(
        artifact_audit.cli,
        ["--run-dir", str(run_dir), "--strict"],
        standalone_mode=False,
    )

    assert result.return_value == 2
