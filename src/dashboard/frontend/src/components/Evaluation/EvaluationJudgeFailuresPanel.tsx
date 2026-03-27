import { Alert, Stack, Typography } from "@mui/material";

import type { EvaluationJudgeFailuresPanelProps } from "@/types/evaluation/components";
import { MonoBlock, Surface } from "@/ui";

export function EvaluationJudgeFailuresPanel({ failures }: EvaluationJudgeFailuresPanelProps) {
  if (failures.length === 0) {
    return null;
  }

  return (
    <Surface
      title="Judge failures"
      caption="Artifact-level judge errors detected for the selected run."
    >
      <Stack spacing={1.5}>
        {failures.map((failure) => (
          <Alert
            key={failure.artifact_path}
            severity="warning"
            sx={{ alignItems: "flex-start" }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {failure.model} / {failure.artifact}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-all", mt: 0.5 }}>
              {failure.artifact_path}
            </Typography>
            <MonoBlock
              label="Reason"
              value={
                failure.details.length
                  ? failure.details.join("\n")
                  : "Judge call failed without a recorded detail."
              }
              maxHeight={180}
            />
          </Alert>
        ))}
      </Stack>
    </Surface>
  );
}
