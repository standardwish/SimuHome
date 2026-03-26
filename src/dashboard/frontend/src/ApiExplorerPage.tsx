import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import {
  ApiRouteEntry,
  WikiApiCatalog,
  requestApi,
  useDashboardQuery,
} from "./api";
import { MonoBlock, PageIntro, Surface } from "./ui";

type HistoryEntry = {
  method: string;
  path: string;
  status: "success" | "error";
  detail: string;
};

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

export function ApiExplorerPage() {
  const catalog = useDashboardQuery<WikiApiCatalog>("/api/wiki/apis");
  const [selectedKey, setSelectedKey] = useState("");
  const [requestPath, setRequestPath] = useState("/api/home/state");
  const [requestBody, setRequestBody] = useState("{}");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [responseBlock, setResponseBlock] = useState<string>("Select a route and execute it.");

  const selectedRoute = useMemo(
    () => catalog.data?.routes.find((route) => routeKey(route) === selectedKey) ?? null,
    [catalog.data?.routes, selectedKey],
  );

  useEffect(() => {
    if (!selectedKey && catalog.data?.routes?.[0]) {
      const next = catalog.data.routes[0];
      setSelectedKey(routeKey(next));
      setRequestPath(next.path);
      setRequestBody("{}");
    }
  }, [catalog.data?.routes, selectedKey]);

  async function executeSelectedRoute() {
    if (!selectedRoute) {
      return;
    }

    try {
      let body: string | undefined;
      if (selectedRoute.method !== "GET") {
        JSON.parse(requestBody);
        body = requestBody;
      }

      const response = await requestApi<unknown>(requestPath, {
        method: selectedRoute.method,
        body,
      });
      const detail = JSON.stringify(response.data, null, 2);
      setResponseBlock(detail);
      setHistory((current) => [
        {
          method: selectedRoute.method,
          path: requestPath,
          status: "success",
          detail,
        },
        ...current,
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Request failed";
      setResponseBlock(detail);
      setHistory((current) => [
        {
          method: selectedRoute?.method ?? "GET",
          path: requestPath,
          status: "error",
          detail,
        },
        ...current,
      ]);
    }
  }

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Manual requests"
        title="API Explorer"
        description="Choose any documented backend route, edit the request path and payload, and inspect raw responses without leaving the dashboard."
      />

      {catalog.error && <Alert severity="warning">{catalog.error}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "380px minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Surface title="Route catalog" caption="The current FastAPI surface, indexed for manual execution.">
            <Stack spacing={1.5}>
              <Select
                value={selectedKey}
                onChange={(event) => {
                  const next = catalog.data?.routes.find(
                    (route) => routeKey(route) === event.target.value,
                  );
                  if (!next) {
                    return;
                  }
                  setSelectedKey(routeKey(next));
                  setRequestPath(next.path);
                  setRequestBody("{}");
                }}
                displayEmpty
              >
                {(catalog.data?.routes ?? []).map((route) => (
                  <MenuItem key={routeKey(route)} value={routeKey(route)}>
                    {route.method} {route.path}
                  </MenuItem>
                ))}
              </Select>

              <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                {(catalog.data?.routes ?? []).slice(0, 14).map((route) => (
                  <Box
                    key={routeKey(route)}
                    sx={{
                      py: 1.25,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      {route.method} {route.path}
                    </Typography>
                    <Typography color="text.secondary">
                      {route.summary ?? route.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Surface>
        </Stack>

        <Stack spacing={2}>
          <Surface
            title="Request composer"
            caption="Edit path variables inline and send JSON only when the route expects a body."
            aside={
              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={executeSelectedRoute}
                disabled={!selectedRoute}
              >
                Execute
              </Button>
            }
          >
            <Stack spacing={1.5}>
              <TextField
                label="Request path"
                value={requestPath}
                onChange={(event) => setRequestPath(event.target.value)}
              />
              <TextField
                label="JSON body"
                value={requestBody}
                onChange={(event) => setRequestBody(event.target.value)}
                multiline
                minRows={10}
                disabled={selectedRoute?.method === "GET"}
                helperText={
                  selectedRoute?.method === "GET"
                    ? "GET routes are sent without a request body."
                    : "Body must be valid JSON before the request is sent."
                }
              />
              <MonoBlock label="Latest response" value={responseBlock} maxHeight={360} />
            </Stack>
          </Surface>

          <Surface title="Execution history" caption="Recent manual calls and failure messages.">
            <Stack spacing={1}>
              {history.map((entry, index) => (
                <Alert
                  key={`${entry.method}-${entry.path}-${index}`}
                  severity={entry.status === "success" ? "success" : "error"}
                  variant="outlined"
                >
                  <strong>
                    {entry.method} {entry.path}
                  </strong>
                  <br />
                  {entry.detail}
                </Alert>
              ))}
              {history.length === 0 && (
                <Typography color="text.secondary">
                  Explorer executions will be recorded here.
                </Typography>
              )}
            </Stack>
          </Surface>
        </Stack>
      </Box>
    </Stack>
  );
}
