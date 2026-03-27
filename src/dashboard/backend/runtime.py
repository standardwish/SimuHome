from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml


def get_runtime_config() -> dict[str, Any]:
    experiments_dir = _experiments_dir()
    generation_runs_dir = _generation_runs_dir()
    return {
        "experiments_dir": str(experiments_dir),
        "exists": experiments_dir.exists(),
        "eval_spec_example": str(Path("eval_spec.example.yaml").resolve()),
        "generation_runs_dir": str(generation_runs_dir),
        "generation_exists": generation_runs_dir.exists(),
        "gen_spec_example": str(Path("gen_spec.example.yaml").resolve()),
    }


def list_evaluation_runs() -> dict[str, Any]:
    experiments_dir = _experiments_dir()
    runs: list[dict[str, Any]] = []
    if experiments_dir.exists():
        for run_dir in sorted(
            [path for path in experiments_dir.iterdir() if path.is_dir()],
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        ):
            manifest = _read_json(run_dir / "manifest.json")
            if manifest is None:
                continue
            state = _read_json(run_dir / "run_state.json")
            summary = _read_json(run_dir / "run_summary.json")
            runs.append(
                {
                    "run_id": str(manifest.get("run_id") or run_dir.name),
                    "path": str(run_dir),
                    "has_summary": summary is not None,
                    "judge_failures": _collect_judge_failures(run_dir),
                    "manifest": manifest,
                    "state": state,
                    "summary": summary,
                }
            )
    return {"runs": runs}


def get_evaluation_run(run_id: str) -> dict[str, Any]:
    run_dir = _experiments_dir() / run_id
    return {
        "run_id": run_id,
        "path": str(run_dir),
        "manifest": _read_json(run_dir / "manifest.json"),
        "state": _read_json(run_dir / "run_state.json"),
        "summary": _read_json(run_dir / "run_summary.json"),
    }


def list_generation_runs() -> dict[str, Any]:
    generation_runs_dir = _generation_runs_dir()
    runs: list[dict[str, Any]] = []
    if generation_runs_dir.exists():
        for run_dir in sorted(
            [path for path in generation_runs_dir.iterdir() if path.is_dir()],
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        ):
            manifest = _read_json(run_dir / "manifest.json")
            if manifest is None:
                continue
            state = _read_json(run_dir / "run_state.json")
            summary = _read_json(run_dir / "run_summary.json")
            runs.append(
                {
                    "run_id": str(manifest.get("run_id") or run_dir.name),
                    "path": str(run_dir),
                    "has_summary": summary is not None,
                    "manifest": manifest,
                    "state": state,
                    "summary": summary,
                }
            )
    return {"runs": runs}


def get_generation_run(run_id: str) -> dict[str, Any]:
    run_dir = _generation_runs_dir() / run_id
    return {
        "run_id": run_id,
        "path": str(run_dir),
        "manifest": _read_json(run_dir / "manifest.json"),
        "state": _read_json(run_dir / "run_state.json"),
        "summary": _read_json(run_dir / "run_summary.json"),
    }


def get_evaluation_run_detail(run_id: str) -> dict[str, Any]:
    run_dir = _experiments_dir() / run_id
    summary_payload = _read_json(run_dir / "run_summary.json") or {}
    totals = summary_payload.get("totals") if isinstance(summary_payload, dict) else {}
    summary = totals if isinstance(totals, dict) else {}

    models: list[dict[str, Any]] = []
    for model_dir in sorted([path for path in run_dir.iterdir() if path.is_dir()]):
        artifacts = []
        for artifact_path in sorted(model_dir.glob("*.json")):
            artifact = _read_json(artifact_path)
            if artifact is None:
                continue
            artifacts.append(_summarize_artifact(artifact_path, artifact))
        if artifacts:
            models.append(
                {
                    "model": model_dir.name,
                    "path": str(model_dir),
                    "artifacts": artifacts,
                }
            )

    return {
        "run_id": run_id,
        "path": str(run_dir),
        "summary": {
            "total": int(summary.get("total", sum(len(model["artifacts"]) for model in models))),
            "success": int(summary.get("success", 0)),
            "failed": int(summary.get("failed", 0)),
            "pending": int(summary.get("pending", 0)),
        },
        "models": models,
    }


