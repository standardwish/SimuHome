import type { EvaluationRun } from "@/api";

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
  specPreviewApi: {
    base: string | null;
    key_source: string | null;
  };
  specPreviewJudge: {
    model: string | null;
    api_base: string | null;
    api_key_source: string | null;
  };
  specPreviewModels: Array<{
    model: string | null;
    api_base: string | null;
    api_key_source: string | null;
    judge_model: string | null;
    judge_api_base: string | null;
    judge_api_key_source: string | null;
  }>;
  specPreviewYaml: string;
  specPreviewError: string | null;
};

export type EvaluationRuntimePanelProps = {
  experimentsDir: string;
  exampleSpec: string;
  runtimeError: string | null;
};
