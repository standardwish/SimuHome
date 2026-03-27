import { Button, Stack, TextField } from "@mui/material";

import type { GenerationRunControlsPanelProps } from "@/types/generation/components";
import { Surface } from "@/ui";

export function GenerationRunControlsPanel({
  specPath,
  resumePath,
  onSpecPathChange,
  onResumePathChange,
  onStart,
  onResume,
}: GenerationRunControlsPanelProps) {
  return (
    <Surface title="Run controls" caption="Launch from a spec or resume an existing generation run path.">
      <Stack spacing={1.5}>
        <TextField
          label="Spec path"
          value={specPath}
          onChange={(event) => onSpecPathChange(event.target.value)}
        />
        <Button variant="contained" onClick={onStart}>
          Start generation
        </Button>
        <TextField
          label="Resume path"
          value={resumePath}
          onChange={(event) => onResumePathChange(event.target.value)}
        />
        <Button variant="outlined" onClick={onResume}>
          Resume generation
        </Button>
      </Stack>
    </Surface>
  );
}