def get_generation_run_detail(run_id: str) -> dict[str, Any]:
    run_dir = _generation_runs_dir() / run_id
    manifest = _read_json(run_dir / "manifest.json") or {}
    state = _read_json(run_dir / "run_state.json") or {}
    summary = _read_json(run_dir / "run_summary.json") or {}

    artifacts = _collect_generation_artifacts(run_dir)
    output_dir = summary.get("output_dir")

    return {
        "run_id": run_id,
        "path": str(run_dir),
        "manifest": manifest,
        "summary": {
            "total": int(summary.get("total", 0) or 0),
            "success": int(summary.get("success", 0) or 0),
            "failed": int(summary.get("failed", 0) or 0),
            "pending": int(summary.get("pending", 0) or 0),
            "output_dir": str(output_dir or run_dir / "episodes"),
        },
        "seeds": _summarize_generation_seeds(state),
        "artifacts": artifacts,
        "failed_items": summary.get("failed_items") if isinstance(summary.get("failed_items"), list) else [],
        "pending_seeds": summary.get("pending_seeds") if isinstance(summary.get("pending_seeds"), list) else [],
    }


def get_evaluation_summary(run_id: str) -> dict[str, Any]:
    run_dir = _experiments_dir() / run_id
    return {
        "run_id": run_id,
        "summary": _read_json(run_dir / "run_summary.json"),
    }


def get_evaluation_logs(run_id: str, lines: int = 200) -> dict[str, Any]:
    run_dir = _experiments_dir() / run_id
    log_path = run_dir / "dashboard.log"
    if not log_path.exists():
        return {"run_id": run_id, "log_path": str(log_path), "lines": []}

    content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"run_id": run_id, "log_path": str(log_path), "lines": content[-lines:]}


def get_generation_logs(run_id: str, lines: int = 200) -> dict[str, Any]:
    run_dir = _generation_runs_dir() / run_id
    log_path = run_dir / "dashboard.log"
    if not log_path.exists():
        return {"run_id": run_id, "log_path": str(log_path), "lines": []}

    content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"run_id": run_id, "log_path": str(log_path), "lines": content[-lines:]}


def preview_evaluation_spec(spec_path: str) -> dict[str, Any]:
    path = Path(spec_path).expanduser().resolve()
    payload: dict[str, Any] = {
        "path": str(path),
        "exists": path.exists(),
        "valid": False,
        "summary": None,
        "raw_text": None,
        "error": None,
    }

    if not path.exists():
        payload["error"] = "Spec file not found."
        return payload

    try:
        raw_text = path.read_text(encoding="utf-8")
        payload["raw_text"] = raw_text
        loaded = yaml.safe_load(raw_text)
        spec = _require_mapping(loaded, "spec")

        run = _mapping_or_empty(spec.get("run"))
        episode = _mapping_or_empty(spec.get("episode"))
        strategy = _mapping_or_empty(spec.get("strategy"))
        orchestration = _mapping_or_empty(spec.get("orchestration"))
        judge = _mapping_or_empty(spec.get("judge"))
        raw_models = spec.get("models")
        models = raw_models if isinstance(raw_models, list) else []

        payload["summary"] = {
            "schema": _text_or_none(spec.get("schema")),
            "run_id": _text_or_none(run.get("id")),
            "output_root": _text_or_none(run.get("output_root")),
            "episode_dir": _text_or_none(episode.get("dir")),
            "selection": {
                "qt": _text_or_none(episode.get("qt")),
                "case": _text_or_none(episode.get("case")),
                "seed": _text_or_none(episode.get("seed")),
            },
            "strategy": {
                "name": _text_or_none(strategy.get("name"))
                or _text_or_none(spec.get("strategy")),
                "timeout": strategy.get("timeout"),
                "temperature": strategy.get("temperature"),
                "max_steps": strategy.get("max_steps"),
            },
            "orchestration": {
                "max_workers": orchestration.get("max_workers"),
                "simulator_start_timeout": orchestration.get("simulator_start_timeout"),
                "simulator_start_retries": orchestration.get("simulator_start_retries"),
                "evaluation_retries": orchestration.get("evaluation_retries"),
                "allow_partial_start": orchestration.get("allow_partial_start"),
            },
            "api": {
                "base": _text_or_none(_mapping_or_empty(spec.get("api")).get("base")),
                "key_source": _text_or_none(
                    _mapping_or_empty(spec.get("api")).get("key")
                ),
            },
            "judge": {
                "model": _text_or_none(judge.get("model")),
                "api_base": _text_or_none(judge.get("api_base")),
                "api_key_source": _text_or_none(judge.get("api_key")),
            },
            "models": [
                {
                    "model": _text_or_none(_mapping_or_empty(entry).get("model")),
                    "api_base": _text_or_none(_mapping_or_empty(entry).get("api_base")),
                    "api_key_source": _text_or_none(_mapping_or_empty(entry).get("api_key")),
                    "judge_model": _text_or_none(
                        _mapping_or_empty(entry).get("judge_model")
                    ),
                    "judge_api_base": _text_or_none(
                        _mapping_or_empty(entry).get("judge_api_base")
                    ),
                    "judge_api_key_source": _text_or_none(
                        _mapping_or_empty(entry).get("judge_api_key")
                    ),
                }
                for entry in models
            ],
        }
        payload["valid"] = True
        return payload
    except Exception as exc:
        payload["error"] = str(exc)
        return payload


