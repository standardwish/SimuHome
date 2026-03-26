import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { DeviceDirectory } from "../../components/Wiki/DeviceDirectory";
import { WikiClusterDocsPanel } from "../../components/Wiki/WikiClusterDocsPanel";
import { WikiDeviceOverviewPanel } from "../../components/Wiki/WikiDeviceOverviewPanel";
import type { WikiPresenterProps } from "../../types/pages/wiki";
import { MetricStrip, PageIntro, Surface } from "../../ui";

export function WikiPresenter({
  deviceTypes,
  deviceTypesError,
  deviceDetail,
  deviceDetailError,
  clusterDocError,
  selectedDeviceType,
  selectedSummary,
  knownDevice,
  clusterEntries,
  selectedClusterId,
  selectedCluster,
  clusterDocContent,
  onSelectCluster,
}: WikiPresenterProps) {
  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Implemented device reference"
        title="Wiki"
        description="Implemented device library. This surface is sourced from the code registry, not from whatever happens to be mounted in the running home."
      />

      {(deviceTypesError || deviceDetailError || clusterDocError) && (
        <Alert severity="warning">
          {deviceTypesError ?? deviceDetailError ?? clusterDocError}
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
                  value: String(deviceTypes?.devices.length ?? 0),
                  tone: "accent",
                },
                {
                  label: "Registry source",
                  value: deviceTypes?.source ?? "device_factory",
                },
              ]}
            />
          </Surface>
          <DeviceDirectory devices={deviceTypes?.devices ?? []} />
        </Stack>
      )}

      {selectedDeviceType && knownDevice && (
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={2}
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
            <DeviceDirectory devices={deviceTypes?.devices ?? []} activeDeviceType={selectedDeviceType} />
          </Stack>
          <Stack spacing={2}>
            <WikiDeviceOverviewPanel
              selectedDeviceType={selectedDeviceType}
              deviceTypes={deviceTypes}
              deviceDetail={deviceDetail}
              selectedSummary={selectedSummary}
              clusterEntries={clusterEntries}
              selectedClusterId={selectedClusterId}
              selectedCluster={selectedCluster}
              onSelectCluster={onSelectCluster}
            />
          </Stack>
          <Stack spacing={2}>
            <WikiClusterDocsPanel
              selectedCluster={selectedCluster}
              clusterDocContent={clusterDocContent}
              deviceMetadata={deviceDetail?.metadata ?? null}
            />
          </Stack>
        </Stack>
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
