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

export type WikiApiCatalog = {
  routes: ApiRouteEntry[];
};

export type WikiDeviceTypes = {
  device_types: string[];
  devices: WikiDeviceSummary[];
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
  manifest: Record<string, unknown> | null;
  state: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
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
  options?: { intervalMs?: number; enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 0;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const mountedRef = useRef(true);

  async function load() {
    if (!enabled) {
      return;
    }
    try {
      if (mountedRef.current) {
        setLoading(true);
      }
      const response = await requestApi<T>(path);
      if (!mountedRef.current) {
        return;
      }
      setData(response.data);
      setError(null);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void load();
    if (!enabled || intervalMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }
    const timer = window.setInterval(() => {
      void load();
    }, intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, path]);

  return useMemo(
    () => ({ data, error, loading, refresh: load }),
    [data, error, loading],
  );
}