def preview_generation_spec(spec_path: str) -> dict[str, Any]:
    path = Path(spec_path).expanduser().resolve()
    payload: dict[str, Any] = {
        "path": str(path),
        "exists": path.exists(),
        "valid": False,
        "summary": None,
        "raw_text": None,
        "error": None,
    }

    if not path.exists():
        payload["error"] = "Spec file not found."
        return payload

    try:
        raw_text = path.read_text(encoding="utf-8")
        payload["raw_text"] = raw_text
        spec = _require_mapping(yaml.safe_load(raw_text), "spec")

        run = _mapping_or_empty(spec.get("run"))
        episode = _mapping_or_empty(spec.get("episode"))
        home = _mapping_or_empty(episode.get("home"))
        llm = _mapping_or_empty(spec.get("llm"))

        payload["summary"] = {
            "schema": _text_or_none(spec.get("schema")),
            "run_id": _text_or_none(run.get("id")),
            "output_root": _text_or_none(run.get("output_root")),
            "selection": {
                "qt": _text_or_none(episode.get("qt")),
                "case": _text_or_none(episode.get("case")),
                "seed": _text_or_none(episode.get("seed")),
            },
            "base_date": _text_or_none(episode.get("base_date")),
            "home": {
                "room_count": home.get("room_count"),
                "devices_per_room": home.get("devices_per_room"),
                "environment": home.get("environment"),
            },
            "llm": {
                "model": _text_or_none(llm.get("model")),
                "api_base": _text_or_none(llm.get("api_base")),
                "api_key_source": _text_or_none(llm.get("api_key")),
                "temperature": llm.get("temperature"),
            },
        }
        payload["valid"] = True
        return payload
    except Exception as exc:
        payload["error"] = str(exc)
        return payload


def start_evaluation(spec_path: str) -> dict[str, Any]:
    log_path = _ensure_eval_log_dir(spec_path)
    command = [
        sys.executable,
        "-m",
        "src.cli.parallel_model_evaluation",
        "--spec",
        spec_path,
    ]
    process = _spawn(command, log_path, file_mode="w")
    return {
        "accepted": True,
        "pid": int(process.pid),
        "log_path": str(log_path),
        "mode": "start",
    }


def start_generation(spec_path: str) -> dict[str, Any]:
    log_path = _ensure_generation_log_dir(spec_path)
    command = [
        sys.executable,
        "-m",
        "src.cli.episode_generator",
        "--spec",
        spec_path,
    ]
    process = _spawn(command, log_path, file_mode="w")
    return {
        "accepted": True,
        "pid": int(process.pid),
        "log_path": str(log_path),
        "mode": "start",
    }


def resume_evaluation(resume_path: str) -> dict[str, Any]:
    log_path = Path(resume_path).resolve() / "dashboard.log"
    command = [
        sys.executable,
        "-m",
        "src.cli.parallel_model_evaluation",
        "--resume",
        resume_path,
    ]
    process = _spawn(command, log_path, file_mode="a")
    return {
        "accepted": True,
        "pid": int(process.pid),
        "log_path": str(log_path),
        "mode": "resume",
    }


def resume_generation(resume_path: str) -> dict[str, Any]:
    log_path = Path(resume_path).resolve() / "dashboard.log"
    command = [
        sys.executable,
        "-m",
        "src.cli.episode_generator",
        "--resume",
        resume_path,
    ]
    process = _spawn(command, log_path, file_mode="a")
    return {
        "accepted": True,
        "pid": int(process.pid),
        "log_path": str(log_path),
        "mode": "resume",
    }


