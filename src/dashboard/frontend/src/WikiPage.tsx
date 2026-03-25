import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import {
  WikiClusterDoc,
  WikiDeviceDetail,
  WikiDeviceSummary,
  WikiDeviceTypes,
  useDashboardQuery,
} from "./api";
import { MetricStrip, MonoBlock, PageIntro, RailList, Surface } from "./ui";

function DeviceDirectory({
  devices,
  activeDeviceType,
}: {
  devices: WikiDeviceSummary[];
  activeDeviceType?: string;
}) {
  return (
    <Surface
      title="Devices"
      caption="Every supported device type registered in the simulator codebase."
    >
      <Stack spacing={0}>
        {devices.map((device) => {
          const isActive = activeDeviceType === device.device_type;
          return (
            <Box
              key={device.device_type}
              component={RouterLink}
              to={`/wiki/${device.device_type}`}
              sx={{
                py: 1.25,
                px: 1,
                display: "block",
                color: "inherit",
                textDecoration: "none",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isActive ? "rgba(15, 118, 110, 0.08)" : "transparent",
                transition: "background-color 140ms ease",
                "&:hover": {
                  backgroundColor: isActive
                    ? "rgba(15, 118, 110, 0.12)"
                    : "rgba(17, 24, 39, 0.03)",
                },
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{device.device_type}</Typography>
              <Typography variant="body2" color="text.secondary">
                {device.cluster_count} clusters · {device.command_count} commands ·{" "}
                {device.attribute_count} attributes
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Surface>
  );
}

export function WikiPage() {
  const { deviceType: routeDeviceType } = useParams<{ deviceType: string }>();
  const deviceTypes = useDashboardQuery<WikiDeviceTypes>("/api/wiki/device-types");
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
    { enabled: Boolean(selectedDeviceType) },
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
    { enabled: Boolean(selectedClusterId && selectedCluster?.doc_path) },
  );

  const knownDevice =
    !selectedDeviceType ||
    Boolean(deviceTypes.data?.device_types?.includes(selectedDeviceType));

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Implemented device reference"
        title="Wiki"
        description="Implemented device library. This surface is sourced from the code registry, not from whatever happens to be mounted in the running home."
      />

      {(deviceTypes.error || deviceDetail.error || clusterDoc.error) && (
        <Alert severity="warning">
          {deviceTypes.error ?? deviceDetail.error ?? clusterDoc.error}
        </Alert>
      )}

      {!selectedDeviceType && (
        <Stack spacing={2}>
          <Surface
            title="Device index"
            caption="Choose a device type to open a dedicated reference page with clusters, attributes, commands, and linked docs."
          >
            <MetricStrip
              items={[
                {
                  label: "Implemented devices",
                  value: String(deviceTypes.data?.devices.length ?? 0),
                  tone: "accent",
                },
                {
                  label: "Registry source",
                  value: deviceTypes.data?.source ?? "device_factory",
                },
              ]}
            />
          </Surface>
          <DeviceDirectory devices={deviceTypes.data?.devices ?? []} />
        </Stack>
      )}

      {selectedDeviceType && knownDevice && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "320px minmax(0, 1fr) 360px",
            },
            gap: 2,
          }}
        >
          <Stack spacing={2}>
            <DeviceDirectory
              devices={deviceTypes.data?.devices ?? []}
              activeDeviceType={selectedDeviceType}
            />
          </Stack>

          <Stack spacing={2}>
            <Surface
              title={selectedDeviceType}
              caption="Structure, commands, attributes, and metadata for the selected device type."
              aside={
                <Button
                  component={RouterLink}
                  to="/wiki"
                  variant="outlined"
                  startIcon={<ArrowBackRoundedIcon />}
                >
                  Back to device list
                </Button>
              }
            >
              <Stack spacing={2}>
                <MetricStrip
                  items={[
                    {
                      label: "Endpoints",
                      value: String(selectedSummary?.endpoint_ids.length ?? 0),
                      tone: "accent",
                    },
                    {
                      label: "Clusters",
                      value: String(selectedSummary?.cluster_count ?? 0),
                    },
                    {
                      label: "Commands",
                      value: String(selectedSummary?.command_count ?? 0),
                    },
                    {
                      label: "Doc-linked clusters",
                      value: String(selectedSummary?.doc_cluster_count ?? 0),
                    },
                  ]}
                />

                <RailList
                  items={[
                    {
                      label: "Registry source",
                      value:
                        deviceDetail.data?.source ?? deviceTypes.data?.source ?? "device_factory",
                    },
                    {
                      label: "Class",
                      value: deviceDetail.data?.implementation?.class_name ?? "—",
                    },
                    {
                      label: "Module",
                      value: deviceDetail.data?.implementation?.module ?? "—",
                    },
                    {
                      label: "Source file",
                      value: deviceDetail.data?.implementation?.source_file ?? "—",
                    },
                  ]}
                />

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Clusters
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {clusterEntries.map(([clusterId]) => (
                      <Button
                        key={clusterId}
                        variant={clusterId === selectedClusterId ? "contained" : "outlined"}
                        onClick={() => setSelectedClusterId(clusterId)}
                      >
                        {clusterId}
                      </Button>
                    ))}
                  </Stack>
                </Box>

                {selectedCluster && (
                  <Box
                    sx={{
                      borderTop: "1px solid",
                      borderColor: "divider",
                      pt: 1.5,
                    }}
                  >
                    <Typography variant="h6">{selectedCluster.cluster_id}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 1.25 }}>
                      Commands, attributes, and static implementation metadata.
                    </Typography>

                    <RailList
                      items={[
                        {
                          label: "Cluster class",
                          value: selectedCluster.implementation?.class_name ?? "—",
                        },
                        {
                          label: "Cluster module",
                          value: selectedCluster.implementation?.module ?? "—",
                        },
                        {
                          label: "Doc file",
                          value: selectedCluster.doc_path ? (
                            <Typography
                              component="a"
                              href={selectedCluster.doc_path}
                              target="_blank"
                              rel="noreferrer"
                              sx={{
                                color: "inherit",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              {selectedCluster.doc_path}
                              <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
                            </Typography>
                          ) : (
                            "Not linked"
                          ),
                        },
                      ]}
                    />

                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        Commands
                      </Typography>
                      <Stack spacing={1}>
                        {selectedCluster.commands.map((command) => (
                          <Box
                            key={command}
                            sx={{
                              px: 1.25,
                              py: 1,
                              borderLeft: "3px solid",
                              borderColor: "primary.main",
                              backgroundColor: "rgba(255, 255, 255, 0.58)",
                            }}
                          >
                            <Typography sx={{ fontWeight: 700 }}>{command}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {(selectedCluster.command_args?.[command] ?? [])
                                .map((arg) => `${arg.name}: ${arg.type}`)
                                .join(", ") || "No parameters"}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        Attributes
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(selectedCluster.attributes).map(([attributeId, info]) => (
                          <Box
                            key={attributeId}
                            sx={{
                              px: 1.25,
                              py: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              backgroundColor: "rgba(17, 24, 39, 0.03)",
                            }}
                          >
                            <Typography sx={{ fontWeight: 700 }}>{attributeId}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {info.type} · {info.readonly ? "readonly" : "mutable"} ·{" "}
                              {JSON.stringify(info.value)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Surface>
          </Stack>

          <Stack spacing={2}>
            <Surface
              title="Cluster docs"
              caption="Linked markdown and additional reflected metadata for the active cluster."
            >
              <Stack spacing={1.5}>
                <MonoBlock
                  label="Cluster metadata"
                  value={selectedCluster?.metadata ?? { note: "No metadata available." }}
                  maxHeight={200}
                />
                <MonoBlock
                  label="Device metadata"
                  value={deviceDetail.data?.metadata ?? { note: "No metadata available." }}
                  maxHeight={180}
                />
                <MonoBlock
                  label="Cluster markdown"
                  value={
                    selectedCluster?.doc_path
                      ? clusterDoc.data?.content ?? "Loading cluster markdown..."
                      : "No cluster markdown is linked for the current selection."
                  }
                  maxHeight={420}
                />
              </Stack>
            </Surface>
          </Stack>
        </Box>
      )}

      {selectedDeviceType && !knownDevice && (
        <Surface
          title="Unknown device type"
          caption="This route does not match a registered device in the implemented simulator library."
          aside={
            <Button
              component={RouterLink}
              to="/wiki"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
            >
              Back to device list
            </Button>
          }
        >
          <Typography color="text.secondary">{selectedDeviceType}</Typography>
        </Surface>
      )}
    </Stack>
  );
}
