from __future__ import annotations

import json
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

    response = client.get("/api/wiki/apis")

    data = _unwrap_ok(response)
    routes = {(entry["method"], entry["path"]) for entry in data["routes"]}
    assert ("GET", "/api/home/state") in routes
    assert ("POST", "/api/simulation/reset") in routes


def test_wiki_device_types_lists_supported_devices() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/device-types")

    data = _unwrap_ok(response)
    assert "on_off_light" in data["device_types"]
    assert "air_conditioner" in data["device_types"]


def test_wiki_aggregators_lists_supported_environment_aggregators() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/aggregators")

    data = _unwrap_ok(response)
    aggregator_types = {entry["aggregator_type"] for entry in data["aggregators"]}
    assert aggregator_types == {"temperature", "pm10", "illuminance", "humidity"}


def test_wiki_aggregator_detail_exposes_mechanism_and_affected_devices() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/aggregators/temperature")

    data = _unwrap_ok(response)
    assert data["aggregator_type"] == "temperature"
    assert data["environment_signal"] == "Temperature"
    assert "heat exchange" in data["mechanism"].lower()
    assert "air_conditioner" in data["interested_device_types"]
    assert data["unit"] == "°C"


def test_wiki_device_detail_exposes_structure_and_cluster_metadata() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/device-types/on_off_light")

    data = _unwrap_ok(response)
    assert data["device_type"] == "on_off_light"
    assert "1" in data["structure"]["endpoints"]
    on_off_cluster = data["clusters"]["OnOff"]
    assert "On" in on_off_cluster["commands"]
    assert on_off_cluster["attributes"]["OnOff"]["type"] == "bool"


def test_wiki_cluster_doc_returns_markdown_content() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/clusters/OnOff")

    data = _unwrap_ok(response)
    assert data["cluster_id"] == "OnOff"
    assert "On/Off Cluster" in data["content"]


def test_wiki_cluster_doc_raw_returns_markdown_response() -> None:
    client = TestClient(create_app())

    response = client.get("/api/wiki/clusters/OnOff/raw")

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

    response = client.get("/api/local/runtime/config")

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

    response = client.get("/api/local/evaluations/runs")

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

    response = client.get("/api/local/evaluations/runs/demo-run/detail")

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

    response = client.get("/api/local/evaluations/runs")

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

    response = client.get("/api/local/evaluations/runs")

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
        return DummyProcess()

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(tmp_path / "experiments"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/local/evaluations/start",
        json={"spec_path": "eval_spec.example.yaml"},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert data["pid"] == 4321
    assert captured["command"][-2:] == ["--spec", "eval_spec.example.yaml"]


def test_local_evaluation_start_clears_existing_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        return DummyProcess()

    experiments_dir = tmp_path / "experiments"
    log_dir = experiments_dir / "eval_spec.example-dashboard"
    log_dir.mkdir(parents=True)
    log_path = log_dir / "dashboard.log"
    log_path.write_text("stale log line\n", encoding="utf-8")

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(experiments_dir))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/local/evaluations/start",
        json={"spec_path": "eval_spec.example.yaml"},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert log_path.read_text(encoding="utf-8") == ""


def test_local_evaluation_start_uses_write_mode_for_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["stdout_mode"] = kwargs["stdout"].mode
        return DummyProcess()

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(tmp_path / "experiments"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/local/evaluations/start",
        json={"spec_path": "eval_spec.example.yaml"},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert captured["stdout_mode"] == "w"


def test_local_evaluation_resume_uses_append_mode_for_dashboard_log(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}

    class DummyProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["stdout_mode"] = kwargs["stdout"].mode
        return DummyProcess()

    run_dir = tmp_path / "experiments" / "demo-run"
    run_dir.mkdir(parents=True)

    monkeypatch.setenv("SIMUHOME_EXPERIMENTS_DIR", str(tmp_path / "experiments"))
    monkeypatch.setattr("src.dashboard.backend.runtime.subprocess.Popen", fake_popen)

    client = TestClient(create_app())

    response = client.post(
        "/api/local/evaluations/resume",
        json={"resume_path": str(run_dir)},
    )

    data = _unwrap_ok(response)
    assert data["accepted"] is True
    assert captured["stdout_mode"] == "a"


def test_local_server_stop_schedules_background_shutdown(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_schedule(port: int) -> None:
        captured["port"] = port

    monkeypatch.setattr("src.dashboard.router.schedule_local_server_stop", fake_schedule)

    client = TestClient(create_app(), base_url="http://127.0.0.1:8000")

    response = client.post("/api/local/server/stop")

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
        "/api/local/evaluations/spec-preview",
        params={"path": str(spec_path)},
    )

    data = _unwrap_ok(response)
    assert data["exists"] is True
    assert data["valid"] is True
    assert data["summary"]["run_id"] == "demo-run"
    assert data["summary"]["selection"]["qt"] == "qt1"
    assert data["summary"]["models"][0]["model"] == "openai/gpt-4.1"


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
