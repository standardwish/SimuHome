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
