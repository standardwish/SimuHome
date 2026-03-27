import { Button, Stack, TextField } from "@mui/material";

import type { EvaluationRunControlsPanelProps } from "@/types/evaluation/components";
import { Surface } from "@/ui";

export function EvaluationRunControlsPanel({
  specPath,
  resumePath,
  onSpecPathChange,
  onResumePathChange,
  onStart,
  onResume,
}: EvaluationRunControlsPanelProps) {
  return (
    <Surface title="Run controls" caption="Launch from a spec or resume an existing run path.">
      <Stack spacing={1.5}>
        <TextField
          label="Spec path"
          value={specPath}
          onChange={(event) => onSpecPathChange(event.target.value)}
        />
        <Button variant="contained" onClick={onStart}>
          Start evaluation
        </Button>
        <TextField
          label="Resume path"
          value={resumePath}
          onChange={(event) => onResumePathChange(event.target.value)}
        />
        <Button variant="outlined" onClick={onResume}>
          Resume run
        </Button>
      </Stack>
    </Surface>
  );
}
