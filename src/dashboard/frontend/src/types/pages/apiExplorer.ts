import type { ApiRouteEntry, WikiApiCatalog } from "@/api";

export type HistoryEntry = {
  method: string;
  path: string;
  status: "success" | "error";
  detail: string;
};

export type ApiExplorerPresenterProps = {
  catalog: WikiApiCatalog | null;
  catalogError: string | null;
  selectedKey: string;
  selectedRoute: ApiRouteEntry | null;
  requestPath: string;
  requestBody: string;
  history: HistoryEntry[];
  responseBlock: string;
  onSelectRoute: (nextKey: string) => void;
  onRequestPathChange: (nextValue: string) => void;
  onRequestBodyChange: (nextValue: string) => void;
  onExecuteSelectedRoute: () => void;
};
