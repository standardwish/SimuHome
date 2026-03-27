import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  GenerationRunLogs,
  GenerationSpecPreview,
  RuntimeConfig,
  requestApi,
  useDashboardQuery,
} from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import type {
  GenerationLaunchResponse,
  GenerationRunsPayload,
} from "@/types/pages/generation";
import { GenerationPresenter } from "@/pages/Generation/Presenter";

function runIdFromLogPath(logPath: string): string | null {
  const segments = logPath.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  const fileName = segments[segments.length - 1] ?? "";
  if (fileName.endsWith(".log") && fileName !== "dashboard.log") {
    return fileName.slice(0, -4) || null;
  }
  return segments[segments.length - 2] ?? null;
}

export function GenerationContainer() {
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const pollingIntervalMs = useDashboardRuntimeStore((state) => state.pollingIntervalMs);
  const runtime = useDashboardQuery<RuntimeConfig>("/api/dashboard/local/runtime/config", {
    enabled: apiHealthy,
  });
  const runs = useDashboardQuery<GenerationRunsPayload>(
    "/api/dashboard/local/generations/runs",
    {
    intervalMs: pollingIntervalMs,
    enabled: apiHealthy,
    },
  );
  const [specPath, setSpecPath] = useState("gen_spec.example.yaml");
  const [resumePath, setResumePath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const deferredSpecPath = useDeferredValue(specPath.trim());

  const specPreview = useDashboardQuery<GenerationSpecPreview>(
    `/api/dashboard/local/generations/spec-preview?path=${encodeURIComponent(
      deferredSpecPath,
    )}`,
    { enabled: apiHealthy && Boolean(deferredSpecPath) },
  );
  const selectedRunLogs = useDashboardQuery<GenerationRunLogs>(
    `/api/dashboard/local/generations/runs/${selectedRunId}/logs`,
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
      const response = await requestApi<GenerationLaunchResponse>(
        "/api/dashboard/local/generations/start",
        { method: "POST", body: JSON.stringify({ spec_path: specPath }) },
      );
      const launchedRunId = runIdFromLogPath(response.data.log_path);
      if (launchedRunId) {
        setSelectedRunId(launchedRunId);
      }
      setMessage(`Started generation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start generation");
    }
  }

  async function handleResume() {
    try {
      const response = await requestApi<GenerationLaunchResponse>(
        "/api/dashboard/local/generations/resume",
        { method: "POST", body: JSON.stringify({ resume_path: resumePath }) },
      );
      const launchedRunId = runIdFromLogPath(response.data.log_path);
      if (launchedRunId) {
        setSelectedRunId(launchedRunId);
      }
      setMessage(`Resumed generation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to resume generation");
    }
  }

  return (
    <GenerationPresenter
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
