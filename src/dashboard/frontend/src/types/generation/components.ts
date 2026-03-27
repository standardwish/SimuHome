import type { GenerationRun } from "@/api";

export type GenerationRunControlsPanelProps = {
  specPath: string;
  resumePath: string;
  onSpecPathChange: (value: string) => void;
  onResumePathChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
};

export type GenerationLogPanelProps = {
  selectedRunId: string | null;
  selectedRunLabel: string;
  logPath: string;
  logTail: string;
  error: string | null;
};

export type GenerationRunsPanelProps = {
  runs: GenerationRun[];
  runsError: string | null;
  selectedRunId: string | null;
  selectedRunLabel: string;
  onSelectedRunChange: (runId: string) => void;
};

export type GenerationSpecPreviewPanelProps = {
  deferredSpecPath: string;
  specPreviewPath: string;
  specPreviewSchema: string;
  specPreviewRunId: string;
  specPreviewOutputRoot: string;
  specPreviewSelection: string;
  specPreviewBaseDate: string;
  specPreviewHome: unknown;
  specPreviewLlm: unknown;
  specPreviewYaml: string;
  specPreviewError: string | null;
};

export type GenerationRuntimePanelProps = {
  generationRunsDir: string;
  exampleSpec: string;
  runtimeError: string | null;
};
