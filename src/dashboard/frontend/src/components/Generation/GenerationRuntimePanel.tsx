import { Alert, Stack } from "@mui/material";

import type { GenerationRuntimePanelProps } from "@/types/generation/components";
import { RailList, Surface } from "@/ui";

export function GenerationRuntimePanel({
  generationRunsDir,
  exampleSpec,
  runtimeError,
}: GenerationRuntimePanelProps) {
  return (
    <Surface title="Runtime config" caption="Local path context used by the generation worker.">
      <Stack spacing={1.5}>
        <RailList
          items={[
            {
              label: "Runs dir",
              value: generationRunsDir,
            },
            {
              label: "Example spec",
              value: exampleSpec,
            },
          ]}
        />
        {runtimeError && <Alert severity="warning">{runtimeError}</Alert>}
      </Stack>
    </Surface>
  );
}
