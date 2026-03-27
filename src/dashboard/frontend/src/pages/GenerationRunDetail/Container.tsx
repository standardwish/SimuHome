import { useParams } from "react-router-dom";

import { GenerationRunDetail, useDashboardQuery } from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import { GenerationRunDetailPresenter } from "@/pages/GenerationRunDetail/Presenter";

export function GenerationRunDetailContainer() {
  const { runId } = useParams();
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const detail = useDashboardQuery<GenerationRunDetail>(
    `/api/local/generations/runs/${runId}/detail`,
    {
      enabled: apiHealthy && Boolean(runId),
    },
  );

  return <GenerationRunDetailPresenter detail={detail.data} error={detail.error} runId={runId} />;
}
