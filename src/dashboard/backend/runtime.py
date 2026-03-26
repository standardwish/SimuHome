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
    return {
        "experiments_dir": str(experiments_dir),
        "exists": experiments_dir.exists(),
        "eval_spec_example": str(Path("eval_spec.example.yaml").resolve()),
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


def get_evaluation_run(run_id: str) -> dict[str, Any]:
    run_dir = _experiments_dir() / run_id
    return {
        "run_id": run_id,
        "path": str(run_dir),
        "manifest": _read_json(run_dir / "manifest.json"),
        "state": _read_json(run_dir / "run_state.json"),
        "summary": _read_json(run_dir / "run_summary.json"),
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


def start_evaluation(spec_path: str) -> dict[str, Any]:
    log_path = _ensure_eval_log_dir(spec_path)
    command = [
        sys.executable,
        "-m",
        "src.cli.parallel_model_evaluation",
        "--spec",
        spec_path,
    ]
    process = _spawn(command, log_path)
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
    process = _spawn(command, log_path)
    return {
        "accepted": True,
        "pid": int(process.pid),
        "log_path": str(log_path),
        "mode": "resume",
    }


def _spawn(command: list[str], log_path: Path) -> subprocess.Popen[Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open("a", encoding="utf-8")
    env = os.environ.copy()
    env.setdefault("SIMUHOME_EXPERIMENTS_DIR", str(_experiments_dir()))
    return subprocess.Popen(
        command,
        cwd=Path(__file__).resolve().parents[3],
        env=env,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )


def _ensure_eval_log_dir(spec_path: str) -> Path:
    spec_name = Path(spec_path).stem or "evaluation"
    return _experiments_dir() / f"{spec_name}-dashboard" / "dashboard.log"


def _experiments_dir() -> Path:
    return Path(os.getenv("SIMUHOME_EXPERIMENTS_DIR", "experiments")).resolve()


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


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
