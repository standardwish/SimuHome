import type {
  WikiAggregatorDetail,
  WikiAggregatorSummary,
  WikiAggregators,
  WikiCluster,
  WikiDeviceDetail,
  WikiDeviceSummary,
  WikiDeviceTypes,
} from "@/api";

export type WikiPresenterProps = {
  wikiSection: "devices" | "aggregators";
  deviceTypes: WikiDeviceTypes | null;
  deviceTypesError: string | null;
  deviceDetail: WikiDeviceDetail | null;
  deviceDetailError: string | null;
  clusterDocError: string | null;
  aggregators: WikiAggregators | null;
  aggregatorsError: string | null;
  aggregatorDetail: WikiAggregatorDetail | null;
  aggregatorDetailError: string | null;
  selectedDeviceType: string;
  selectedSummary: WikiDeviceSummary | null;
  knownDevice: boolean;
  selectedAggregatorType: string;
  selectedAggregatorSummary: WikiAggregatorSummary | null;
  knownAggregator: boolean;
  clusterEntries: Array<[string, WikiCluster]>;
  selectedClusterId: string;
  selectedCluster: WikiCluster | null;
  clusterDocContent: string | null;
  onSelectCluster: (clusterId: string) => void;
};
