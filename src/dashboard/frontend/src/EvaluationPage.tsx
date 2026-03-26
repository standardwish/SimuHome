import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  EvaluationRun,
  EvaluationSpecPreview,
  RuntimeConfig,
  requestApi,
  useDashboardQuery,
} from "./api";
import { MetricStrip, MonoBlock, PageIntro, RailList, Surface } from "./ui";

type EvaluationRunsPayload = {
  runs: EvaluationRun[];
};

export function EvaluationPage() {
  const runtime = useDashboardQuery<RuntimeConfig>("/api/local/runtime/config");
  const runs = useDashboardQuery<EvaluationRunsPayload>("/api/local/evaluations/runs", {
    intervalMs: 2000,
  });
  const [specPath, setSpecPath] = useState("eval_spec.example.yaml");
  const [resumePath, setResumePath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const deferredSpecPath = useDeferredValue(specPath.trim());

  const specPreview = useDashboardQuery<EvaluationSpecPreview>(
    `/api/local/evaluations/spec-preview?path=${encodeURIComponent(deferredSpecPath)}`,
    { enabled: Boolean(deferredSpecPath) },
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
      const response = await requestApi<{ accepted: boolean; pid: number }>(
        "/api/local/evaluations/start",
        { method: "POST", body: JSON.stringify({ spec_path: specPath }) },
      );
      setMessage(`Started evaluation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start evaluation");
    }
  }

  async function handleResume() {
    try {
      const response = await requestApi<{ accepted: boolean; pid: number }>(
        "/api/local/evaluations/resume",
        { method: "POST", body: JSON.stringify({ resume_path: resumePath }) },
      );
      setMessage(`Resumed evaluation process ${response.data.pid}.`);
      await runs.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to resume evaluation");
    }
  }

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Evaluation runtime"
        title="Evaluation monitor"
        description="Start or resume runs, then inspect manifest, run state, and summaries."
      />

      {message && <Alert severity="info">{message}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Surface title="Run controls" caption="Launch from a spec or resume an existing run path.">
            <Stack spacing={1.5}>
              <TextField
                label="Spec path"
                value={specPath}
                onChange={(event) => setSpecPath(event.target.value)}
              />
              <Button variant="contained" onClick={handleStart}>
                Start evaluation
              </Button>
              <TextField
                label="Resume path"
                value={resumePath}
                onChange={(event) => setResumePath(event.target.value)}
              />
              <Button variant="outlined" onClick={handleResume}>
                Resume run
              </Button>
            </Stack>
          </Surface>

          <Surface title="Known runs" caption="Monitor summary files and select a run for deeper inspection.">
            <Stack spacing={2}>
              <MetricStrip
                items={[
                  {
                    label: "Detected runs",
                    value: String(runs.data?.runs.length ?? 0),
                    tone: "accent",
                  },
                  {
                    label: "With summary",
                    value: String(
                      runs.data?.runs.filter((run) => run.has_summary).length ?? 0,
                    ),
                  },
                  {
                    label: "Selected run",
                    value: selectedRun?.run_id ?? "—",
                  },
                ]}
              />

              <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                {(runs.data?.runs ?? []).map((run) => (
                  <Box
                    key={run.run_id}
                    onClick={() => setSelectedRunId(run.run_id)}
                    sx={{
                      py: 1.5,
                      px: 1,
                      cursor: "pointer",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      backgroundColor:
                        selectedRunId === run.run_id ? "rgba(15, 118, 110, 0.08)" : "transparent",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{run.run_id}</Typography>
                    <Typography color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {run.path}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Summary: {run.has_summary ? "ready" : "missing"}
                    </Typography>
                  </Box>
                ))}
                {(runs.data?.runs.length ?? 0) === 0 && (
                  <Box sx={{ py: 2 }}>
                    <Typography color="text.secondary">No runs detected yet.</Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          </Surface>

          {selectedRun && (
            <Surface
              title="Selected run"
              caption="Raw run artifacts for manifest, state, and final summary."
            >
              <Stack spacing={1.5}>
                <MonoBlock label="Manifest" value={selectedRun.manifest} />
                <MonoBlock label="Run state" value={selectedRun.state} />
                <MonoBlock label="Summary" value={selectedRun.summary} />
              </Stack>
            </Surface>
          )}
        </Stack>

        <Stack spacing={2}>
          <Surface
            title="Spec preview"
            caption="Preview the current evaluation spec path before starting a run."
          >
            <Stack spacing={1.5}>
              {specPreview.error && <Alert severity="warning">{specPreview.error}</Alert>}
              <RailList
                items={[
                  {
                    label: "Path",
                    value: specPreview.data?.path ?? deferredSpecPath ?? "—",
                  },
                  {
                    label: "Schema",
                    value: specPreview.data?.summary?.schema ?? "—",
                  },
                  {
                    label: "Run id",
                    value: specPreview.data?.summary?.run_id ?? "—",
                  },
                  {
                    label: "Episode dir",
                    value: specPreview.data?.summary?.episode_dir ?? "—",
                  },
                  {
                    label: "Selection",
                    value:
                      [
                        specPreview.data?.summary?.selection.qt,
                        specPreview.data?.summary?.selection.case,
                        specPreview.data?.summary?.selection.seed,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "—",
                  },
                ]}
              />
              <MonoBlock
                label="Strategy"
                value={specPreview.data?.summary?.strategy ?? { note: "No strategy preview." }}
                maxHeight={140}
              />
              <MonoBlock
                label="Models"
                value={specPreview.data?.summary?.models ?? []}
                maxHeight={180}
              />
              <MonoBlock
                label="Spec YAML"
                value={specPreview.data?.raw_text ?? "Spec preview is unavailable."}
                maxHeight={240}
              />
            </Stack>
          </Surface>

          <Surface title="Runtime config" caption="Local path context used by the backend worker.">
            <RailList
              items={[
                {
                  label: "Experiments dir",
                  value: runtime.data?.experiments_dir ?? "Loading...",
                },
                {
                  label: "Example spec",
                  value: runtime.data?.eval_spec_example ?? "Loading...",
                },
              ]}
            />
          </Surface>
        </Stack>
      </Box>
    </Stack>
  );
}
