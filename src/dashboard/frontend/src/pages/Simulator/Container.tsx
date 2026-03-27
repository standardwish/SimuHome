import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DeviceAttributes, DeviceStructure, HomeState, WorkflowList, requestApi, useDashboardQuery } from "@/api";
import { normalizeRooms } from "@/components/Simulator/LiveHomeSurface";
import { useDashboardRuntimeStore } from "@/store";
import { RequestEntry, SimulatorBottomTab } from "@/types/simulator/models";
import { SimulatorPresenter } from "@/pages/Simulator/Presenter";

const DEMO_RESET_CONFIG = {
  tick_interval: 0.5,
  enable_aggregators: true,
  fast_forward: false,
  base_time: "2026-03-26 00:00:00",
  rooms: {
    living_room: {
      state: {
        temperature: 2250,
        illuminance: 420,
        humidity: 4200,
        pm10: 12,
      },
      devices: [{ device_id: "living_room_light_1", device_type: "on_off_light" }],
    },
    kitchen: {
      state: {
        temperature: 2150,
        illuminance: 360,
        humidity: 3900,
        pm10: 10,
      },
      devices: [{ device_id: "kitchen_light_1", device_type: "on_off_light" }],
    },
    bathroom: {
      state: {
        temperature: 2350,
        illuminance: 180,
        humidity: 4800,
        pm10: 8,
      },
      devices: [{ device_id: "bathroom_light_1", device_type: "on_off_light" }],
    },
    utility_room: {
      state: {
        temperature: 2200,
        illuminance: 680,
        humidity: 3500,
        pm10: 14,
      },
      devices: [{ device_id: "utility_room_light_1", device_type: "on_off_light" }],
    },
  },
};

