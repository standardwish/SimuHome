import type {
  GenerationRun,
  GenerationRunLogs,
  GenerationSpecPreview,
  RuntimeConfig,
} from "@/api";

export type GenerationRunsPayload = {
  runs: GenerationRun[];
};

export type GenerationLaunchResponse = {
  accepted: boolean;
  pid: number;
  log_path: string;
  mode: "start" | "resume";
};

export type GenerationPresenterProps = {
  message: string | null;
  specPath: string;
  resumePath: string;
  deferredSpecPath: string;
  runtime: RuntimeConfig | null;
  runtimeError: string | null;
  runs: GenerationRun[];
  runsError: string | null;
  selectedRunId: string | null;
  selectedRun: GenerationRun | null;
  selectedRunLogs: GenerationRunLogs | null;
  selectedRunLogsError: string | null;
  specPreview: GenerationSpecPreview | null;
  specPreviewError: string | null;
  onSpecPathChange: (value: string) => void;
  onResumePathChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  onSelectedRunChange: (runId: string) => void;
};
