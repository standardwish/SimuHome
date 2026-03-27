import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { ModelGroupAccordion } from "@/components/EvaluationRunDetail/ModelGroupAccordion";
import { RunDetailSummaryPanel } from "@/components/EvaluationRunDetail/RunDetailSummaryPanel";
import type { EvaluationRunDetailPresenterProps } from "@/types/pages/evaluationRunDetail";
import { PageIntro } from "@/ui";

export function EvaluationRunDetailPresenter({
  detail,
  error,
  runId,
}: EvaluationRunDetailPresenterProps) {
  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Evaluation detail"
        title="Run detail"
        description="Inspect model folders and artifact outcomes for the selected evaluation run."
        aside={
          <Button
            component={RouterLink}
            to="/evaluation"
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
          >
            Back to runs
          </Button>
        }
      />

      {error && <Alert severity="warning">{error}</Alert>}

      <RunDetailSummaryPanel detail={detail} runId={runId} />

      {(detail?.models ?? []).map((modelGroup) => (
        <ModelGroupAccordion key={modelGroup.model} modelGroup={modelGroup} />
      ))}
    </Stack>
  );
}
