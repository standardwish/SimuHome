import type { EvaluationRunDetail } from "../../api";

export type RunDetailSummaryPanelProps = {
  detail: EvaluationRunDetail | null;
  runId: string | undefined;
};

export type ModelGroupAccordionProps = {
  modelGroup: EvaluationRunDetail["models"][number];
};

export type ArtifactAccordionProps = {
  artifact: EvaluationRunDetail["models"][number]["artifacts"][number];
};
