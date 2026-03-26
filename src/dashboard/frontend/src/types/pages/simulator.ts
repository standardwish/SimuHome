import type {
  DeviceAttributes,
  DeviceStructure,
  HomeState,
  WorkflowList,
} from "../../api";
import type { RequestEntry, RoomDeviceViewModel, RoomViewModel, SimulatorBottomTab } from "../simulator/models";

export type SimulatorPresenterProps = {
  home: HomeState | null;
  workflows: WorkflowList | null;
  homeError: string | null;
  workflowsError: string | null;
  roomEntries: RoomViewModel[];
  selectedRoom: RoomViewModel | null;
  selectedDevice: RoomDeviceViewModel | null;
  hoveredRoomId: string | null;
  hoveredDeviceId: string | null;
  changedRoomIds: string[];
  bottomTab: SimulatorBottomTab;
  tickInterval: number;
  fastForwardTick: string;
  history: RequestEntry[];
  deviceStructure: DeviceStructure | null;
  deviceStructureError: string | null;
  deviceAttributes: DeviceAttributes | null;
  deviceAttributesError: string | null;
  commandEndpointId: string;
  commandClusterId: string;
  commandId: string;
  commandArgs: string;
  onHoverRoom: (roomId: string | null) => void;
  onHoverDevice: (deviceId: string | null) => void;
  onSelectRoom: (roomId: string, deviceId: string | null) => void;
  onSelectDevice: (roomId: string, deviceId: string) => void;
  onBottomTabChange: (next: SimulatorBottomTab) => void;
  onTickIntervalChange: (value: number) => void;
  onFastForwardTickChange: (value: string) => void;
  onInitializeDemoHome: () => void;
  onUpdateInterval: () => void;
  onFastForward: () => void;
  onSelectedDeviceChange: (deviceId: string) => void;
  onCommandEndpointChange: (value: string) => void;
  onCommandClusterChange: (value: string) => void;
  onCommandIdChange: (value: string) => void;
  onCommandArgsChange: (value: string) => void;
  onRunCommand: () => void;
};
