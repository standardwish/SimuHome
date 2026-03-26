import type {
  EvaluationRun,
  EvaluationRunLogs,
  EvaluationSpecPreview,
  RuntimeConfig,
} from "../../api";

export type EvaluationRunsPayload = {
  runs: EvaluationRun[];
};

export type EvaluationLaunchResponse = {
  accepted: boolean;
  pid: number;
  log_path: string;
  mode: "start" | "resume";
};

export type EvaluationPresenterProps = {
  message: string | null;
  specPath: string;
  resumePath: string;
  deferredSpecPath: string;
  runtime: RuntimeConfig | null;
  runtimeError: string | null;
  runs: EvaluationRun[];
  runsError: string | null;
  selectedRunId: string | null;
  selectedRun: EvaluationRun | null;
  selectedRunLogs: EvaluationRunLogs | null;
  selectedRunLogsError: string | null;
  specPreview: EvaluationSpecPreview | null;
  specPreviewError: string | null;
  onSpecPathChange: (value: string) => void;
  onResumePathChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  onSelectedRunChange: (runId: string) => void;
};
