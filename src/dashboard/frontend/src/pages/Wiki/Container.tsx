import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import {
  WikiAggregatorDetail,
  WikiAggregators,
  WikiClusterDoc,
  WikiDeviceDetail,
  WikiDeviceTypes,
  useDashboardQuery,
} from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import { WikiPresenter } from "@/pages/Wiki/Presenter";

export function WikiContainer() {
  const location = useLocation();
  const {
    deviceType: routeDeviceType,
    aggregatorType: routeAggregatorType,
  } = useParams<{ deviceType?: string; aggregatorType?: string }>();
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const wikiSection = location.pathname.startsWith("/wiki/aggregators")
    ? "aggregators"
    : "devices";
  const deviceTypes = useDashboardQuery<WikiDeviceTypes>("/api/wiki/device-types", {
    enabled: apiHealthy && wikiSection === "devices",
  });
  const aggregators = useDashboardQuery<WikiAggregators>("/api/wiki/aggregators", {
    enabled: apiHealthy && wikiSection === "aggregators",
  });
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const selectedDeviceType = wikiSection === "devices" ? routeDeviceType ?? "" : "";
  const selectedAggregatorType =
    wikiSection === "aggregators" ? routeAggregatorType ?? "" : "";

  const selectedSummary = useMemo(
    () =>
      deviceTypes.data?.devices?.find((device) => device.device_type === selectedDeviceType) ??
      null,
    [deviceTypes.data?.devices, selectedDeviceType],
  );

  const deviceDetail = useDashboardQuery<WikiDeviceDetail>(
    `/api/wiki/device-types/${selectedDeviceType}`,
    { enabled: apiHealthy && wikiSection === "devices" && Boolean(selectedDeviceType) },
  );

  const selectedAggregatorSummary = useMemo(
    () =>
      aggregators.data?.aggregators.find(
        (aggregator) => aggregator.aggregator_type === selectedAggregatorType,
      ) ?? null,
    [aggregators.data?.aggregators, selectedAggregatorType],
  );

  const aggregatorDetail = useDashboardQuery<WikiAggregatorDetail>(
    `/api/wiki/aggregators/${selectedAggregatorType}`,
    {
      enabled:
        apiHealthy &&
        wikiSection === "aggregators" &&
        Boolean(selectedAggregatorType),
    },
  );

  const clusterEntries = useMemo(
    () => Object.entries(deviceDetail.data?.clusters ?? {}),
    [deviceDetail.data?.clusters],
  );

  useEffect(() => {
    setSelectedClusterId("");
  }, [selectedDeviceType]);

  useEffect(() => {
    const nextCluster =
      clusterEntries.find(([, cluster]) => Boolean(cluster.doc_path))?.[0] ??
      clusterEntries[0]?.[0] ??
      "";
    if (!nextCluster) {
      return;
    }
    setSelectedClusterId((current) =>
      current && deviceDetail.data?.clusters[current] ? current : nextCluster,
    );
  }, [clusterEntries, deviceDetail.data?.clusters]);

  const selectedCluster = useMemo(
    () => deviceDetail.data?.clusters?.[selectedClusterId] ?? null,
    [deviceDetail.data?.clusters, selectedClusterId],
  );

  const clusterDoc = useDashboardQuery<WikiClusterDoc>(
    `/api/wiki/clusters/${selectedClusterId}`,
    { enabled: apiHealthy && Boolean(selectedClusterId && selectedCluster?.doc_path) },
  );

  const knownDevice =
    wikiSection !== "devices" ||
    !selectedDeviceType ||
    Boolean(deviceTypes.data?.device_types?.includes(selectedDeviceType));
  const knownAggregator =
    wikiSection !== "aggregators" ||
    !selectedAggregatorType ||
    Boolean(aggregators.data?.aggregator_types.includes(selectedAggregatorType));

  return (
    <WikiPresenter
      wikiSection={wikiSection}
      deviceTypes={deviceTypes.data}
      deviceTypesError={deviceTypes.error}
      deviceDetail={deviceDetail.data}
      deviceDetailError={deviceDetail.error}
      clusterDocError={clusterDoc.error}
      aggregators={aggregators.data}
      aggregatorsError={aggregators.error}
      aggregatorDetail={aggregatorDetail.data}
      aggregatorDetailError={aggregatorDetail.error}
      selectedDeviceType={selectedDeviceType}
      selectedSummary={selectedSummary}
      knownDevice={knownDevice}
      selectedAggregatorType={selectedAggregatorType}
      selectedAggregatorSummary={selectedAggregatorSummary}
      knownAggregator={knownAggregator}
      clusterEntries={clusterEntries}
      selectedClusterId={selectedClusterId}
      selectedCluster={selectedCluster}
      clusterDocContent={clusterDoc.data?.content ?? null}
      onSelectCluster={setSelectedClusterId}
    />
  );
}
