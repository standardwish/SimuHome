import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from "@mui/material";

import type { ArtifactAccordionProps } from "../../types/evaluationRunDetail/components";
import { MonoBlock, RailList } from "../../ui";

function formatDuration(duration: number | null): string {
  if (typeof duration !== "number") {
    return "—";
  }
  return `${duration.toFixed(1)}s`;
}

export function ArtifactAccordion({ artifact }: ArtifactAccordionProps) {
  const judge = artifact.judge ?? [];
  const judgeErrorDetails = artifact.judge_error_details ?? [];
  const toolOutcomes = artifact.tools_invoked ?? [];
  const steps = artifact.steps ?? [];
  const requiredActions = artifact.required_actions ?? { total: 0, invoked: 0 };

  return (
    <Accordion
      disableGutters
      sx={{
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "rgba(255,255,255,0.52)",
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%", pr: 1 }}
        >
          <Box>
            <Typography variant="h6">{artifact.file_name}</Typography>
            <Typography color="text.secondary" sx={{ wordBreak: "break-all" }}>
              {artifact.file_path}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`score ${artifact.score ?? "—"}`} size="small" />
            <Chip
              label={artifact.error_type ?? "Passed"}
              size="small"
              color={artifact.error_type ? "warning" : "success"}
            />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <RailList
            items={[
              {
                label: "Query",
                value:
                  [artifact.query_type, artifact.case, String(artifact.seed ?? "—")]
                    .filter(Boolean)
                    .join(" / ") || "—",
              },
              {
                label: "Duration",
                value: formatDuration(artifact.duration),
              },
              {
                label: "Required actions",
                value: `${requiredActions.invoked} / ${requiredActions.total}`,
              },
              {
                label: "Judge",
                value: judge.join(" / ") || "—",
              },
            ]}
          />

          <MonoBlock
            label="Final answer"
            value={artifact.final_answer ?? "No final answer recorded."}
            maxHeight={180}
          />

          {judgeErrorDetails.length > 0 && (
            <MonoBlock label="Judge error detail" value={judgeErrorDetails.join("\n")} maxHeight={200} />
          )}

          <MonoBlock label="Tool outcomes" value={toolOutcomes} maxHeight={180} />

          {steps.length > 0 && (
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                pt: 1.25,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Step timeline
              </Typography>
              <Stack spacing={1.25}>
                {steps.map((step, index) => (
                  <Box
                    key={`${artifact.file_path}-step-${index}`}
                    sx={{
                      p: 1.25,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "rgba(17, 24, 39, 0.03)",
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip
                          label={`Step ${step.step ?? index + 1}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip label={step.action ?? "unknown"} size="small" />
                      </Stack>
                      {step.thought && (
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          Thought: {step.thought}
                        </Typography>
                      )}
                      <MonoBlock label="Action input" value={step.action_input ?? {}} maxHeight={120} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
