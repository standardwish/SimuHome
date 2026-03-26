export type RequestEntry = {
  label: string;
  status: "success" | "error";
  detail: string;
};

export type SimulatorBottomTab = "control" | "workflows" | "history";

export type RoomViewModel = {
  roomId: string;
  label: string;
  state: Record<string, number>;
  devices: Array<{
    device_id: string;
    device_type: string;
    attributes: Record<string, unknown>;
  }>;
};

export type RoomDeviceViewModel = RoomViewModel["devices"][number];
