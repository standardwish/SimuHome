import { Alert, Stack, Typography } from "@mui/material";

import type { ExecutionHistoryPanelProps } from "../../types/apiExplorer/components";
import { Surface } from "../../ui";

export function ExecutionHistoryPanel({ history }: ExecutionHistoryPanelProps) {
  return (
    <Surface title="Execution history" caption="Recent manual calls and failure messages.">
      <Stack spacing={1}>
        {history.map((entry, index) => (
          <Alert
            key={`${entry.method}-${entry.path}-${index}`}
            severity={entry.status === "success" ? "success" : "error"}
            variant="outlined"
          >
            <strong>
              {entry.method} {entry.path}
            </strong>
            <br />
            {entry.detail}
          </Alert>
        ))}
        {history.length === 0 && (
          <Typography color="text.secondary">
            Explorer executions will be recorded here.
          </Typography>
        )}
      </Stack>
    </Surface>
  );
}
