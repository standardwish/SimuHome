import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import { memo } from "react";

import type { SimulatorDeviceInspectorProps } from "@/types/simulator/components";
import { Surface } from "@/ui";
import { summarizeRoomState } from "@/components/Simulator/LiveHomeSurface";

const BLUEPRINT = "#10324a";

export const SimulatorDeviceInspector = memo(function SimulatorDeviceInspector({
  selectedRoom,
  selectedDevice,
  deviceStructure,
  deviceStructureError,
  deviceAttributes,
  deviceAttributesError,
  commandEndpointId,
  commandClusterId,
  commandId,
  commandArgs,
  onSelectedDeviceChange,
  onCommandEndpointChange,
  onCommandClusterChange,
  onCommandIdChange,
  onCommandArgsChange,
  onRunCommand,
}: SimulatorDeviceInspectorProps) {
  const selectedCommandCluster =
    (commandEndpointId &&
      commandClusterId &&
      deviceStructure?.endpoints?.[commandEndpointId]?.clusters?.[commandClusterId]) ||
    null;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, x: 22 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.38, ease: "easeOut", delay: 0.04 }}
    >
      <Surface
        title="Device inspector"
        caption={
          selectedDevice
            ? "Select commands and inspect live attributes without leaving the floor plan."
            : "Choose a room or device to inspect live structure and controls."
        }
      >
        <Stack
          spacing={2}
          sx={{
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: "-10px -10px auto",
              height: 120,
              pointerEvents: "none",
            },
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Selected room
            </Typography>
            <Typography variant="h6">{selectedRoom?.label ?? "No room selected"}</Typography>
          </Box>

          {selectedRoom && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {summarizeRoomState(selectedRoom.state).map((item) => (
                <Chip
                  key={item.label}
                  label={`${item.label}: ${item.value}`}
                  variant="outlined"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.58)",
                    borderColor: alpha(BLUEPRINT, 0.14),
                  }}
                />
              ))}
            </Stack>
          )}

          <Divider />

          <Box>
            <Typography variant="body2" color="text.secondary">
              Selected device
            </Typography>
            <Typography variant="h6">
              {selectedDevice?.device_id ?? "No device selected"}
            </Typography>
          </Box>

          {selectedRoom && selectedRoom.devices.length > 0 && (
            <FormControl fullWidth>
              <InputLabel id="simulator-device-picker-label">Device</InputLabel>
              <Select
                labelId="simulator-device-picker-label"
                label="Device"
                value={selectedDevice?.device_id ?? ""}
                onChange={(event) => onSelectedDeviceChange(String(event.target.value))}
              >
                {selectedRoom.devices.map((device) => (
                  <MenuItem key={device.device_id} value={device.device_id}>
                    {device.device_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(deviceStructureError || deviceAttributesError) && (
            <Alert severity="warning">{deviceStructureError ?? deviceAttributesError}</Alert>
          )}

          {!selectedDevice && (
            <Typography color="text.secondary">
              Select a device marker to open structure, command controls, and live attributes.
            </Typography>
          )}

          {selectedDevice && (
            <>
              <Divider />
              <Typography variant="subtitle1">Send command</Typography>
              <Stack
                spacing={1.25}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: alpha(BLUEPRINT, 0.1),
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.74), rgba(244,248,251,0.9))",
                }}
              >
                <FormControl fullWidth>
                  <InputLabel id="command-endpoint-label">Endpoint</InputLabel>
                  <Select
                    labelId="command-endpoint-label"
                    label="Endpoint"
                    value={commandEndpointId}
                    onChange={(event) => onCommandEndpointChange(String(event.target.value))}
                  >
                    {Object.keys(deviceStructure?.endpoints ?? {}).map((endpointId) => (
                      <MenuItem key={endpointId} value={endpointId}>
                        Endpoint {endpointId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="command-cluster-label">Cluster</InputLabel>
                  <Select
                    labelId="command-cluster-label"
                    label="Cluster"
                    value={commandClusterId}
                    onChange={(event) => onCommandClusterChange(String(event.target.value))}
                  >
                    {Object.entries(deviceStructure?.endpoints?.[commandEndpointId]?.clusters ?? {})
                      .filter(([, cluster]) => cluster.commands.length > 0)
                      .map(([clusterId]) => (
                        <MenuItem key={clusterId} value={clusterId}>
                          {clusterId}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="command-name-label">Command</InputLabel>
                  <Select
                    labelId="command-name-label"
                    label="Command"
                    value={commandId}
                    onChange={(event) => onCommandIdChange(String(event.target.value))}
                  >
                    {(selectedCommandCluster?.commands ?? []).map((entry) => (
                      <MenuItem key={entry} value={entry}>
                        {entry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Command args (JSON)"
                  value={commandArgs}
                  onChange={(event) => onCommandArgsChange(event.target.value)}
                  multiline
                  minRows={3}
                />
                <Button variant="contained" onClick={onRunCommand} disabled={!commandId}>
                  Run command
                </Button>
              </Stack>

              <Divider />
              <Typography variant="subtitle1">Attributes</Typography>
              <Stack spacing={1}>
                {Object.entries(deviceAttributes ?? {}).map(([path, value]) => (
                  <Box
                    key={path}
                    sx={{
                      p: 1.25,
                      border: "1px solid",
                      borderColor: alpha(BLUEPRINT, 0.1),
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.76), rgba(247,250,252,0.92))",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {path}
                    </Typography>
                    <Typography sx={{ wordBreak: "break-word" }}>
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </Typography>
                  </Box>
                ))}
                {Object.keys(deviceAttributes ?? {}).length === 0 && (
                  <Typography color="text.secondary">
                    No live attributes available for this device yet.
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Surface>
    </Box>
  );
});
