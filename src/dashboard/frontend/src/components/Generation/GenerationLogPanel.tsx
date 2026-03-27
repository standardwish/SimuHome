import { Alert, Stack } from "@mui/material";

import type { GenerationLogPanelProps } from "@/types/generation/components";
import { MonoBlock, RailList, Surface } from "@/ui";

export function GenerationLogPanel({
  selectedRunId,
  selectedRunLabel,
  logPath,
  logTail,
  error,
}: GenerationLogPanelProps) {
  return (
    <Surface title="Log" caption="Real-time content of the selected generation run log.">
      <Stack spacing={1.5}>
        <RailList
          items={[
            {
              label: "Selected run",
              value: selectedRunLabel || selectedRunId || "No run selected",
            },
            {
              label: "Log path",
              value: logPath,
            },
          ]}
        />
        {error && <Alert severity="warning">{error}</Alert>}
        <MonoBlock label="Tail" value={logTail} maxHeight={320} />
      </Stack>
    </Surface>
  );
}
