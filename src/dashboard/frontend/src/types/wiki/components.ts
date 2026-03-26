import type { WikiCluster, WikiDeviceDetail, WikiDeviceSummary, WikiDeviceTypes } from "../../api";

export type DeviceDirectoryProps = {
  devices: WikiDeviceSummary[];
  activeDeviceType?: string;
};

export type WikiDeviceOverviewPanelProps = {
  selectedDeviceType: string;
  deviceTypes: WikiDeviceTypes | null;
  deviceDetail: WikiDeviceDetail | null;
  selectedSummary: WikiDeviceSummary | null;
  clusterEntries: Array<[string, WikiCluster]>;
  selectedClusterId: string;
  selectedCluster: WikiCluster | null;
  onSelectCluster: (clusterId: string) => void;
};

export type WikiClusterDocsPanelProps = {
  selectedCluster: WikiCluster | null;
  clusterDocContent: string | null;
  deviceMetadata: WikiDeviceDetail["metadata"] | null;
};
