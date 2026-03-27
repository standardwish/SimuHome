import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  EvaluationRunLogs,
  EvaluationSpecPreview,
  RuntimeConfig,
  requestApi,
  useDashboardQuery,
} from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import type {
  EvaluationLaunchResponse,
  EvaluationRunsPayload,
} from "@/types/pages/evaluation";
import { EvaluationPresenter } from "@/pages/Evaluation/Presenter";

function runIdFromLogPath(logPath: string): string | null {
  const segments = logPath.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  return segments[segments.length - 2] ?? null;
}

export function EvaluationContainer() {
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const pollingIntervalMs = useDashboardRuntimeStore((state) => state.pollingIntervalMs);
  const runtime = useDashboardQuery<RuntimeConfig>("/api/local/runtime/config", {
    enabled: apiHealthy,
  });
  const runs = useDashboardQuery<EvaluationRunsPayload>("/api/local/evaluations/runs", {
    intervalMs: pollingIntervalMs,
    enabled: apiHealthy,
  });
  const [specPath, setSpecPath] = useState("eval_spec.example.yaml");
  const [resumePath, setResumePath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const deferredSpecPath = useDeferredValue(specPath.trim());

  const specPreview = useDashboardQuery<EvaluationSpecPreview>(
    `/api/local/evaluations/spec-preview?path=${encodeURIComponent(deferredSpecPath)}`,
    { enabled: apiHealthy && Boolean(deferredSpecPath) },
  );
  const selectedRunLogs = useDashboardQuery<EvaluationRunLogs>(
    `/api/local/evaluations/runs/${selectedRunId}/logs`,
    {
      intervalMs: pollingIntervalMs,
      enabled: apiHealthy && Boolean(selectedRunId),
    },
  );

  const selectedRun = useMemo(
    () => runs.data?.runs.find((run) => run.run_id === selectedRunId) ?? null,
    [runs.data?.runs, selectedRunId],
  );

  useEffect(() => {
    if (!selectedRunId && runs.data?.runs?.[0]) {
      setSelectedRunId(runs.data.runs[0].run_id);
    }
  }, [runs.data?.runs, selectedRunId]);

  async function handleStart() {
    try {
      const response = await requestApi<EvaluationLaunchResponse>(
        "/api/local/evaluations/start",
        { method: "POST", body: JSON.stringify({ spec_path: specPath }) },
      );
      const launchedRunId = runIdFromLogPath(response.data.log_path);
      if (launchedRunId) {
        setSelectedRunId(launchedRunId);
      }
      setMessage(`Started evaluation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start evaluation");
    }
  }

  async function handleResume() {
    try {
      const response = await requestApi<EvaluationLaunchResponse>(
        "/api/local/evaluations/resume",
        { method: "POST", body: JSON.stringify({ resume_path: resumePath }) },
      );
      const launchedRunId = runIdFromLogPath(response.data.log_path);
      if (launchedRunId) {
        setSelectedRunId(launchedRunId);
      }
      setMessage(`Resumed evaluation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to resume evaluation");
    }
  }

  return (
    <EvaluationPresenter
      message={message}
      specPath={specPath}
      resumePath={resumePath}
      deferredSpecPath={deferredSpecPath}
      runtime={runtime.data ?? null}
      runtimeError={runtime.error}
      runs={runs.data?.runs ?? []}
      runsError={runs.error}
      selectedRunId={selectedRunId}
      selectedRun={selectedRun}
      selectedRunLogs={selectedRunLogs.data ?? null}
      selectedRunLogsError={selectedRunLogs.error}
      specPreview={specPreview.data ?? null}
      specPreviewError={specPreview.error}
      onSpecPathChange={setSpecPath}
      onResumePathChange={setResumePath}
      onStart={handleStart}
      onResume={handleResume}
      onSelectedRunChange={setSelectedRunId}
    />
  );
}
