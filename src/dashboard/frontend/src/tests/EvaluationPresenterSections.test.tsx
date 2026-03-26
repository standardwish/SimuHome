import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EvaluationJudgeFailuresPanel } from "../components/Evaluation/EvaluationJudgeFailuresPanel";
import { EvaluationLogPanel } from "../components/Evaluation/EvaluationLogPanel";
import { EvaluationRunControlsPanel } from "../components/Evaluation/EvaluationRunControlsPanel";
import { EvaluationRunsPanel } from "../components/Evaluation/EvaluationRunsPanel";
import { EvaluationRuntimePanel } from "../components/Evaluation/EvaluationRuntimePanel";
import { EvaluationSpecPreviewPanel } from "../components/Evaluation/EvaluationSpecPreviewPanel";

describe("Evaluation presenter sections", () => {
  it("renders the extracted sections with the expected surface content", () => {
    const onChange = vi.fn();

    render(
      <MemoryRouter>
        <EvaluationRunControlsPanel
          specPath="eval_spec.example.yaml"
          resumePath="/tmp/experiments/run"
          onSpecPathChange={onChange}
          onResumePathChange={onChange}
          onStart={vi.fn()}
          onResume={vi.fn()}
        />
        <EvaluationLogPanel
          selectedRunId="run-1"
          selectedRunLabel="run-1"
          logPath="/tmp/experiments/run-1/dashboard.log"
          logTail={"line one\nline two"}
          error={null}
        />
        <EvaluationJudgeFailuresPanel
          failures={[
            {
              model: "gpt-4.1",
              artifact: "artifact.json",
              artifact_path: "/tmp/artifact.json",
              details: ["judge detail"],
            },
          ]}
        />
        <EvaluationRunsPanel
          runs={[
            {
              run_id: "run-1",
              path: "/tmp/experiments/run-1",
              has_summary: true,
              judge_failures: [],
              manifest: null,
              state: null,
              summary: null,
            },
          ]}
          runsError={null}
          selectedRunId="run-1"
          selectedRunLabel="run-1"
          onSelectedRunChange={vi.fn()}
        />
        <EvaluationSpecPreviewPanel
          deferredSpecPath="eval_spec.example.yaml"
          specPreviewPath="eval_spec.example.yaml"
          specPreviewSchema="schema-v1"
          specPreviewRunId="run-1"
          specPreviewEpisodeDir="episodes"
          specPreviewSelection="qt1 / feasible / 1"
          specPreviewStrategy={{ name: "react", timeout: 60, temperature: 0, max_steps: 20 }}
          specPreviewModels={[
            {
              model: "openai/gpt-4.1",
              api_base: "https://openrouter.ai/api/v1",
              api_key_source: "env:OPENROUTER_API_KEY",
              judge_model: "gpt-5-mini",
              judge_api_base: "https://api.openai.com/v1",
              judge_api_key_source: "env:OPENAI_API_KEY",
            },
          ]}
          specPreviewYaml="schema: schema-v1"
          specPreviewError={null}
        />
        <EvaluationRuntimePanel
          experimentsDir="/tmp/experiments"
          exampleSpec="eval_spec.example.yaml"
          runtimeError={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Run controls")).toBeInTheDocument();
    expect(screen.getByText("Log")).toBeInTheDocument();
    expect(screen.getByText("Judge failures")).toBeInTheDocument();
    expect(screen.getByText("Complete runs")).toBeInTheDocument();
    expect(screen.getByText("Spec preview")).toBeInTheDocument();
    expect(screen.getByText("Runtime config")).toBeInTheDocument();
  });
});
