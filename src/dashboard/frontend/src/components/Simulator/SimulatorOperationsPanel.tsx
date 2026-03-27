import {
  Alert,
  Box,
  Button,
  Divider,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { memo } from "react";

import type { SimulatorOperationsPanelProps } from "@/types/simulator/components";
import { Surface } from "@/ui";

export const SimulatorOperationsPanel = memo(function SimulatorOperationsPanel({
  bottomTab,
  tickInterval,
  fastForwardTick,
  history,
  workflows,
  onBottomTabChange,
  onTickIntervalChange,
  onFastForwardTickChange,
  onInitializeDemoHome,
  onUpdateInterval,
  onFastForward,
}: SimulatorOperationsPanelProps) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut", delay: 0.08 }}
    >
      <Surface
        title="Operations"
        caption="Controls, scheduled workflows, and recent requests stay docked below the plan."
      >
        <Tabs
          value={bottomTab}
          onChange={(_, next) => onBottomTabChange(next)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Control" value="control" />
          <Tab label="Workflows" value="workflows" />
          <Tab label="History" value="history" />
        </Tabs>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1.5, pt: 2 }}>
          {bottomTab === "control" && (
            <Stack spacing={1.5}>
              <Button variant="outlined" onClick={onInitializeDemoHome}>
                Initialize demo home
              </Button>
              <Box sx={{ px: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Tick interval
                </Typography>
                <Slider
                  aria-label="Tick interval"
                  value={tickInterval}
                  onChange={(_, value) => {
                    if (typeof value === "number") {
                      onTickIntervalChange(value);
                    }
                  }}
                  min={0.1}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 0.1, label: "0.1s" },
                    { value: 0.5, label: "0.5s" },
                    { value: 1, label: "1.0s" },
                    { value: 2, label: "2.0s" },
                  ]}
                  valueLabelDisplay="auto"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Current setting: {tickInterval.toFixed(1)}s
                </Typography>
              </Box>
              <Button variant="contained" onClick={onUpdateInterval}>
                Update interval
              </Button>
              <Divider />
              <TextField
                label="Fast-forward to tick"
                value={fastForwardTick}
                onChange={(event) => onFastForwardTickChange(event.target.value)}
              />
              <Button variant="contained" color="secondary" onClick={onFastForward}>
                Jump virtual time
              </Button>
            </Stack>
          )}

          {bottomTab === "workflows" && (
            <Stack spacing={0} sx={{ maxHeight: 260, overflowY: "auto" }}>
              {(workflows ?? []).slice(0, 12).map((workflow) => (
                <Box
                  key={workflow.workflow_id}
                  sx={{
                    py: 1.25,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{workflow.workflow_id}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workflow.status} · {workflow.current_step}/{workflow.total_steps}
                  </Typography>
                </Box>
              ))}
              {(workflows?.length ?? 0) === 0 && (
                <Typography color="text.secondary">No scheduled workflows.</Typography>
              )}
            </Stack>
          )}

          {bottomTab === "history" && (
            <Stack spacing={1} sx={{ maxHeight: 260, overflowY: "auto" }}>
              {history.map((entry, index) => (
                <Alert
                  key={`${entry.label}-${index}`}
                  severity={entry.status === "success" ? "success" : "error"}
                  variant="outlined"
                >
                  <strong>{entry.label}</strong>: {entry.detail}
                </Alert>
              ))}
              {history.length === 0 && (
                <Typography color="text.secondary">
                  Requests will appear here after execution.
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      </Surface>
    </Box>
  );
});
