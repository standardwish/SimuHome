import { Alert, Box, Stack, Typography } from "@mui/material";

import { PageIntro } from "@/ui";
import type { ApiExplorerPresenterProps } from "@/types/pages/apiExplorer";
import { DashboardRouteReferencePanel } from "@/components/ApiExplorer/DashboardRouteReferencePanel";
import { ExecutionHistoryPanel } from "@/components/ApiExplorer/ExecutionHistoryPanel";
import { RequestComposerPanel } from "@/components/ApiExplorer/RequestComposerPanel";
import { RouteCatalogPanel } from "@/components/ApiExplorer/RouteCatalogPanel";

export function ApiExplorerPresenter({
  catalog,
  catalogError,
  dashboardRoutes,
  manualRoutes,
  selectedKey,
  selectedRoute,
  requestPath,
  requestBody,
  history,
  responseBlock,
  onSelectRoute,
  onRequestPathChange,
  onRequestBodyChange,
  onExecuteSelectedRoute,
}: ApiExplorerPresenterProps) {
  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Manual requests"
        title="API Explorer"
        description="Choose any documented backend route, edit the request path and payload, and inspect raw responses without leaving the dashboard."
      />

      {catalogError && <Alert severity="warning">{catalogError}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "380px minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <RouteCatalogPanel
            selectedKey={selectedKey}
            routes={manualRoutes}
            onSelectRoute={onSelectRoute}
          />
        </Stack>

        <Stack spacing={2}>
          <RequestComposerPanel
            selectedRouteMethod={selectedRoute?.method ?? null}
            selectedRouteDescription={
              selectedRoute?.description ?? "Description is not provided."
            }
            selectedRouteArgs={selectedRoute?.args ?? []}
            requestPath={requestPath}
            requestBody={requestBody}
            responseBlock={responseBlock}
            onRequestPathChange={onRequestPathChange}
            onRequestBodyChange={onRequestBodyChange}
            onExecuteSelectedRoute={onExecuteSelectedRoute}
          />

          <ExecutionHistoryPanel history={history} />
          <DashboardRouteReferencePanel routes={dashboardRoutes} />
        </Stack>
      </Box>
    </Stack>
  );
}
