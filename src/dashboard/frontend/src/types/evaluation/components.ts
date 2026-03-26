import type { EvaluationRun } from "../../api";

export type EvaluationRunControlsPanelProps = {
  specPath: string;
  resumePath: string;
  onSpecPathChange: (value: string) => void;
  onResumePathChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
};

export type EvaluationLogPanelProps = {
  selectedRunId: string | null;
  selectedRunLabel: string;
  logPath: string;
  logTail: string;
  error: string | null;
};

export type EvaluationJudgeFailuresPanelProps = {
  failures: EvaluationRun["judge_failures"];
};

export type EvaluationRunsPanelProps = {
  runs: EvaluationRun[];
  runsError: string | null;
  selectedRunId: string | null;
  selectedRunLabel: string;
  onSelectedRunChange: (runId: string) => void;
};

export type EvaluationSpecPreviewPanelProps = {
  deferredSpecPath: string;
  specPreviewPath: string;
  specPreviewSchema: string;
  specPreviewRunId: string;
  specPreviewEpisodeDir: string;
  specPreviewSelection: string;
  specPreviewStrategy: unknown;
  specPreviewModels: unknown;
  specPreviewYaml: string;
  specPreviewError: string | null;
};

export type EvaluationRuntimePanelProps = {
  experimentsDir: string;
  exampleSpec: string;
  runtimeError: string | null;
};
