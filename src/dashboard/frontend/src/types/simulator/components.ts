import type { DeviceAttributes, DeviceStructure, WorkflowList } from "../../api";
import type {
  RequestEntry,
  RoomDeviceViewModel,
  RoomViewModel,
  SimulatorBottomTab,
} from "./models";

export type RoomLayout = {
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TreemapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LiveHomeSurfaceProps = {
  currentTick?: number;
  currentTime?: string;
  tickInterval?: number;
  roomEntries: RoomViewModel[];
  selectedRoomId: string | null;
  selectedDeviceId: string | null;
  hoveredRoomId: string | null;
  hoveredDeviceId: string | null;
  changedRoomIds: string[];
  onHoverRoom: (roomId: string | null) => void;
  onHoverDevice: (deviceId: string | null) => void;
  onSelectRoom: (roomId: string, deviceId: string | null) => void;
  onSelectDevice: (roomId: string, deviceId: string) => void;
};

export type SimulatorDeviceInspectorProps = {
  selectedRoom: RoomViewModel | null;
  selectedDevice: RoomDeviceViewModel | null;
  deviceStructure: DeviceStructure | null;
  deviceStructureError: string | null;
  deviceAttributes: DeviceAttributes | null;
  deviceAttributesError: string | null;
  commandEndpointId: string;
  commandClusterId: string;
  commandId: string;
  commandArgs: string;
  onSelectedDeviceChange: (deviceId: string) => void;
  onCommandEndpointChange: (value: string) => void;
  onCommandClusterChange: (value: string) => void;
  onCommandIdChange: (value: string) => void;
  onCommandArgsChange: (value: string) => void;
  onRunCommand: () => void;
};

export type SimulatorOperationsPanelProps = {
  bottomTab: SimulatorBottomTab;
  tickInterval: number;
  fastForwardTick: string;
  history: RequestEntry[];
  workflows: WorkflowList | null;
  onBottomTabChange: (next: SimulatorBottomTab) => void;
  onTickIntervalChange: (value: number) => void;
  onFastForwardTickChange: (value: string) => void;
  onInitializeDemoHome: () => void;
  onUpdateInterval: () => void;
  onFastForward: () => void;
};
