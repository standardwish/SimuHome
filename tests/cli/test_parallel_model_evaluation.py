from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import Mock

from src.cli import parallel_model_evaluation as pme


def _resolved_run(tmp_path: Path) -> pme.ResolvedRun:
    return {
        "run_id": "example_qt1_seed_1_3_5",
        "output_root": str(tmp_path),
        "spec_path": str(tmp_path / "spec.yaml"),
        "strategy": {
            "name": "react",
            "timeout": 60.0,
            "temperature": 0.0,
            "max_steps": 20,
        },
        "orchestration": {
            "max_workers": 1,
            "simulator_start_timeout": 30,
            "simulator_start_retries": 0,
            "evaluation_retries": 0,
            "allow_partial_start": False,
        },
        "selection": {
            "episode_dir": str(tmp_path / "episodes"),
            "qt": "qt1",
            "case": "feasible",
            "seed": "1",
        },
        "models": [
            {
                "model": "openai/gpt-4.1",
                "api_base": "https://example.test/v1",
                "api_key": "token",
                "judge_model": "gpt-5-mini",
                "judge_api_base": "https://api.openai.com/v1",
                "judge_api_key": "judge-token",
            }
        ],
    }


def test_reconcile_marks_model_failed_when_all_artifacts_are_runtime_errors(
    tmp_path: Path,
) -> None:
    resolved = _resolved_run(tmp_path)
    episodes_dir = Path(resolved["selection"]["episode_dir"])
    episodes_dir.mkdir(parents=True)
    (episodes_dir / "qt1_feasible_seed_1.json").write_text("{}", encoding="utf-8")

    run_dir = tmp_path / resolved["run_id"]
    model_dir = run_dir / "openai_gpt-4.1"
    model_dir.mkdir(parents=True)
    (model_dir / "qt1_feasible_seed_1.json").write_text(
        json.dumps(
            {
                "evaluation_result": {
                    "score": -1,
                    "error_type": "Evaluation Runtime Error",
                    "detail": "invalid model ID",
                }
            }
        ),
        encoding="utf-8",
    )

    reconciled = pme._reconcile_episode_progress_in_state(resolved, {}, run_dir)

    model_state = reconciled["models"]["openai_gpt-4.1"]
    assert model_state["status"] == "failed"
    assert model_state["error"] == "invalid model ID"
    assert model_state["episode_progress"]["pending"] == 0
    assert model_state["episode_progress"]["runtime_errors"] == 1


def test_build_summary_treats_artifact_runtime_errors_as_model_failures(
    tmp_path: Path,
) -> None:
    resolved = _resolved_run(tmp_path)
    state = {
        "models": {
            "openai_gpt-4.1": {
                "model": "openai/gpt-4.1",
                "status": "failed",
                "attempts": 1,
                "returncode": 0,
                "error": "invalid model ID",
                "port": 56847,
            }
        }
    }
    results: list[pme.EvaluationResult] = [
        {
            "original_model": "openai/gpt-4.1",
            "safe_model": "openai_gpt-4.1",
            "port": 56847,
            "success": True,
            "returncode": 0,
            "attempts": 1,
            "phase": "evaluation",
            "error": "",
        }
    ]

    summary = pme._build_summary(resolved, results, state)

    assert summary["totals"] == {"models": 1, "success": 0, "failed": 1}
    assert summary["successful_models"] == []
    assert summary["failed_models"] == ["openai/gpt-4.1"]
    assert summary["results"][0]["success"] is False
    assert summary["results"][0]["error"] == "invalid model ID"


def test_log_failed_models_reports_failure_reasons() -> None:
    logger = Mock()
    summary = {
        "results": [
            {
                "original_model": "openai/gpt-4.1",
                "success": False,
                "error": "invalid model ID",
                "phase": "evaluation",
            },
            {
                "original_model": "gpt-5-mini",
                "success": True,
                "error": "",
                "phase": "evaluation",
            },
        ]
    }

    pme._log_failed_models(summary, logger)

    logger.error.assert_called_once_with(
        "[Main] Failure detail: %s (%s)",
        "openai/gpt-4.1",
        "invalid model ID",
    )
