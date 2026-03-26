import type { ApiRouteEntry } from "../../api";
import type { HistoryEntry } from "../pages/apiExplorer";

export type RouteCatalogPanelProps = {
  selectedKey: string;
  routes: ApiRouteEntry[];
  onSelectRoute: (nextKey: string) => void;
};

export type RequestComposerPanelProps = {
  selectedRouteMethod: string | null;
  requestPath: string;
  requestBody: string;
  responseBlock: string;
  onRequestPathChange: (nextValue: string) => void;
  onRequestBodyChange: (nextValue: string) => void;
  onExecuteSelectedRoute: () => void;
};

export type ExecutionHistoryPanelProps = {
  history: HistoryEntry[];
};
