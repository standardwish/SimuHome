import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRouteEntry, WikiApiCatalog, requestApi, useDashboardQuery } from "@/api";
import { useDashboardRuntimeStore } from "@/store";
import type { HistoryEntry } from "@/types/pages/apiExplorer";
import { ApiExplorerPresenter } from "@/pages/ApiExplorer/Presenter";

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

export function ApiExplorerContainer() {
  const apiHealthy = useDashboardRuntimeStore((state) => state.apiHealthy);
  const catalog = useDashboardQuery<WikiApiCatalog>("/api/wiki/apis", {
    enabled: apiHealthy,
  });
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

  const handleSelectRoute = useCallback(
    (nextKey: string) => {
      const next = catalog.data?.routes.find((route) => routeKey(route) === nextKey);
      if (!next) {
        return;
      }
      setSelectedKey(routeKey(next));
      setRequestPath(next.path);
      setRequestBody("{}");
    },
    [catalog.data?.routes],
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
