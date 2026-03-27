import type { RunDetailSummaryPanelProps } from "@/types/evaluationRunDetail/components";
import { MetricStrip, Surface } from "@/ui";

export function RunDetailSummaryPanel({ detail, runId }: RunDetailSummaryPanelProps) {
  return (
    <Surface title={detail?.run_id ?? runId ?? "Run"} caption={detail?.path ?? "Loading run detail..."}>
      <MetricStrip
        items={[
          {
            label: "Total",
            value: String(detail?.summary.total ?? 0),
            tone: "accent",
          },
          {
            label: "Success",
            value: String(detail?.summary.success ?? 0),
          },
          {
            label: "Failed",
            value: String(detail?.summary.failed ?? 0),
          },
          {
            label: "Pending",
            value: String(detail?.summary.pending ?? 0),
          },
        ]}
      />
    </Surface>
  );
}