def _spawn(command: list[str], log_path: Path, *, file_mode: str) -> subprocess.Popen[Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open(file_mode, encoding="utf-8")
    env = os.environ.copy()
    env.setdefault("SIMUHOME_EXPERIMENTS_DIR", str(_experiments_dir()))
    env.setdefault("SIMUHOME_GENERATION_RUNS_DIR", str(_generation_runs_dir()))
    try:
        process = subprocess.Popen(
            command,
            cwd=Path(__file__).resolve().parents[3],
            env=env,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    finally:
        log_handle.close()
    return process


def _ensure_eval_log_dir(spec_path: str) -> Path:
    spec_name = Path(spec_path).stem or "evaluation"
    return _experiments_dir() / f"{spec_name}-dashboard" / "dashboard.log"


def _ensure_generation_log_dir(spec_path: str) -> Path:
    spec_name = Path(spec_path).stem or "generation"
    return _generation_runs_dir() / f"{spec_name}-dashboard" / "dashboard.log"


def _experiments_dir() -> Path:
    return Path(os.getenv("SIMUHOME_EXPERIMENTS_DIR", "experiments")).resolve()


def _generation_runs_dir() -> Path:
    return Path(os.getenv("SIMUHOME_GENERATION_RUNS_DIR", "data/benchmark")).resolve()


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _collect_judge_failures(run_dir: Path) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for model_dir in sorted([path for path in run_dir.iterdir() if path.is_dir()]):
        for artifact_path in sorted(model_dir.glob("*.json")):
            artifact = _read_json(artifact_path)
            if artifact is None:
                continue
            evaluation_result = artifact.get("evaluation_result")
            if not isinstance(evaluation_result, dict):
                continue
            if evaluation_result.get("error_type") != "Judge Error":
                continue
            details = evaluation_result.get("judge_error_details")
            failures.append(
                {
                    "model": model_dir.name,
                    "artifact": artifact_path.name,
                    "artifact_path": str(artifact_path),
                    "details": details if isinstance(details, list) else [],
                }
            )
    return failures


def _collect_generation_artifacts(run_dir: Path) -> list[dict[str, Any]]:
    episodes_dir = run_dir / "episodes"
    artifacts: list[dict[str, Any]] = []
    if not episodes_dir.exists():
        return artifacts

    for artifact_path in sorted(episodes_dir.glob("*.json")):
        artifact = _read_json(artifact_path)
        if artifact is None:
            continue
        artifacts.append(
            {
                "file_name": artifact_path.name,
                "file_path": str(artifact_path),
                "seed": artifact.get("seed"),
                "query_type": artifact.get("query_type"),
                "query": artifact.get("query"),
                "raw_payload": artifact,
            }
        )
    return artifacts


def _summarize_generation_seeds(state: dict[str, Any]) -> list[dict[str, Any]]:
    seeds_raw = state.get("seeds")
    if not isinstance(seeds_raw, dict):
        return []

    summarized: list[dict[str, Any]] = []
    for seed_key, entry_raw in sorted(seeds_raw.items(), key=lambda item: int(str(item[0]))):
        entry = entry_raw if isinstance(entry_raw, dict) else {}
        seed_value = int(seed_key) if str(seed_key).isdigit() else seed_key
        summarized.append(
            {
                "seed": seed_value,
                "status": entry.get("status"),
                "file": entry.get("file"),
                "error": entry.get("error"),
                "updated_at": entry.get("updated_at"),
            }
        )
    return summarized


def _summarize_artifact(artifact_path: Path, artifact: dict[str, Any]) -> dict[str, Any]:
    evaluation_result = artifact.get("evaluation_result")
    if not isinstance(evaluation_result, dict):
        evaluation_result = {}

    required_actions = evaluation_result.get("required_actions")
    if not isinstance(required_actions, list):
        required_actions = []

    judge = evaluation_result.get("judge")
    if not isinstance(judge, list):
        judge = []

    judge_error_details = evaluation_result.get("judge_error_details")
    if not isinstance(judge_error_details, list):
        judge_error_details = []

    tools_invoked = artifact.get("tools_invoked")
    normalized_tools = []
    if isinstance(tools_invoked, list):
        for entry in tools_invoked:
            if not isinstance(entry, dict):
                continue
            outcome = entry.get("outcome")
            if not isinstance(outcome, dict):
                outcome = {}
            normalized_tools.append(
                {
                    "tool": str(entry.get("tool") or "unknown"),
                    "ok": bool(outcome.get("ok")),
                    "status_code": outcome.get("status_code"),
                    "error_type": outcome.get("error_type"),
                }
            )

    steps = artifact.get("steps")
    normalized_steps = []
    if isinstance(steps, list):
        for entry in steps:
            if not isinstance(entry, dict):
                continue
            normalized_steps.append(
                {
                    "step": entry.get("step"),
                    "thought": entry.get("thought"),
                    "action": entry.get("action"),
                    "action_input": entry.get("action_input"),
                }
            )

    return {
        "file_name": artifact_path.name,
        "file_path": str(artifact_path),
        "query_type": artifact.get("query_type"),
        "case": artifact.get("case"),
        "seed": artifact.get("seed"),
        "duration": artifact.get("duration"),
        "score": evaluation_result.get("score"),
        "error_type": evaluation_result.get("error_type"),
        "final_answer": artifact.get("final_answer"),
        "required_actions": {
            "total": len(required_actions),
            "invoked": sum(1 for action in required_actions if action.get("invoked")),
        },
        "judge": judge,
        "judge_error_details": judge_error_details,
        "tools_invoked": normalized_tools,
        "steps": normalized_steps,
    }


def _require_mapping(value: object, key_name: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{key_name} must be a mapping")
    return {str(key): item for key, item in value.items()}


def _mapping_or_empty(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return {str(key): item for key, item in value.items()}
    return {}


def _text_or_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