function parseJsonInput(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export function SimulatorContainer() {
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const pollingIntervalMs = useDashboardRuntimeStore((state) => state.pollingIntervalMs);
  const home = useDashboardQuery<HomeState>("/api/home/state", {
    intervalMs: pollingIntervalMs,
    enabled: apiHealthy,
  });
  const workflows = useDashboardQuery<WorkflowList>("/api/schedule/workflows", {
    intervalMs: pollingIntervalMs,
    enabled: apiHealthy,
  });
  const [tickInterval, setTickInterval] = useState(0.5);
  const [fastForwardTick, setFastForwardTick] = useState("12");
  const [history, setHistory] = useState<RequestEntry[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<SimulatorBottomTab>("control");
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
  const [changedRoomIds, setChangedRoomIds] = useState<string[]>([]);
  const [commandEndpointId, setCommandEndpointId] = useState("");
  const [commandClusterId, setCommandClusterId] = useState("");
  const [commandId, setCommandId] = useState("");
  const [commandArgs, setCommandArgs] = useState("{}");
  const previousRoomsRef = useRef<Record<string, string>>({});

  const roomEntries = useMemo(() => normalizeRooms(home.data), [home.data]);
  const selectedRoom =
    roomEntries.find((room) => room.roomId === selectedRoomId) ?? roomEntries[0] ?? null;
  const selectedDevice =
    selectedRoom?.devices.find((device) => device.device_id === selectedDeviceId) ??
    roomEntries.flatMap((room) => room.devices).find((device) => device.device_id === selectedDeviceId) ??
    selectedRoom?.devices[0] ??
    null;

  const deviceStructure = useDashboardQuery<DeviceStructure>(
    selectedDevice ? `/api/devices/${selectedDevice.device_id}/structure` : "/api/devices/__none__/structure",
    {
      intervalMs: 0,
      enabled: apiHealthy && Boolean(selectedDevice),
    },
  );
  const deviceAttributes = useDashboardQuery<DeviceAttributes>(
    selectedDevice ? `/api/devices/${selectedDevice.device_id}/attributes` : "/api/devices/__none__/attributes",
    {
      intervalMs: pollingIntervalMs,
      enabled: apiHealthy && Boolean(selectedDevice),
    },
  );

  useEffect(() => {
    if (typeof home.data?.tick_interval === "number") {
      setTickInterval(home.data.tick_interval);
    }
  }, [home.data?.tick_interval]);

  useEffect(() => {
    if (roomEntries.length === 0) {
      setSelectedRoomId(null);
      setSelectedDeviceId(null);
      return;
    }
    if (!selectedRoomId || !roomEntries.some((room) => room.roomId === selectedRoomId)) {
      setSelectedRoomId(roomEntries[0].roomId);
    }
  }, [roomEntries, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom) {
      setSelectedDeviceId(null);
      return;
    }
    if (
      !selectedDeviceId ||
      !selectedRoom.devices.some((device) => device.device_id === selectedDeviceId)
    ) {
      setSelectedDeviceId(selectedRoom.devices[0]?.device_id ?? null);
    }
  }, [selectedRoom, selectedDeviceId]);

  useEffect(() => {
    const next = Object.fromEntries(
      roomEntries.map((room) => [room.roomId, JSON.stringify({ state: room.state, devices: room.devices })]),
    );
    const changed = roomEntries
      .filter((room) => {
        const previous = previousRoomsRef.current[room.roomId];
        return previous !== undefined && previous !== next[room.roomId];
      })
      .map((room) => room.roomId);
    previousRoomsRef.current = next;
    if (changed.length === 0) {
      return;
    }
    setChangedRoomIds(changed);
    const timer = window.setTimeout(() => setChangedRoomIds([]), 1400);
    return () => window.clearTimeout(timer);
  }, [roomEntries]);

  useEffect(() => {
    const endpoints = Object.entries(deviceStructure.data?.endpoints ?? {});
    if (endpoints.length === 0) {
      setCommandEndpointId("");
      setCommandClusterId("");
      setCommandId("");
      return;
    }

    const firstEndpointId = endpoints[0][0];
    const firstCommandClusterEntry = Object.entries(endpoints[0][1].clusters ?? {}).find(
      ([, cluster]) => (cluster.commands?.length ?? 0) > 0,
    );
    if (firstCommandClusterEntry) {
      setCommandEndpointId(firstEndpointId);
      setCommandClusterId(firstCommandClusterEntry[0]);
      setCommandId(firstCommandClusterEntry[1].commands[0] ?? "");
    } else {
      setCommandEndpointId(firstEndpointId);
      setCommandClusterId("");
      setCommandId("");
    }
    setCommandArgs("{}");
  }, [selectedDevice?.device_id, deviceStructure.data]);

  useEffect(() => {
    const clusters = deviceStructure.data?.endpoints?.[commandEndpointId]?.clusters ?? {};
    const cluster = commandClusterId ? clusters[commandClusterId] : null;
    if (!cluster && Object.keys(clusters).length > 0) {
      const firstEntry = Object.entries(clusters).find(([, candidate]) => candidate.commands.length > 0);
      if (firstEntry) {
        setCommandClusterId(firstEntry[0]);
        setCommandId(firstEntry[1].commands[0] ?? "");
      }
      return;
    }
    if (cluster && !cluster.commands.includes(commandId)) {
      setCommandId(cluster.commands[0] ?? "");
    }
  }, [commandEndpointId, commandClusterId, commandId, deviceStructure.data]);

  const submit = useCallback(async (label: string, path: string, body: Record<string, unknown>) => {
    try {
      await requestApi(path, { method: "POST", body: JSON.stringify(body) });
      setHistory((current) => [
        { label, status: "success", detail: JSON.stringify(body) },
        ...current,
      ]);
      await Promise.all([home.refresh(), workflows.refresh(), deviceStructure.refresh(), deviceAttributes.refresh()]);
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
  }, [deviceAttributes, deviceStructure, home, workflows]);

  const handleRunCommand = useCallback(async () => {
    if (!selectedDevice || !commandEndpointId || !commandClusterId || !commandId) {
      return;
    }
    const parsed = parseJsonInput(commandArgs);
    if (!parsed.ok) {
      setHistory((current) => [
        { label: "Run command", status: "error", detail: parsed.error },
        ...current,
      ]);
      return;
    }
    await submit(`Run ${commandId}`, `/api/devices/${selectedDevice.device_id}/commands`, {
      endpoint_id: Number(commandEndpointId),
      cluster_id: commandClusterId,
      command_id: commandId,
      args: parsed.value,
    });
  }, [commandArgs, commandClusterId, commandEndpointId, commandId, selectedDevice, submit]);

  const handleSelectRoom = useCallback((roomId: string, deviceId: string | null) => {
    setSelectedRoomId(roomId);
    setSelectedDeviceId(deviceId);
  }, []);

  const handleSelectDevice = useCallback((roomId: string, deviceId: string) => {
    setSelectedRoomId(roomId);
    setSelectedDeviceId(deviceId);
  }, []);

  const handleInitializeDemoHome = useCallback(() => {
    void submit("Initialize demo home", "/api/simulation/reset", DEMO_RESET_CONFIG);
  }, [submit]);

  const handleUpdateInterval = useCallback(() => {
    void submit("Set tick interval", "/api/simulation/tick_interval", {
      tick_interval: tickInterval,
    });
  }, [submit, tickInterval]);

  const handleFastForward = useCallback(() => {
    void submit("Fast-forward", "/api/simulation/fast_forward_to", {
      to_tick: Number(fastForwardTick),
    });
  }, [fastForwardTick, submit]);

  return (
    <SimulatorPresenter
      home={home.data}
      workflows={workflows.data}
      homeError={home.error}
      workflowsError={workflows.error}
      roomEntries={roomEntries}
      selectedRoom={selectedRoom}
      selectedDevice={selectedDevice}
      hoveredRoomId={hoveredRoomId}
      hoveredDeviceId={hoveredDeviceId}
      changedRoomIds={changedRoomIds}
      bottomTab={bottomTab}
      tickInterval={tickInterval}
      fastForwardTick={fastForwardTick}
      history={history}
      deviceStructure={deviceStructure.data}
      deviceStructureError={deviceStructure.error}
      deviceAttributes={deviceAttributes.data}
      deviceAttributesError={deviceAttributes.error}
      commandEndpointId={commandEndpointId}
      commandClusterId={commandClusterId}
      commandId={commandId}
      commandArgs={commandArgs}
      onHoverRoom={setHoveredRoomId}
      onHoverDevice={setHoveredDeviceId}
      onSelectRoom={handleSelectRoom}
      onSelectDevice={handleSelectDevice}
      onBottomTabChange={setBottomTab}
      onTickIntervalChange={setTickInterval}
      onFastForwardTickChange={setFastForwardTick}
      onInitializeDemoHome={handleInitializeDemoHome}
      onUpdateInterval={handleUpdateInterval}
      onFastForward={handleFastForward}
      onSelectedDeviceChange={setSelectedDeviceId}
      onCommandEndpointChange={setCommandEndpointId}
      onCommandClusterChange={setCommandClusterId}
      onCommandIdChange={setCommandId}
      onCommandArgsChange={setCommandArgs}
      onRunCommand={() => void handleRunCommand()}
    />
  );
}
