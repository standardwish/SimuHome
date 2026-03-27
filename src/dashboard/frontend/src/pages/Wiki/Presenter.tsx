import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { DeviceDirectory } from "@/components/Wiki/DeviceDirectory";
import { WikiClusterDocsPanel } from "@/components/Wiki/WikiClusterDocsPanel";
import { WikiDeviceOverviewPanel } from "@/components/Wiki/WikiDeviceOverviewPanel";
import type { WikiPresenterProps } from "@/types/pages/wiki";
import { PageIntro, Surface } from "@/ui";

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
  const isDeviceDetailRoute = Boolean(selectedDeviceType && knownDevice);
  const pageTitle = isDeviceDetailRoute ? selectedDeviceType : "Devices";
  const pageDescription = isDeviceDetailRoute
    ? "Implemented device reference sourced from the simulator code registry."
    : "Implemented device library. Choose a device type to open its dedicated reference page.";

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Implemented device reference"
        title={pageTitle}
        description={pageDescription}
      />

      {(deviceTypesError || deviceDetailError || clusterDocError) && (
        <Alert severity="warning">
          {deviceTypesError ?? deviceDetailError ?? clusterDocError}
        </Alert>
      )}

      {!selectedDeviceType && <DeviceDirectory devices={deviceTypes?.devices ?? []} />}

      {selectedDeviceType && knownDevice && (
        <Stack
          spacing={2}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 1fr) 360px",
            },
            gap: 2,
          }}
        >
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
