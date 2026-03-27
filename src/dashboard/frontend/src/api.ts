import { useEffect, useMemo, useRef, useState } from "react";

export type ApiEnvelope<T> = {
  status: { code: number; message: string };
  data: T;
  error: { type: string; detail: string } | null;
};

export type ApiRouteEntry = {
  method: string;
  path: string;
  name: string;
  summary: string | null;
};

export type WikiImplementationInfo = {
  class_name: string;
  module: string;
  source_file: string | null;
};

export type WikiDeviceSummary = {
  device_type: string;
  endpoint_ids: string[];
  cluster_count: number;
  attribute_count: number;
  command_count: number;
  doc_cluster_count: number;
  implementation: WikiImplementationInfo;
};

export type WikiAggregatorSummary = {
  aggregator_type: string;
  environment_signal: string;
  summary: string;
  unit: string;
  baseline_value: number;
  current_value: number;
  interested_device_types: string[];
};

export type WikiApiCatalog = {
  routes: ApiRouteEntry[];
};

export type WikiDeviceTypes = {
  device_types: string[];
  devices: WikiDeviceSummary[];
  source: string;
};

export type WikiAggregators = {
  aggregator_types: string[];
  aggregators: WikiAggregatorSummary[];
  source: string;
};

export type WikiCluster = {
  cluster_id: string;
  attributes: Record<string, { value: unknown; type: string; readonly: boolean }>;
  commands: string[];
  command_args?: Record<
    string,
    Array<{ name: string; type: string; required: boolean; default: unknown }>
  >;
  doc_path?: string | null;
  implementation?: WikiImplementationInfo;
  metadata?: Record<string, unknown>;
};

export type WikiDeviceDetail = {
  device_type: string;
  structure: {
    device_id: string;
    device_type: string;
      endpoints: Record<string, { clusters: Record<string, WikiCluster> }>;
  };
  clusters: Record<string, WikiCluster>;
  implementation: WikiImplementationInfo;
  metadata: Record<string, unknown>;
  source: string;
};

export type WikiClusterDoc = {
  cluster_id: string;
  path: string;
  content: string;
};

export type WikiAggregatorDetail = {
  aggregator_type: string;
  environment_signal: string;
  summary: string;
  mechanism: string;
  formula_readable: string;
  formula_code: string;
  sensor_sync: string;
  unit: string;
  baseline_value: number;
  current_value: number;
  interested_device_types: string[];
  implementation: WikiImplementationInfo;
  source: string;
};

export type HomeState = {
  tick_interval: number;
  current_tick: number;
  current_time: string;
  base_time: string;
  rooms: Record<
    string,
    {
      state?: Record<string, number>;
      devices?: Array<{
        device_id: string;
        device_type: string;
        attributes: Record<string, unknown>;
      }>;
    }
  >;
};

export type DeviceStructure = {
  device_id: string;
  device_type: string;
  endpoints: Record<
    string,
    {
      clusters: Record<
        string,
        {
          cluster_id: string;
          attributes: Record<
            string,
            {
              value: unknown;
              type: string;
              readonly: boolean;
              enum_name?: string;
              enum_values?: Record<string, string | number>;
            }
          >;
          commands: string[];
        }
      >;
    }
  >;
};

export type DeviceAttributes = Record<string, unknown>;

export type WorkflowList = Array<{
  workflow_id: string;
  description: string | null;
  start_time: string;
  status: string;
  current_step: number;
  total_steps: number;
}>;

export type RuntimeConfig = {
  experiments_dir: string;
  exists: boolean;
  eval_spec_example: string;
};

export type EvaluationRun = {
  run_id: string;
  path: string;
  has_summary: boolean;
  judge_failures: Array<{
    model: string;
    artifact: string;
    artifact_path: string;
    details: string[];
  }>;
  manifest: Record<string, unknown> | null;
  state: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
};

export type EvaluationRunDetail = {
  run_id: string;
  path: string;
  summary: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
  models: Array<{
    model: string;
    path: string;
    artifacts: Array<{
      file_name: string;
      file_path: string;
      query_type: string | null;
      case: string | null;
      seed: number | string | null;
      duration: number | null;
      score: number | null;
      error_type: string | null;
      final_answer: string | null;
      required_actions: {
        total: number;
        invoked: number;
      };
      judge: string[];
      judge_error_details: string[];
      tools_invoked: Array<{
        tool: string;
        ok: boolean;
        status_code: number | null;
        error_type: string | null;
      }>;
      steps: Array<{
        step: number | null;
        thought: string | null;
        action: string | null;
        action_input: unknown;
      }>;
    }>;
  }>;
};

export type EvaluationRunLogs = {
  run_id: string;
  log_path: string;
  lines: string[];
};

export type EvaluationSpecPreview = {
  path: string;
  exists: boolean;
  valid: boolean;
  summary: {
    schema: string | null;
    run_id: string | null;
    output_root: string | null;
    episode_dir: string | null;
    selection: {
      qt: string | null;
      case: string | null;
      seed: string | null;
    };
    strategy: {
      name: string | null;
      timeout: unknown;
      temperature: unknown;
      max_steps: unknown;
    };
    orchestration: {
      max_workers: unknown;
      simulator_start_timeout: unknown;
      simulator_start_retries: unknown;
      evaluation_retries: unknown;
      allow_partial_start: unknown;
    };
    api: {
      base: string | null;
      key_source: string | null;
    };
    judge: {
      model: string | null;
      api_base: string | null;
      api_key_source: string | null;
    };
    models: Array<{
      model: string | null;
      api_base: string | null;
      api_key_source: string | null;
      judge_model: string | null;
      judge_api_base: string | null;
      judge_api_key_source: string | null;
    }>;
  } | null;
  raw_text: string | null;
  error: string | null;
};

const DEFAULT_API_BASE =
  import.meta.env.VITE_SIMUHOME_API_BASE_URL ?? window.location.origin;

export function apiUrl(path: string): string {
  return new URL(path, DEFAULT_API_BASE).toString();
}

export async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers ?? undefined);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok && payload.error) {
    throw new Error(payload.error.detail || payload.status.message);
  }
  return payload;
}

export function useDashboardQuery<T>(
  path: string,
  options?: { intervalMs?: number; enabled?: boolean; isEqual?: (left: T, right: T) => boolean },
) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 0;
  const isEqual = options?.isEqual;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const mountedRef = useRef(true);
  const dataRef = useRef<T | null>(null);
  const errorRef = useRef<string | null>(null);

  async function load(force = false, background = false) {
    if (!force && !enabled) {
      return;
    }
    const shouldShowLoading = !background && (force || dataRef.current === null);
    try {
      if (mountedRef.current && shouldShowLoading) {
        setLoading(true);
      }
      const response = await requestApi<T>(path);
      if (!mountedRef.current) {
        return;
      }
      const unchanged = dataRef.current !== null && Boolean(isEqual?.(dataRef.current, response.data));
      if (!unchanged) {
        dataRef.current = response.data;
        setData(response.data);
      }
      if (errorRef.current !== null) {
        errorRef.current = null;
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const nextError = err instanceof Error ? err.message : "Request failed";
        errorRef.current = nextError;
        setError(nextError);
      }
    } finally {
      if (mountedRef.current && shouldShowLoading) {
        setLoading((current) => (current ? false : current));
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      void load();
    } else if (mountedRef.current) {
      setLoading(false);
    }
    if (!enabled || intervalMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }
    const timer = window.setInterval(() => {
      void load(false, true);
    }, intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, path]);

  return useMemo(
    () => ({ data, error, loading, refresh: () => load(true) }),
    [data, error, loading],
  );
}
