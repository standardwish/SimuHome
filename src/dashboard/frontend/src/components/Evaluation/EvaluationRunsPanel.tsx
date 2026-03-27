import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import type { EvaluationRunsPanelProps } from "@/types/evaluation/components";
import { MetricStrip, Surface } from "@/ui";

export function EvaluationRunsPanel({
  runs,
  runsError,
  selectedRunId,
  selectedRunLabel,
  onSelectedRunChange,
}: EvaluationRunsPanelProps) {
  return (
    <Surface title="Complete runs" caption="Monitor summary files and open a full run detail page.">
      <Stack spacing={2}>
        <MetricStrip
          items={[
            {
              label: "Detected runs",
              value: String(runs.length),
              tone: "accent",
            },
            {
              label: "With summary",
              value: String(runs.filter((run) => run.has_summary).length),
            },
            {
              label: "Selected run",
              value: selectedRunLabel || selectedRunId || "—",
            },
          ]}
        />

        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          {runs.map((run) => (
            <Box
              key={run.run_id}
              onClick={() => onSelectedRunChange(run.run_id)}
              sx={{
                py: 1.5,
                px: 1,
                cursor: "pointer",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor:
                  selectedRunId === run.run_id ? "rgba(15, 118, 110, 0.08)" : "transparent",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{run.run_id}</Typography>
              <Typography color="text.secondary" sx={{ wordBreak: "break-all" }}>
                {run.path}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Summary: {run.has_summary ? "ready" : "missing"}
              </Typography>
              <Button
                component={RouterLink}
                to={`/evaluation/${run.run_id}`}
                size="small"
                variant="text"
                endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                sx={{ mt: 1, px: 0 }}
              >
                Open run detail
              </Button>
            </Box>
          ))}
          {runs.length === 0 && (
            <Box sx={{ py: 2 }}>
              <Typography color="text.secondary">No runs detected yet.</Typography>
            </Box>
          )}
        </Box>
        {runsError && <Alert severity="warning">{runsError}</Alert>}
      </Stack>
    </Surface>
  );
}
