import type { EvaluationRunDetail } from "../../api";

export type EvaluationRunDetailPresenterProps = {
  detail: EvaluationRunDetail | null;
  error: string | null;
  runId: string | undefined;
};
