import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import type { WikiAggregatorOverviewPanelProps } from "@/types/wiki/components";
import { MetricStrip, RailList, Surface } from "@/ui";

export function WikiAggregatorOverviewPanel({
  aggregatorDetail,
  aggregatorSummary,
}: WikiAggregatorOverviewPanelProps) {
  return (
    <Surface
      title="Aggregator overview"
      caption="Registry metadata and implementation details for the selected environment aggregator."
      aside={
        <Button
          component={RouterLink}
          to="/wiki/aggregators"
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon />}
        >
          Back to aggregator list
        </Button>
      }
    >
      <Stack spacing={2}>
        <MetricStrip
          items={[
            {
              label: "Environment signal",
              value: aggregatorDetail?.environment_signal ?? "—",
              tone: "accent",
            },
            {
              label: "Unit",
              value: aggregatorDetail?.unit ?? "—",
            },
            {
              label: "Affected devices",
              value: String(aggregatorSummary?.interested_device_types.length ?? 0),
            },
          ]}
        />

        <RailList
          items={[
            {
              label: "Summary",
              value: aggregatorDetail?.summary ?? aggregatorSummary?.summary ?? "—",
            },
            {
              label: "Baseline",
              value: aggregatorDetail ? String(aggregatorDetail.baseline_value) : "—",
            },
            {
              label: "Default current",
              value: aggregatorDetail ? String(aggregatorDetail.current_value) : "—",
            },
            {
              label: "Affected device types",
              value: aggregatorDetail?.interested_device_types.join(", ") ?? "—",
            },
            {
              label: "Class",
              value: aggregatorDetail?.implementation.class_name ?? "—",
            },
            {
              label: "Module",
              value: aggregatorDetail?.implementation.module ?? "—",
            },
          ]}
        />
      </Stack>
    </Surface>
  );
}
