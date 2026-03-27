import { Alert, Box, Stack } from "@mui/material";

import { EvaluationJudgeFailuresPanel } from "@/components/Evaluation/EvaluationJudgeFailuresPanel";
import { EvaluationLogPanel } from "@/components/Evaluation/EvaluationLogPanel";
import { EvaluationRunControlsPanel } from "@/components/Evaluation/EvaluationRunControlsPanel";
import { EvaluationRunsPanel } from "@/components/Evaluation/EvaluationRunsPanel";
import { EvaluationRuntimePanel } from "@/components/Evaluation/EvaluationRuntimePanel";
import { EvaluationSpecPreviewPanel } from "@/components/Evaluation/EvaluationSpecPreviewPanel";
import { PageIntro } from "@/ui";
import type { EvaluationPresenterProps } from "@/types/pages/evaluation";

export function EvaluationPresenter({
  message,
  specPath,
  resumePath,
  deferredSpecPath,
  runtime,
  runtimeError,
  runs,
  runsError,
  selectedRunId,
  selectedRun,
  selectedRunLogs,
  selectedRunLogsError,
  specPreview,
  specPreviewError,
  onSpecPathChange,
  onResumePathChange,
  onStart,
  onResume,
  onSelectedRunChange,
}: EvaluationPresenterProps) {
  const selectedJudgeFailures = selectedRun?.judge_failures ?? [];
  const selectedRunLabel = selectedRun?.run_id ?? selectedRunId ?? "No run selected";

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
          <EvaluationRunControlsPanel
            specPath={specPath}
            resumePath={resumePath}
            onSpecPathChange={onSpecPathChange}
            onResumePathChange={onResumePathChange}
            onStart={onStart}
            onResume={onResume}
          />

          <EvaluationLogPanel
            selectedRunId={selectedRunId}
            selectedRunLabel={selectedRunLabel}
            logPath={selectedRunLogs?.log_path ?? "dashboard.log unavailable"}
            logTail={
              selectedRunLogs?.lines?.length
                ? selectedRunLogs.lines.join("\n")
                : "No dashboard log output yet."
            }
            error={selectedRunLogsError}
          />

          <EvaluationJudgeFailuresPanel failures={selectedJudgeFailures} />

          <EvaluationRunsPanel
            runs={runs}
            runsError={runsError}
            selectedRunId={selectedRunId}
            selectedRunLabel={selectedRunLabel}
            onSelectedRunChange={onSelectedRunChange}
          />
        </Stack>

        <Stack spacing={2}>
          <EvaluationSpecPreviewPanel
            deferredSpecPath={deferredSpecPath}
            specPreviewPath={specPreview?.path ?? ""}
            specPreviewSchema={specPreview?.summary?.schema ?? "—"}
            specPreviewRunId={specPreview?.summary?.run_id ?? "—"}
            specPreviewEpisodeDir={specPreview?.summary?.episode_dir ?? "—"}
            specPreviewSelection={
              [
                specPreview?.summary?.selection.qt,
                specPreview?.summary?.selection.case,
                specPreview?.summary?.selection.seed,
              ]
                .filter(Boolean)
                .join(" / ") || "—"
            }
            specPreviewStrategy={specPreview?.summary?.strategy ?? { note: "No strategy preview." }}
            specPreviewModels={specPreview?.summary?.models ?? []}
            specPreviewYaml={specPreview?.raw_text ?? "Spec preview is unavailable."}
            specPreviewError={specPreviewError}
          />

          <EvaluationRuntimePanel
            experimentsDir={runtime?.experiments_dir ?? "Loading..."}
            exampleSpec={runtime?.eval_spec_example ?? "Loading..."}
            runtimeError={runtimeError}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
