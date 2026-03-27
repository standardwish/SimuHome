import { useParams } from "react-router-dom";

import { EvaluationRunDetail, useDashboardQuery } from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import { EvaluationRunDetailPresenter } from "@/pages/EvaluationRunDetail/Presenter";

export function EvaluationRunDetailContainer() {
  const { runId } = useParams();
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const detail = useDashboardQuery<EvaluationRunDetail>(
    `/api/local/evaluations/runs/${runId}/detail`,
    {
      enabled: apiHealthy && Boolean(runId),
    },
  );

  return <EvaluationRunDetailPresenter detail={detail.data} error={detail.error} runId={runId} />;
}
