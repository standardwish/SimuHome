from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from types import SimpleNamespace

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from src.cli import main as cli_main
from src.simulator.api.responses import ResponseBuilder
from src.simulator.domain.result import Result

from .backend.runtime import (
    get_evaluation_logs,
    get_evaluation_run,
    get_evaluation_summary,
    get_runtime_config,
    list_evaluation_runs,
    preview_evaluation_spec,
    resume_evaluation,
    start_evaluation,
)
from .backend.wiki import (
    build_api_catalog,
    get_cluster_doc_payload,
    get_device_type_payload,
    get_device_types_payload,
)


router = APIRouter(prefix="/api")


class EvaluationStartRequest(BaseModel):
    spec_path: str = Field(..., min_length=1)


class EvaluationResumeRequest(BaseModel):
    resume_path: str = Field(..., min_length=1)


def _resolve_local_server_port(request: Request) -> int:
    return request.url.port or int(os.getenv("SERVER_PORT") or os.getenv("PORT") or 8000)


def schedule_local_server_stop(port: int) -> None:
    def stop_server() -> None:
        time.sleep(0.2)
        cli_main._handle_server_stop(SimpleNamespace(port=port))

    threading.Thread(
        target=stop_server,
        name="dashboard-local-server-stop",
        daemon=True,
    ).start()


@router.get("/wiki/apis")
def get_wiki_apis(request: Request):
    return ResponseBuilder.from_result(Result.ok(build_api_catalog(request.app.routes)))


@router.get("/wiki/device-types")
def get_wiki_device_types():
    return ResponseBuilder.from_result(Result.ok(get_device_types_payload()))


@router.get("/wiki/device-types/{device_type}")
def get_wiki_device_type(device_type: str):
    try:
        payload = get_device_type_payload(device_type)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return ResponseBuilder.from_result(Result.ok(payload))


@router.get("/wiki/clusters/{cluster_id}")
def get_wiki_cluster_doc(cluster_id: str):
    try:
        payload = get_cluster_doc_payload(cluster_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return ResponseBuilder.from_result(Result.ok(payload))


@router.get("/local/runtime/config")
def get_local_runtime_config():
    return ResponseBuilder.from_result(Result.ok(get_runtime_config()))


@router.post("/local/server/stop")
def post_local_server_stop(request: Request):
    port = _resolve_local_server_port(request)
    schedule_local_server_stop(port)
    return ResponseBuilder.from_result(Result.ok({"accepted": True, "port": port}))


@router.get("/local/evaluations/runs")
def get_local_evaluation_runs():
    return ResponseBuilder.from_result(Result.ok(list_evaluation_runs()))


@router.get("/local/evaluations/spec-preview")
def get_local_evaluation_spec_preview(path: str):
    return ResponseBuilder.from_result(Result.ok(preview_evaluation_spec(path)))


@router.get("/local/evaluations/runs/{run_id}")
def get_local_evaluation_run(run_id: str):
    return ResponseBuilder.from_result(Result.ok(get_evaluation_run(run_id)))


@router.get("/local/evaluations/runs/{run_id}/summary")
def get_local_evaluation_run_summary(run_id: str):
    return ResponseBuilder.from_result(Result.ok(get_evaluation_summary(run_id)))


@router.get("/local/evaluations/runs/{run_id}/logs")
def get_local_evaluation_run_logs(run_id: str, lines: int = 200):
    return ResponseBuilder.from_result(Result.ok(get_evaluation_logs(run_id, lines)))


@router.post("/local/evaluations/start")
def post_local_evaluation_start(request: EvaluationStartRequest):
    spec_path = Path(request.spec_path)
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail=f"Spec not found: {request.spec_path}")
    return ResponseBuilder.from_result(Result.ok(start_evaluation(request.spec_path)))


@router.post("/local/evaluations/resume")
def post_local_evaluation_resume(request: EvaluationResumeRequest):
    resume_path = Path(request.resume_path)
    if not resume_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Resume path not found: {request.resume_path}"
        )
    return ResponseBuilder.from_result(Result.ok(resume_evaluation(request.resume_path)))
