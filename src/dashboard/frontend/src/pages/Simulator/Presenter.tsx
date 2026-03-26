import { Alert, Box, Stack } from "@mui/material";
import { motion } from "framer-motion";

import { PageIntro } from "../../ui";
import type { SimulatorPresenterProps } from "../../types/pages/simulator";
import { LiveHomeSurface } from "../../components/Simulator/LiveHomeSurface";
import { SimulatorDeviceInspector } from "../../components/Simulator/SimulatorDeviceInspector";
import { SimulatorOperationsPanel } from "../../components/Simulator/SimulatorOperationsPanel";

export function SimulatorPresenter({
  home,
  workflows,
  homeError,
  workflowsError,
  roomEntries,
  selectedRoom,
  selectedDevice,
  hoveredRoomId,
  hoveredDeviceId,
  changedRoomIds,
  bottomTab,
  tickInterval,
  fastForwardTick,
  history,
  deviceStructure,
  deviceStructureError,
  deviceAttributes,
  deviceAttributesError,
  commandEndpointId,
  commandClusterId,
  commandId,
  commandArgs,
  onHoverRoom,
  onHoverDevice,
  onSelectRoom,
  onSelectDevice,
  onBottomTabChange,
  onTickIntervalChange,
  onFastForwardTickChange,
  onInitializeDemoHome,
  onUpdateInterval,
  onFastForward,
  onSelectedDeviceChange,
  onCommandEndpointChange,
  onCommandClusterChange,
  onCommandIdChange,
  onCommandArgsChange,
  onRunCommand,
}: SimulatorPresenterProps) {
  return (
    <Stack
      spacing={2}
      sx={{
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "-24px -24px auto",
          height: 240,
          pointerEvents: "none",
        },
      }}
    >
      <PageIntro
        eyebrow="Live simulator"
        title="Simulator workspace"
        description="Monitor the active home like an architectural control board. Health checks and dashboard polling run every 5 seconds."
      />

      {(homeError || workflowsError) && (
        <Alert severity="warning">{homeError ?? workflowsError}</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.08fr) 392px" },
          gap: { xs: 2, lg: 2.5 },
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <LiveHomeSurface
              currentTick={home?.current_tick}
              currentTime={home?.current_time}
              tickInterval={home?.tick_interval}
              roomEntries={roomEntries}
              selectedRoomId={selectedRoom?.roomId ?? null}
              selectedDeviceId={selectedDevice?.device_id ?? null}
              hoveredRoomId={hoveredRoomId}
              hoveredDeviceId={hoveredDeviceId}
              changedRoomIds={changedRoomIds}
              onHoverRoom={onHoverRoom}
              onHoverDevice={onHoverDevice}
              onSelectRoom={onSelectRoom}
              onSelectDevice={onSelectDevice}
            />
          </Box>

          <SimulatorOperationsPanel
            bottomTab={bottomTab}
            tickInterval={tickInterval}
            fastForwardTick={fastForwardTick}
            history={history}
            workflows={workflows}
            onBottomTabChange={onBottomTabChange}
            onTickIntervalChange={onTickIntervalChange}
            onFastForwardTickChange={onFastForwardTickChange}
            onInitializeDemoHome={onInitializeDemoHome}
            onUpdateInterval={onUpdateInterval}
            onFastForward={onFastForward}
          />
        </Stack>

        <Stack
          spacing={2}
          sx={{
            position: { lg: "sticky" },
            top: { lg: 88 },
            alignSelf: "start",
          }}
        >
          <SimulatorDeviceInspector
            selectedRoom={selectedRoom}
            selectedDevice={selectedDevice}
            deviceStructure={deviceStructure}
            deviceStructureError={deviceStructureError}
            deviceAttributes={deviceAttributes}
            deviceAttributesError={deviceAttributesError}
            commandEndpointId={commandEndpointId}
            commandClusterId={commandClusterId}
            commandId={commandId}
            commandArgs={commandArgs}
            onSelectedDeviceChange={onSelectedDeviceChange}
            onCommandEndpointChange={onCommandEndpointChange}
            onCommandClusterChange={onCommandClusterChange}
            onCommandIdChange={onCommandIdChange}
            onCommandArgsChange={onCommandArgsChange}
            onRunCommand={onRunCommand}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
