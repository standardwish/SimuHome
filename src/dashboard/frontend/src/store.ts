import { create } from "zustand";

export const DEFAULT_POLLING_INTERVAL_MS = 5000;

type DashboardRuntimeState = {
  apiHealthy: boolean;
  pollingIntervalMs: number;
  setApiHealthy: (healthy: boolean) => void;
  reset: () => void;
};

type DashboardRuntimeDefaults = Pick<
  DashboardRuntimeState,
  "apiHealthy" | "pollingIntervalMs"
>;

const defaultState: DashboardRuntimeDefaults = {
  apiHealthy: false,
  pollingIntervalMs: DEFAULT_POLLING_INTERVAL_MS,
};

export const useDashboardRuntimeStore = create<DashboardRuntimeState>((set) => ({
  ...defaultState,
  setApiHealthy: (healthy) => set({ apiHealthy: healthy }),
  reset: () => set(defaultState),
}));

export function resetDashboardRuntimeStore() {
  useDashboardRuntimeStore.getState().reset();
}
