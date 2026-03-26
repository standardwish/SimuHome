from __future__ import annotations

import sys
from pathlib import Path

from click.testing import CliRunner

from src.cli import sim_parity_guard


def test_sim_parity_guard_skips_when_no_relevant_changes(monkeypatch, caplog) -> None:
    runner = CliRunner()
    monkeypatch.setattr(sim_parity_guard, "_is_git_repo", lambda cwd: True)
    monkeypatch.setattr(
        sim_parity_guard,
        "_collect_changed_files",
        lambda cwd, *, staged_only, base_ref: ["README.md"],
    )
    monkeypatch.setattr(
        sim_parity_guard,
        "_run_guard_suite",
        lambda cwd: (_ for _ in ()).throw(AssertionError("must not run")),
    )

    result = runner.invoke(sim_parity_guard.cli, [])

    assert result.exit_code == 0
    assert "SKIP" in caplog.text


def test_sim_parity_guard_force_runs_guard_suite(monkeypatch, caplog) -> None:
    runner = CliRunner()
    monkeypatch.setattr(sim_parity_guard, "_is_git_repo", lambda cwd: True)
    monkeypatch.setattr(sim_parity_guard, "_run_guard_suite", lambda cwd: 0)

    result = runner.invoke(sim_parity_guard.cli, ["--force"])

    assert result.exit_code == 0
    assert "Forced run" in caplog.text
    assert "PASS" in caplog.text


def test_run_guard_suite_uses_pytest_tests_path(monkeypatch, tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    class DummyCompletedProcess:
        returncode = 0

    def fake_run(command, cwd, check):
        captured["command"] = command
        captured["cwd"] = cwd
        captured["check"] = check
        return DummyCompletedProcess()

    monkeypatch.setattr(sim_parity_guard.subprocess, "run", fake_run)

    result = sim_parity_guard._run_guard_suite(tmp_path)

    assert result == 0
    assert captured["command"] == [
        sys.executable,
        "-m",
        "pytest",
        "tests/cli/test_sim_parity_guard_parity.py",
        "-v",
    ]
    assert captured["cwd"] == tmp_path
    assert captured["check"] is False
