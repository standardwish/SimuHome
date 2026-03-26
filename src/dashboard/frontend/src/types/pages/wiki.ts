import type {
  WikiCluster,
  WikiDeviceDetail,
  WikiDeviceSummary,
  WikiDeviceTypes,
} from "../../api";

export type WikiPresenterProps = {
  deviceTypes: WikiDeviceTypes | null;
  deviceTypesError: string | null;
  deviceDetail: WikiDeviceDetail | null;
  deviceDetailError: string | null;
  clusterDocError: string | null;
  selectedDeviceType: string;
  selectedSummary: WikiDeviceSummary | null;
  knownDevice: boolean;
  clusterEntries: Array<[string, WikiCluster]>;
  selectedClusterId: string;
  selectedCluster: WikiCluster | null;
  clusterDocContent: string | null;
  onSelectCluster: (clusterId: string) => void;
};
