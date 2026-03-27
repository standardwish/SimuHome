import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRouteEntry, WikiApiCatalog, requestApi, useDashboardQuery } from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import type { HistoryEntry } from "@/types/pages/apiExplorer";
import { ApiExplorerPresenter } from "@/pages/ApiExplorer/Presenter";

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

function isDashboardRoute(route: ApiRouteEntry) {
  return route.path.startsWith("/api/dashboard/");
}

export function ApiExplorerContainer() {
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const catalog = useDashboardQuery<WikiApiCatalog>("/api/dashboard/wiki/apis", {
    enabled: apiHealthy,
  });
  const routes = catalog.data?.routes ?? [];
  const manualRoutes = useMemo(
    () => routes.filter((route) => !isDashboardRoute(route)),
    [routes],
  );
  const dashboardRoutes = useMemo(
    () => routes.filter((route) => isDashboardRoute(route)),
    [routes],
  );
  const [selectedKey, setSelectedKey] = useState("");
  const [requestPath, setRequestPath] = useState("");
  const [requestBody, setRequestBody] = useState("{}");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [responseBlock, setResponseBlock] = useState<string>("Select a route and execute it.");

  const selectedRoute = useMemo(
    () => manualRoutes.find((route) => routeKey(route) === selectedKey) ?? null,
    [manualRoutes, selectedKey],
  );

  useEffect(() => {
    if (!selectedKey && manualRoutes[0]) {
      const next = manualRoutes[0];
      setSelectedKey(routeKey(next));
      setRequestPath(next.path);
      setRequestBody("{}");
      return;
    }

    if (selectedKey && !manualRoutes.find((route) => routeKey(route) === selectedKey)) {
      const next = manualRoutes[0];
      setSelectedKey(next ? routeKey(next) : "");
      setRequestPath(next?.path ?? "");
      setRequestBody("{}");
    }
  }, [manualRoutes, selectedKey]);

  const handleSelectRoute = useCallback(
    (nextKey: string) => {
      const next = manualRoutes.find((route) => routeKey(route) === nextKey);
      if (!next) {
        return;
      }
      setSelectedKey(routeKey(next));
      setRequestPath(next.path);
      setRequestBody("{}");
    },
    [manualRoutes],
  );

  const executeSelectedRoute = useCallback(async () => {
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
      const detail = JSON.stringify(response, null, 2);
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
  }, [requestBody, requestPath, selectedRoute]);

  const handleRequestPathChange = useCallback((nextValue: string) => {
    setRequestPath(nextValue);
  }, []);

  const handleRequestBodyChange = useCallback((nextValue: string) => {
    setRequestBody(nextValue);
  }, []);

  return (
    <ApiExplorerPresenter
      catalog={catalog.data ?? null}
      catalogError={catalog.error}
      dashboardRoutes={dashboardRoutes}
      manualRoutes={manualRoutes}
      selectedKey={selectedKey}
      selectedRoute={selectedRoute}
      requestPath={requestPath}
      requestBody={requestBody}
      history={history}
      responseBlock={responseBlock}
      onSelectRoute={handleSelectRoute}
      onRequestPathChange={handleRequestPathChange}
      onRequestBodyChange={handleRequestBodyChange}
      onExecuteSelectedRoute={executeSelectedRoute}
    />
  );
}
