import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  WikiClusterDoc,
  WikiDeviceDetail,
  WikiDeviceTypes,
  useDashboardQuery,
} from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import { WikiPresenter } from "@/pages/Wiki/Presenter";

export function WikiContainer() {
  const { deviceType: routeDeviceType } = useParams<{ deviceType: string }>();
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const deviceTypes = useDashboardQuery<WikiDeviceTypes>("/api/wiki/device-types", {
    enabled: apiHealthy,
  });
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const selectedDeviceType = routeDeviceType ?? "";

  const selectedSummary = useMemo(
    () =>
      deviceTypes.data?.devices?.find((device) => device.device_type === selectedDeviceType) ??
      null,
    [deviceTypes.data?.devices, selectedDeviceType],
  );

  const deviceDetail = useDashboardQuery<WikiDeviceDetail>(
    `/api/wiki/device-types/${selectedDeviceType}`,
    { enabled: apiHealthy && Boolean(selectedDeviceType) },
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
    !selectedDeviceType ||
    Boolean(deviceTypes.data?.device_types?.includes(selectedDeviceType));

  return (
    <WikiPresenter
      deviceTypes={deviceTypes.data}
      deviceTypesError={deviceTypes.error}
      deviceDetail={deviceDetail.data}
      deviceDetailError={deviceDetail.error}
      clusterDocError={clusterDoc.error}
      selectedDeviceType={selectedDeviceType}
      selectedSummary={selectedSummary}
      knownDevice={knownDevice}
      clusterEntries={clusterEntries}
      selectedClusterId={selectedClusterId}
      selectedCluster={selectedCluster}
      clusterDocContent={clusterDoc.data?.content ?? null}
      onSelectCluster={setSelectedClusterId}
    />
  );
}
