import { Alert, Stack } from "@mui/material";

import type { EvaluationRuntimePanelProps } from "../../types/evaluation/components";
import { RailList, Surface } from "../../ui";

export function EvaluationRuntimePanel({
  experimentsDir,
  exampleSpec,
  runtimeError,
}: EvaluationRuntimePanelProps) {
  return (
    <Surface title="Runtime config" caption="Local path context used by the backend worker.">
      <Stack spacing={1.5}>
        <RailList
          items={[
            {
              label: "Experiments dir",
              value: experimentsDir,
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
