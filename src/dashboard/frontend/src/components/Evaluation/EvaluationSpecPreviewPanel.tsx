import { Alert, Stack } from "@mui/material";

import type { EvaluationSpecPreviewPanelProps } from "@/types/evaluation/components";
import { MonoBlock, RailList, Surface } from "@/ui";

export function EvaluationSpecPreviewPanel({
  deferredSpecPath,
  specPreviewPath,
  specPreviewSchema,
  specPreviewRunId,
  specPreviewEpisodeDir,
  specPreviewSelection,
  specPreviewStrategy,
  specPreviewModels,
  specPreviewYaml,
  specPreviewError,
}: EvaluationSpecPreviewPanelProps) {
  return (
    <Surface
      title="Spec preview"
      caption="Preview the current evaluation spec path before starting a run."
    >
      <Stack spacing={1.5}>
        {specPreviewError && <Alert severity="warning">{specPreviewError}</Alert>}
        <RailList
          items={[
            {
              label: "Path",
              value: specPreviewPath || deferredSpecPath || "—",
            },
            {
              label: "Schema",
              value: specPreviewSchema,
            },
            {
              label: "Run id",
              value: specPreviewRunId,
            },
            {
              label: "Episode dir",
              value: specPreviewEpisodeDir,
            },
            {
              label: "Selection",
              value: specPreviewSelection,
            },
          ]}
        />
        <MonoBlock label="Strategy" value={specPreviewStrategy} maxHeight={140} />
        <MonoBlock label="Models" value={specPreviewModels} maxHeight={180} />
        <MonoBlock label="Spec YAML" value={specPreviewYaml} maxHeight={240} />
      </Stack>
    </Surface>
  );
}
