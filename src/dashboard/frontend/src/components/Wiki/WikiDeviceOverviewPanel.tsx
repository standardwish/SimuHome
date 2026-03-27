import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { apiUrl } from "@/api";
import type { WikiDeviceOverviewPanelProps } from "@/types/wiki/components";
import { MetricStrip, RailList, Surface } from "@/ui";

export function WikiDeviceOverviewPanel({
  selectedDeviceType,
  deviceTypes,
  deviceDetail,
  selectedSummary,
  clusterEntries,
  selectedClusterId,
  selectedCluster,
  onSelectCluster,
}: WikiDeviceOverviewPanelProps) {
  return (
    <Surface
      title="Device overview"
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
              value: deviceDetail?.source ?? deviceTypes?.source ?? "device_factory",
            },
            {
              label: "Class",
              value: deviceDetail?.implementation?.class_name ?? "—",
            },
            {
              label: "Module",
              value: deviceDetail?.implementation?.module ?? "—",
            },
            {
              label: "Source file",
              value: deviceDetail?.implementation?.source_file ?? "—",
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
                onClick={() => onSelectCluster(clusterId)}
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
                      href={apiUrl(`/api/wiki/clusters/${selectedCluster.cluster_id}/raw`)}
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
                      {info.type} · {info.readonly ? "readonly" : "mutable"} · {JSON.stringify(info.value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        )}
      </Stack>
    </Surface>
  );
}
