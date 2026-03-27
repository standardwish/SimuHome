import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { AggregatorDirectory } from "@/components/Wiki/AggregatorDirectory";
import { DeviceDirectory } from "@/components/Wiki/DeviceDirectory";
import { WikiAggregatorMechanismPanel } from "@/components/Wiki/WikiAggregatorMechanismPanel";
import { WikiAggregatorOverviewPanel } from "@/components/Wiki/WikiAggregatorOverviewPanel";
import { WikiClusterDocsPanel } from "@/components/Wiki/WikiClusterDocsPanel";
import { WikiDeviceOverviewPanel } from "@/components/Wiki/WikiDeviceOverviewPanel";
import type { WikiPresenterProps } from "@/types/pages/wiki";
import { PageIntro, Surface } from "@/ui";

export function WikiPresenter({
  wikiSection,
  deviceTypes,
  deviceTypesError,
  deviceDetail,
  deviceDetailError,
  clusterDocError,
  aggregators,
  aggregatorsError,
  aggregatorDetail,
  aggregatorDetailError,
  selectedDeviceType,
  selectedSummary,
  knownDevice,
  selectedAggregatorType,
  selectedAggregatorSummary,
  knownAggregator,
  clusterEntries,
  selectedClusterId,
  selectedCluster,
  clusterDocContent,
  onSelectCluster,
}: WikiPresenterProps) {
  const isDeviceDetailRoute =
    wikiSection === "devices" && Boolean(selectedDeviceType && knownDevice);
  const isAggregatorDetailRoute =
    wikiSection === "aggregators" && Boolean(selectedAggregatorType && knownAggregator);
  const pageTitle = isDeviceDetailRoute
    ? selectedDeviceType
    : isAggregatorDetailRoute
      ? selectedAggregatorType
      : wikiSection === "aggregators"
        ? "Aggregators"
        : "Devices";
  const pageDescription = isDeviceDetailRoute
    ? "Implemented device reference sourced from the simulator code registry."
    : isAggregatorDetailRoute
      ? "Environment aggregators connect physical rules, device influence, and sensor synchronization."
      : wikiSection === "aggregators"
        ? "Environment aggregators define how device behavior influences shared room conditions."
        : "Implemented device library. Choose a device type to open its dedicated reference page.";

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Implemented device reference"
        title={pageTitle}
        description={pageDescription}
      />

      <Surface
        title="Wiki sections"
        caption="Browse implemented device metadata or environment aggregator rules."
      >
        <Tabs value={wikiSection} aria-label="Wiki sections">
          <Tab component={RouterLink} to="/wiki" label="Devices" value="devices" />
          <Tab
            component={RouterLink}
            to="/wiki/aggregators"
            label="Aggregators"
            value="aggregators"
          />
        </Tabs>
      </Surface>

      {(deviceTypesError ||
        deviceDetailError ||
        clusterDocError ||
        aggregatorsError ||
        aggregatorDetailError) && (
        <Alert severity="warning">
          {deviceTypesError ??
            deviceDetailError ??
            clusterDocError ??
            aggregatorsError ??
            aggregatorDetailError}
        </Alert>
      )}

      {wikiSection === "devices" && !selectedDeviceType && (
        <DeviceDirectory devices={deviceTypes?.devices ?? []} />
      )}

      {wikiSection === "aggregators" && !selectedAggregatorType && (
        <AggregatorDirectory aggregators={aggregators?.aggregators ?? []} />
      )}

      {wikiSection === "devices" && selectedDeviceType && knownDevice && (
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

      {wikiSection === "aggregators" && selectedAggregatorType && knownAggregator && (
        <Stack
          spacing={2}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 1fr) 380px",
            },
            gap: 2,
          }}
        >
          <WikiAggregatorOverviewPanel
            aggregatorDetail={aggregatorDetail}
            aggregatorSummary={selectedAggregatorSummary}
          />
          <WikiAggregatorMechanismPanel aggregatorDetail={aggregatorDetail} />
        </Stack>
      )}

      {wikiSection === "devices" && selectedDeviceType && !knownDevice && (
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

      {wikiSection === "aggregators" && selectedAggregatorType && !knownAggregator && (
        <Surface
          title="Unknown aggregator type"
          caption="This route does not match a registered environment aggregator in the implemented simulator library."
          aside={
            <Button
              component={RouterLink}
              to="/wiki/aggregators"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
            >
              Back to aggregator list
            </Button>
          }
        >
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography color="text.secondary">{selectedAggregatorType}</Typography>
          </Box>
        </Surface>
      )}
    </Stack>
  );
}
