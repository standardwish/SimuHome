import { Alert, Stack } from "@mui/material";

import type { GenerationSpecPreviewPanelProps } from "@/types/generation/components";
import { MonoBlock, RailList, Surface } from "@/ui";

export function GenerationSpecPreviewPanel({
  deferredSpecPath,
  specPreviewPath,
  specPreviewSchema,
  specPreviewRunId,
  specPreviewOutputRoot,
  specPreviewSelection,
  specPreviewBaseDate,
  specPreviewHome,
  specPreviewLlm,
  specPreviewYaml,
  specPreviewError,
}: GenerationSpecPreviewPanelProps) {
  return (
    <Surface
      title="Spec preview"
      caption="Preview the current generation spec path before starting a run."
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
              label: "Output root",
              value: specPreviewOutputRoot,
            },
            {
              label: "Selection",
              value: specPreviewSelection,
            },
            {
              label: "Base date",
              value: specPreviewBaseDate,
            },
          ]}
        />
        <MonoBlock label="Home" value={specPreviewHome} maxHeight={180} />
        <MonoBlock label="LLM" value={specPreviewLlm} maxHeight={160} />
        <MonoBlock label="Spec YAML" value={specPreviewYaml} maxHeight={240} />
      </Stack>
    </Surface>
  );
}
