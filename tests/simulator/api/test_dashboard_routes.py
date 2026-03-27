from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from src.simulator.api.app import create_app


def _unwrap_ok(response):
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"]["code"] == 200
    return payload["data"]


def test_wiki_api_catalog_lists_existing_simulator_routes() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/apis")

    data = _unwrap_ok(response)
    routes = {(entry["method"], entry["path"]) for entry in data["routes"]}
    assert ("GET", "/api/home/state") in routes
    assert ("POST", "/api/simulation/reset") in routes


def test_wiki_api_catalog_uses_agent_tool_docs_and_explicit_missing_description() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/apis")

    data = _unwrap_ok(response)
    routes = {(entry["method"], entry["path"]): entry for entry in data["routes"]}

    home_state = routes[("GET", "/api/home/state")]
    assert home_state["summary"] == "Get a full home snapshot in home_config format."
    assert home_state["description"] == "Get a full home snapshot in home_config format."
    assert home_state["args"] == []

    room_states = routes[("GET", "/api/rooms/{room_id}/states")]
    assert room_states["summary"].startswith("Get environmental states of a room")
    assert room_states["args"] == [
        {
            "name": "room_id",
            "type": "str",
            "description": 'Room id (e.g., "living_room")',
            "required": True,
        }
    ]

    health = routes[("GET", "/api/__health__")]
    assert health["summary"] == "Description is not provided."
    assert health["description"] == "Description is not provided."
    assert health["args"] == []


def test_wiki_device_types_lists_supported_devices() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/device-types")

    data = _unwrap_ok(response)
    assert "on_off_light" in data["device_types"]
    assert "air_conditioner" in data["device_types"]


def test_wiki_aggregators_lists_supported_environment_aggregators() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/aggregators")

    data = _unwrap_ok(response)
    aggregator_types = {entry["aggregator_type"] for entry in data["aggregators"]}
    assert aggregator_types == {"temperature", "pm10", "illuminance", "humidity"}


def test_wiki_aggregator_detail_exposes_mechanism_and_affected_devices() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/aggregators/temperature")

    data = _unwrap_ok(response)
    formula_settings = {entry["name"]: entry for entry in data["formula_settings"]}
    assert data["aggregator_type"] == "temperature"
    assert data["environment_signal"] == "Temperature"
    assert "heat exchange" in data["mechanism"].lower()
    assert "air_conditioner" in data["interested_device_types"]
    assert "baseline" in data["formula_readable"].lower()
    assert "restoration_delta" in data["formula_code"]
    assert data["unit"] == "°C"
    assert formula_settings["delta"]["value"] == 0
    assert formula_settings["restoration_rate_per_second"]["value"] == 0.0002
    assert formula_settings["tick_interval"]["value"] == 0.1


def test_wiki_device_detail_exposes_structure_and_cluster_metadata() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/device-types/on_off_light")

    data = _unwrap_ok(response)
    assert data["device_type"] == "on_off_light"
    assert "1" in data["structure"]["endpoints"]
    on_off_cluster = data["clusters"]["OnOff"]
    assert "On" in on_off_cluster["commands"]
    assert on_off_cluster["attributes"]["OnOff"]["type"] == "bool"


def test_wiki_cluster_doc_returns_markdown_content() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/clusters/OnOff")

    data = _unwrap_ok(response)
    assert data["cluster_id"] == "OnOff"
    assert "On/Off Cluster" in data["content"]


def test_wiki_cluster_doc_raw_returns_markdown_response() -> None:
    client = TestClient(create_app())

    response = client.get("/api/dashboard/wiki/clusters/OnOff/raw")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "On/Off Cluster" in response.text


