import { Alert, Box, Stack } from "@mui/material";

import { GenerationLogPanel } from "@/components/Generation/GenerationLogPanel";
import { GenerationRunControlsPanel } from "@/components/Generation/GenerationRunControlsPanel";
import { GenerationRunsPanel } from "@/components/Generation/GenerationRunsPanel";
import { GenerationRuntimePanel } from "@/components/Generation/GenerationRuntimePanel";
import { GenerationSpecPreviewPanel } from "@/components/Generation/GenerationSpecPreviewPanel";
import type { GenerationPresenterProps } from "@/types/pages/generation";
import { PageIntro } from "@/ui";

export function GenerationPresenter({
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
}: GenerationPresenterProps) {
  const selectedRunLabel = selectedRun?.run_id ?? selectedRunId ?? "No run selected";

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Generation runtime"
        title="Generation monitor"
        description="Start or resume runs, then inspect spec inputs, run state, and generated episode outputs."
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
          <GenerationRunControlsPanel
            specPath={specPath}
            resumePath={resumePath}
            onSpecPathChange={onSpecPathChange}
            onResumePathChange={onResumePathChange}
            onStart={onStart}
            onResume={onResume}
          />

          <GenerationLogPanel
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

          <GenerationRunsPanel
            runs={runs}
            runsError={runsError}
            selectedRunId={selectedRunId}
            selectedRunLabel={selectedRunLabel}
            onSelectedRunChange={onSelectedRunChange}
          />
        </Stack>

        <Stack spacing={2}>
          <GenerationSpecPreviewPanel
            deferredSpecPath={deferredSpecPath}
            specPreviewPath={specPreview?.path ?? ""}
            specPreviewSchema={specPreview?.summary?.schema ?? "—"}
            specPreviewRunId={specPreview?.summary?.run_id ?? "—"}
            specPreviewOutputRoot={specPreview?.summary?.output_root ?? "—"}
            specPreviewSelection={
              [
                specPreview?.summary?.selection.qt,
                specPreview?.summary?.selection.case,
                specPreview?.summary?.selection.seed,
              ]
                .filter(Boolean)
                .join(" / ") || "—"
            }
            specPreviewBaseDate={specPreview?.summary?.base_date ?? "—"}
            specPreviewHome={specPreview?.summary?.home ?? { note: "No home preview." }}
            specPreviewLlm={specPreview?.summary?.llm ?? { note: "No llm preview." }}
            specPreviewYaml={specPreview?.raw_text ?? "Spec preview is unavailable."}
            specPreviewError={specPreviewError}
          />

          <GenerationRuntimePanel
            generationRunsDir={runtime?.generation_runs_dir ?? "Loading..."}
            exampleSpec={runtime?.gen_spec_example ?? "Loading..."}
            runtimeError={runtimeError}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
