import {
  Alert,
  Box,
  Button,
  Divider,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { HomeState, WorkflowList, requestApi, useDashboardQuery } from "./api";
import { MetricStrip, PageIntro, Surface } from "./ui";

type RequestEntry = {
  label: string;
  status: "success" | "error";
  detail: string;
};

export function SimulatorPage() {
  const home = useDashboardQuery<HomeState>("/api/home/state", { intervalMs: 1000 });
  const workflows = useDashboardQuery<WorkflowList>("/api/schedule/workflows", {
    intervalMs: 1200,
  });
  const [tickInterval, setTickInterval] = useState(0.5);
  const [fastForwardTick, setFastForwardTick] = useState("12");
  const [history, setHistory] = useState<RequestEntry[]>([]);

  const roomEntries = useMemo(
    () => Object.entries(home.data?.rooms ?? {}),
    [home.data?.rooms],
  );

  useEffect(() => {
    if (typeof home.data?.tick_interval === "number") {
      setTickInterval(home.data.tick_interval);
    }
  }, [home.data?.tick_interval]);

  async function submit(label: string, path: string, body: Record<string, unknown>) {
    try {
      await requestApi(path, { method: "POST", body: JSON.stringify(body) });
      setHistory((current) => [
        { label, status: "success", detail: JSON.stringify(body) },
        ...current,
      ]);
      await Promise.all([home.refresh(), workflows.refresh()]);
    } catch (error) {
      setHistory((current) => [
        {
          label,
          status: "error",
          detail: error instanceof Error ? error.message : "Request failed",
        },
        ...current,
      ]);
    }
  }

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Live simulator"
        title="Simulator workspace"
        description="Drive the running home, watch room state update in place, and keep operator actions close to the live snapshot."
      />

      {(home.error || workflows.error) && (
        <Alert severity="warning">{home.error ?? workflows.error}</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) 360px" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Surface
            title="Live home"
            caption="This surface is the primary workspace. It reflects the simulator as it moves."
          >
            <Stack spacing={2}>
              <MetricStrip
                items={[
                  {
                    label: "Current tick",
                    value: String(home.data?.current_tick ?? "—"),
                    tone: "accent",
                  },
                  { label: "Virtual time", value: home.data?.current_time ?? "—" },
                  {
                    label: "Tick interval",
                    value: String(home.data?.tick_interval ?? "—"),
                  },
                  { label: "Rooms", value: String(roomEntries.length) },
                ]}
              />

              <Box
                data-testid="live-home-snapshot-viewport"
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
              >
                {roomEntries.map(([roomId, room]) => (
                  <Box
                    key={roomId}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
                      gap: 2,
                      py: 1.75,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{roomId}</Typography>
                      <Typography color="text.secondary">
                        {Object.keys(room.state ?? {}).length} state values
                      </Typography>
                      <Typography color="text.secondary">
                        {room.devices?.length ?? 0} devices
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        Environment state
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                          gap: 1,
                        }}
                      >
                        {Object.entries(room.state ?? {}).map(([key, value]) => (
                          <Box
                            key={key}
                            sx={{
                              px: 1.25,
                              py: 1,
                              borderLeft: "3px solid",
                              borderColor: "primary.main",
                              backgroundColor: "rgba(255, 255, 255, 0.52)",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {key}
                            </Typography>
                            <Typography>{String(value)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                ))}

                {roomEntries.length === 0 && (
                  <Box sx={{ py: 2 }}>
                    <Typography color="text.secondary">
                      No rooms are available in the current snapshot.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          </Surface>
        </Stack>

        <Stack spacing={2}>
          <Surface
            title="Control rail"
            caption="Short actions only. Keep longer investigation in the main workspace."
          >
            <Stack spacing={1.5}>
              <Box sx={{ px: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Tick interval
                </Typography>
                <Slider
                  aria-label="Tick interval"
                  value={tickInterval}
                  onChange={(_, value) => {
                    if (typeof value === "number") {
                      setTickInterval(value);
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
              <Button
                variant="contained"
                onClick={() =>
                  submit("Set tick interval", "/api/simulation/tick_interval", {
                    tick_interval: tickInterval,
                  })
                }
              >
                Update interval
              </Button>
              <Divider />
              <TextField
                label="Fast-forward to tick"
                value={fastForwardTick}
                onChange={(event) => setFastForwardTick(event.target.value)}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={() =>
                  submit("Fast-forward", "/api/simulation/fast_forward_to", {
                    to_tick: Number(fastForwardTick),
                  })
                }
              >
                Jump virtual time
              </Button>
            </Stack>
          </Surface>

          <Surface
            title="Workflow monitor"
            caption="Scheduled sequences and their current step."
          >
            <Stack spacing={0}>
              {(workflows.data ?? []).slice(0, 6).map((workflow) => (
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
              {(workflows.data?.length ?? 0) === 0 && (
                <Typography color="text.secondary">No scheduled workflows.</Typography>
              )}
            </Stack>
          </Surface>

          <Surface title="Request history" caption="Recent operator actions and failures.">
            <Stack spacing={1}>
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
          </Surface>
        </Stack>
      </Box>
    </Stack>
  );
}
