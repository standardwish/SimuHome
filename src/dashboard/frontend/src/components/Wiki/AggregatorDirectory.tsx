import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import type { AggregatorDirectoryProps } from "@/types/wiki/components";
import { Surface } from "@/ui";

export function AggregatorDirectory({
  aggregators,
  activeAggregatorType,
}: AggregatorDirectoryProps) {
  return (
    <Surface
      title="Aggregator list"
      caption={`${aggregators.length} environment aggregators registered in the simulator.`}
    >
      <Box>
        {aggregators.map((aggregator) => {
          const isActive = activeAggregatorType === aggregator.aggregator_type;
          return (
            <Box
              key={aggregator.aggregator_type}
              component={RouterLink}
              to={`/wiki/aggregators/${aggregator.aggregator_type}`}
              sx={{
                py: 1.25,
                px: 1,
                display: "block",
                color: "inherit",
                textDecoration: "none",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isActive ? "rgba(15, 118, 110, 0.08)" : "transparent",
                transition: "background-color 140ms ease",
                "&:hover": {
                  backgroundColor: isActive
                    ? "rgba(15, 118, 110, 0.12)"
                    : "rgba(17, 24, 39, 0.03)",
                },
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{aggregator.aggregator_type}</Typography>
              <Typography variant="body2" color="text.secondary">
                {aggregator.environment_signal} · {aggregator.unit} ·{" "}
                {aggregator.interested_device_types.length} device types
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {aggregator.summary}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}