def test_local_runtime_config_uses_configured_experiments_directory(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    experiments_dir.mkdir()
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/runtime/config")

    data = _unwrap_ok(response)
    assert data["experiments_dir"] == str(experiments_dir)
    assert data["exists"] is True


def test_local_evaluation_runs_lists_runs_from_experiments_directory(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    run_dir = experiments_dir / "demo-run"
    run_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps({"run_id": "demo-run", "schema": "simuhome-eval-spec-v1"}),
        encoding="utf-8",
    )
    (run_dir / "run_state.json").write_text(
        json.dumps({"models": {"demo_model": {"status": "pending"}}}),
        encoding="utf-8",
    )
    (run_dir / "run_summary.json").write_text(
        json.dumps({"totals": {"success": 0, "failed": 0}}), encoding="utf-8"
    )
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/evaluations/runs")

    data = _unwrap_ok(response)
    assert data["runs"][0]["run_id"] == "demo-run"
    assert data["runs"][0]["has_summary"] is True


def test_local_evaluation_run_detail_exposes_model_groups_and_artifacts(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    run_dir = experiments_dir / "demo-run"
    model_dir = run_dir / "gpt-4.1"
    model_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps({"run_id": "demo-run", "schema": "simuhome-eval-spec-v1"}),
        encoding="utf-8",
    )
    (run_dir / "run_summary.json").write_text(
        json.dumps({"totals": {"success": 3, "failed": 1, "pending": 0, "total": 4}}),
        encoding="utf-8",
    )
    (model_dir / "episode-1.json").write_text(
        json.dumps(
            {
                "seed": 1,
                "query_type": "qt1",
                "case": "feasible",
                "duration": 4.2,
                "final_answer": "Utility room is bright.",
                "evaluation_result": {
                    "score": 1,
                    "error_type": None,
                    "required_actions": [
                        {"tool": "get_room_states", "params": {"room_id": "utility_room"}, "invoked": True}
                    ],
                    "judge": ["A", "A", "B"],
                },
                "tools_invoked": [
                    {
                        "tool": "get_room_states",
                        "params": {"room_id": "utility_room"},
                        "outcome": {"ok": True, "status_code": 200, "error_type": None},
                    }
                ],
                "steps": [
                    {
                        "step": 1,
                        "thought": "Check utility room.",
                        "action": "get_room_states",
                        "action_input": {"room_id": "utility_room"},
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/evaluations/runs/demo-run/detail")

    data = _unwrap_ok(response)
    assert data["run_id"] == "demo-run"
    assert data["summary"]["total"] == 4
    assert data["summary"]["success"] == 3
    assert data["models"][0]["model"] == "gpt-4.1"
    assert data["models"][0]["artifacts"][0]["file_name"] == "episode-1.json"
    assert data["models"][0]["artifacts"][0]["final_answer"] == "Utility room is bright."
    assert data["models"][0]["artifacts"][0]["required_actions"]["invoked"] == 1
    assert data["models"][0]["artifacts"][0]["steps"][0]["action"] == "get_room_states"


def test_local_evaluation_runs_includes_judge_failure_details(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    run_dir = experiments_dir / "demo-run"
    model_dir = run_dir / "gpt-4.1"
    model_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps({"run_id": "demo-run", "schema": "simuhome-eval-spec-v1"}),
        encoding="utf-8",
    )
    (model_dir / "episode-1.json").write_text(
        json.dumps(
            {
                "evaluation_result": {
                    "score": -1,
                    "error_type": "Judge Error",
                    "judge": ["Error", "Error", "Error"],
                    "judge_error_details": [
                        "LLM request exhausted 11 attempts: 400 unsupported model"
                    ],
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/evaluations/runs")

    data = _unwrap_ok(response)
    assert data["runs"][0]["judge_failures"] == [
        {
            "model": "gpt-4.1",
            "artifact": "episode-1.json",
            "artifact_path": str(model_dir / "episode-1.json"),
            "details": ["LLM request exhausted 11 attempts: 400 unsupported model"],
        }
    ]


def test_local_evaluation_runs_ignores_dashboard_log_directories_without_manifest(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    (experiments_dir / "eval_spec.example-dashboard").mkdir(parents=True)
    run_dir = experiments_dir / "demo-run"
    run_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps({"run_id": "demo-run", "schema": "simuhome-eval-spec-v1"}),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/evaluations/runs")

    data = _unwrap_ok(response)
    assert [run["run_id"] for run in data["runs"]] == ["demo-run"]


def test_local_evaluation_start_spawns_background_process(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured["kwargs"] = kwargs
        captured["run_dir_exists_at_spawn"] = (experiments_dir / "demo-eval-run").exists()
        return DummyProcess()

    experiments_dir = tmp_path / "experiments"
    spec_path = tmp_path / "eval_spec.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-eval-spec-v1",
                "run:",
                "  id: demo-eval-run",
                f"  output_root: {experiments_dir}",
                "episode:",
                "  dir: data/benchmark",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "models:",
                "  - model: gpt-5-mini",
                "    api_base: https://api.openai.com/v1",
                "    api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/evaluations/start",
        json={"spec_path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert data["pid"] == 4321
    assert captured["command"][:3] == [
        sys.executable,
        "-m",
        "src.dashboard.backend.dashboard_log_runner",
    ]
    assert captured["command"][-2:] == ["--spec", str(spec_path)]
    assert captured["run_dir_exists_at_spawn"] is False


def test_local_evaluation_start_uses_write_mode_for_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["log_mode"] = kwargs["env"]["SIMUHOME_DASHBOARD_LOG_MODE"]
        return DummyProcess()

    experiments_dir = tmp_path / "experiments"
    spec_path = tmp_path / "eval_spec.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-eval-spec-v1",
                "run:",
                "  id: demo-eval-run",
                f"  output_root: {experiments_dir}",
                "episode:",
                "  dir: data/benchmark",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "models:",
                "  - model: gpt-5-mini",
                "    api_base: https://api.openai.com/v1",
                "    api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/evaluations/start",
        json={"spec_path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert captured["log_mode"] == "w"


def test_local_evaluation_start_uses_run_directory_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["log_path"] = kwargs["env"]["SIMUHOME_DASHBOARD_LOG_PATH"]
        return DummyProcess()

    spec_path = tmp_path / "custom-eval.yaml"
    output_root = tmp_path / "custom-experiments"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-eval-spec-v1",
                "run:",
                "  id: actual-eval-run",
                f"  output_root: {output_root}",
                "episode:",
                "  dir: data/benchmark",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "models:",
                "  - model: gpt-5-mini",
                "    api_base: https://api.openai.com/v1",
                "    api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(tmp_path / "fallback-experiments"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/evaluations/start",
        json={"spec_path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    expected_log_path = Path.cwd() / "logs" / "evaluation" / "actual-eval-run.log"
    assert data["accepted"] is True
    assert data["log_path"] == str(expected_log_path)
    assert captured["log_path"] == str(expected_log_path)


def test_local_evaluation_start_rejects_existing_run_before_touching_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    def fake_popen(command, **kwargs):
        raise AssertionError("subprocess should not be started")

    experiments_dir = tmp_path / "experiments"
    run_dir = experiments_dir / "actual-eval-run"
    run_dir.mkdir(parents=True)
    log_path = Path.cwd() / "logs" / "evaluation" / "actual-eval-run.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text("existing log\n", encoding="utf-8")

    spec_path = tmp_path / "custom-eval.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-eval-spec-v1",
                "run:",
                "  id: actual-eval-run",
                f"  output_root: {experiments_dir}",
                "episode:",
                "  dir: data/benchmark",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "models:",
                "  - model: gpt-5-mini",
                "    api_base: https://api.openai.com/v1",
                "    api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/evaluations/start",
        json={"spec_path": str(spec_path)},
    )

    assert response.status_code == 409
    assert "run directory already exists" in response.json()["detail"]
    assert log_path.read_text(encoding="utf-8") == "existing log\n"


def test_local_evaluation_resume_uses_append_mode_for_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["log_mode"] = kwargs["env"]["SIMUHOME_DASHBOARD_LOG_MODE"]
        return DummyProcess()

    run_dir = tmp_path / "experiments" / "demo-run"
    run_dir.mkdir(parents=True)

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(tmp_path / "experiments"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/evaluations/resume",
        json={"resume_path": str(run_dir)},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert captured["log_mode"] == "a"


def test_local_server_stop_schedules_background_shutdown(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_schedule(port: int) -> None:
        captured["port"] = port

    monkeypatch.setattr("src.dashboard.router.schedule_local_server_stop", fake_schedule)

    client = TestClient(create_app(), base_url="http://127.0.0.1:8000")

    response = client.post("/api/dashboard/local/server/stop")

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert data["port"] == 8000
    assert captured["port"] == 8000


def test_local_evaluation_spec_preview_reads_yaml_summary(tmp_path: Path) -> None:
    spec_path = tmp_path / "eval_spec.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-eval-spec-v1",
                "run:",
                "  id: demo-run",
                "  output_root: experiments",
                "episode:",
                "  dir: data/benchmark",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1 - 3'",
                "strategy:",
                "  name: react",
                "models:",
                "  - model: openai/gpt-4.1",
                "    api_base: https://openrouter.ai/api/v1",
                "    api_key: env:OPENROUTER_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    client = TestClient(create_app())

    response = client.get(
        "/api/dashboard/local/evaluations/spec-preview",
        params={"path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["exists"] is True
    assert data["valid"] is True
    assert data["summary"]["run_id"] == "demo-run"
    assert data["summary"]["selection"]["qt"] == "qt1"
    assert data["summary"]["models"][0]["model"] == "openai/gpt-4.1"


def test_local_runtime_config_includes_generation_directory_and_example(
    monkeypatch, tmp_path: Path
) -> None:
    experiments_dir = tmp_path / "experiments"
    generation_dir = tmp_path / "generated"
    experiments_dir.mkdir()
    generation_dir.mkdir()
    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))
    monkeypatch.setenv("SIMUHOME_GENERATION_RUNS_DIR", str(generation_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/runtime/config")

    data = _unwrap_ok(response)
    assert data["generation_runs_dir"] == str(generation_dir)
    assert data["generation_exists"] is True
    assert data["gen_spec_example"].endswith("gen_spec.example.yaml")


def test_local_generation_runs_lists_runs_from_generation_directory(
    monkeypatch, tmp_path: Path
) -> None:
    generation_dir = tmp_path / "generated"
    run_dir = generation_dir / "demo-generation"
    run_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps({"run_id": "demo-generation", "schema": "simuhome-gen-spec-v1"}),
        encoding="utf-8",
    )
    (run_dir / "run_state.json").write_text(
        json.dumps(
            {
                "generation": {"total": 3, "completed": 1, "failed": 1, "pending": 1},
                "seeds": {
                    "1": {"status": "success", "file": "episodes/qt1_feasible_seed_1.json"},
                    "2": {"status": "failed", "error": "model timeout"},
                    "3": {"status": "pending"},
                },
            }
        ),
        encoding="utf-8",
    )
    (run_dir / "run_summary.json").write_text(
        json.dumps(
            {
                "schema": "simuhome-gen-spec-v1",
                "run_id": "demo-generation",
                "output_dir": str(run_dir / "episodes"),
                "total": 3,
                "success": 1,
                "failed": 1,
                "pending": 1,
                "files": ["episodes/qt1_feasible_seed_1.json"],
                "failed_items": [{"seed": 2, "error": "model timeout"}],
                "pending_seeds": [3],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_GENERATION_RUNS_DIR", str(generation_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/generations/runs")

    data = _unwrap_ok(response)
    assert data["runs"][0]["run_id"] == "demo-generation"
    assert data["runs"][0]["has_summary"] is True
    assert data["runs"][0]["summary"]["success"] == 1


def test_local_generation_run_detail_exposes_seed_status_and_artifact_preview(
    monkeypatch, tmp_path: Path
) -> None:
    generation_dir = tmp_path / "generated"
    run_dir = generation_dir / "demo-generation"
    episodes_dir = run_dir / "episodes"
    episodes_dir.mkdir(parents=True)
    (run_dir / "manifest.json").write_text(
        json.dumps(
            {
                "run_id": "demo-generation",
                "schema": "simuhome-gen-spec-v1",
                "resolved": {
                    "episode": {"qt": "qt1", "case": "feasible", "seed": ["1", "2", "3"]},
                    "llm": {"model": "gpt-5-mini"},
                },
            }
        ),
        encoding="utf-8",
    )
    (run_dir / "run_state.json").write_text(
        json.dumps(
            {
                "generation": {"qt": "qt1", "case": "feasible", "total": 3},
                "seeds": {
                    "1": {
                        "status": "success",
                        "file": "episodes/qt1_feasible_seed_1.json",
                        "error": None,
                    },
                    "2": {"status": "failed", "file": None, "error": "model timeout"},
                    "3": {"status": "pending", "file": None, "error": None},
                },
            }
        ),
        encoding="utf-8",
    )
    (run_dir / "run_summary.json").write_text(
        json.dumps(
            {
                "schema": "simuhome-gen-spec-v1",
                "run_id": "demo-generation",
                "output_dir": str(episodes_dir),
                "total": 3,
                "success": 1,
                "failed": 1,
                "pending": 1,
                "files": ["episodes/qt1_feasible_seed_1.json"],
                "failed_items": [{"seed": 2, "error": "model timeout"}],
                "pending_seeds": [3],
            }
        ),
        encoding="utf-8",
    )
    episode_payload = {
        "query_type": "qt1",
        "query": "Is the utility room bright?",
        "seed": 1,
        "messages": [{"role": "user", "content": "Question"}],
    }
    (episodes_dir / "qt1_feasible_seed_1.json").write_text(
        json.dumps(episode_payload),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_GENERATION_RUNS_DIR", str(generation_dir))

    client = TestClient(create_app())

    response = client.get("/api/dashboard/local/generations/runs/demo-generation/detail")

    data = _unwrap_ok(response)
    assert data["run_id"] == "demo-generation"
    assert data["summary"]["success"] == 1
    assert data["seeds"][0]["seed"] == 1
    assert data["seeds"][0]["status"] == "success"
    assert data["seeds"][1]["error"] == "model timeout"
    assert data["artifacts"][0]["file_name"] == "qt1_feasible_seed_1.json"
    assert data["artifacts"][0]["query"] == "Is the utility room bright?"
    assert data["artifacts"][0]["raw_payload"]["messages"][0]["role"] == "user"


def test_local_generation_start_spawns_episode_generator_process(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 9876

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured["stdout_mode"] = kwargs["stdout"]
        captured["stderr_mode"] = kwargs["stderr"]
        captured["run_dir_exists_at_spawn"] = (generation_dir / "demo-generation-run").exists()
        return DummyProcess()

    generation_dir = tmp_path / "generated"
    spec_path = tmp_path / "gen_spec.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-gen-spec-v1",
                "run:",
                "  id: demo-generation-run",
                f"  output_root: {generation_dir}",
                "episode:",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "llm:",
                "  model: gpt-5-mini",
                "  api_base: https://api.openai.com/v1",
                "  api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("SIMUHOME_GENERATION_RUNS_DIR", str(generation_dir))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/generations/start",
        json={"spec_path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert data["pid"] == 9876
    assert captured["command"][:3] == [
        sys.executable,
        "-m",
        "src.dashboard.backend.dashboard_log_runner",
    ]
    assert captured["command"][-2:] == ["--spec", str(spec_path)]
    assert captured["stdout_mode"] == subprocess.DEVNULL
    assert captured["stderr_mode"] == subprocess.DEVNULL
    assert captured["run_dir_exists_at_spawn"] is False


def test_local_generation_start_uses_run_directory_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 9876

    def fake_popen(command, **kwargs):
        captured["log_path"] = kwargs["env"]["SIMUHOME_DASHBOARD_LOG_PATH"]
        return DummyProcess()

    spec_path = tmp_path / "custom-generation.yaml"
    output_root = tmp_path / "custom-generated"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-gen-spec-v1",
                "run:",
                "  id: actual-generation-run",
                f"  output_root: {output_root}",
                "episode:",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "llm:",
                "  model: gpt-5-mini",
                "  api_base: https://api.openai.com/v1",
                "  api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("SIMUHOME_GENERATION_RUNS_DIR", str(tmp_path / "fallback-generated"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/generations/start",
        json={"spec_path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    expected_log_path = Path.cwd() / "logs" / "generation" / "actual-generation-run.log"
    assert data["accepted"] is True
    assert data["log_path"] == str(expected_log_path)
    assert captured["log_path"] == str(expected_log_path)


def test_local_generation_start_rejects_existing_run_before_touching_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    def fake_popen(command, **kwargs):
        raise AssertionError("subprocess should not be started")

    generation_dir = tmp_path / "generated"
    run_dir = generation_dir / "actual-generation-run"
    run_dir.mkdir(parents=True)
    log_path = Path.cwd() / "logs" / "generation" / "actual-generation-run.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text("existing log\n", encoding="utf-8")

    spec_path = tmp_path / "custom-generation.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-gen-spec-v1",
                "run:",
                "  id: actual-generation-run",
                f"  output_root: {generation_dir}",
                "episode:",
                "  qt: qt1",
                "  case: feasible",
                "  seed: '1'",
                "llm:",
                "  model: gpt-5-mini",
                "  api_base: https://api.openai.com/v1",
                "  api_key: env:OPENAI_API_KEY",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/dashboard/local/generations/start",
        json={"spec_path": str(spec_path)},
    )

    assert response.status_code == 409
    assert "run directory already exists" in response.json()["detail"]
    assert log_path.read_text(encoding="utf-8") == "existing log\n"


def test_local_generation_spec_preview_reads_yaml_summary(tmp_path: Path) -> None:
    spec_path = tmp_path / "gen_spec.yaml"
    spec_path.write_text(
        "\n".join(
            [
                "schema: simuhome-gen-spec-v1",
                "run:",
                "  id: demo-generation",
                "  output_root: data/benchmark",
                "episode:",
                "  qt: qt4-2",
                "  case: feasible",
                "  seed: '1-3'",
                "  base_date: '2025-08-23'",
                "  home:",
                "    room_count: 5",
                "llm:",
                "  model: gpt-5-mini",
                "  api_base: https://openrouter.ai/api/v1",
                "  api_key: env:OPENROUTER_API_KEY",
                "  temperature: 1",
            ]
        ),
        encoding="utf-8",
    )

    client = TestClient(create_app())

    response = client.get(
        "/api/dashboard/local/generations/spec-preview",
        params={"path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["exists"] is True
    assert data["valid"] is True
    assert data["summary"]["run_id"] == "demo-generation"
    assert data["summary"]["selection"]["qt"] == "qt4-2"
    assert data["summary"]["llm"]["model"] == "gpt-5-mini"
    assert data["summary"]["home"]["room_count"] == 5


def test_dashboard_dev_origin_is_allowed_for_cors() -> None:
    client = TestClient(create_app())

    response = client.options(
        "/api/home/state",
        headers={
            "Origin": "http://127.0.0.1:4173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
