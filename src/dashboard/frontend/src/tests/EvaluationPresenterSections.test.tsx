import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EvaluationJudgeFailuresPanel } from "@/components/Evaluation/EvaluationJudgeFailuresPanel";
import { EvaluationLogPanel } from "@/components/Evaluation/EvaluationLogPanel";
import { EvaluationRunControlsPanel } from "@/components/Evaluation/EvaluationRunControlsPanel";
import { EvaluationRunsPanel } from "@/components/Evaluation/EvaluationRunsPanel";
import { EvaluationRuntimePanel } from "@/components/Evaluation/EvaluationRuntimePanel";
import { EvaluationSpecPreviewPanel } from "@/components/Evaluation/EvaluationSpecPreviewPanel";

describe("Evaluation presenter sections", () => {
  it("renders the extracted sections with the expected surface content", () => {
    const onChange = vi.fn();
    const longRunId = "very-long-run-id-that-should-truncate-inside-the-complete-runs-strip";

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
          logPath="/tmp/logs/evaluation/run-1.log"
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
              run_id: longRunId,
              path: "/tmp/experiments/run-1",
              has_summary: true,
              judge_failures: [],
              manifest: null,
              state: null,
              summary: null,
            },
          ]}
          runsError={null}
          selectedRunId={longRunId}
          selectedRunLabel={longRunId}
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
          specPreviewApi={{
            base: "https://api.openai.com/v1",
            key_source: "env:OPENAI_API_KEY",
          }}
          specPreviewJudge={{
            model: "gpt-5-mini",
            api_base: "https://api.openai.com/v1",
            api_key_source: "env:OPENAI_API_KEY",
          }}
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

    const selectedRunValue = screen
      .getAllByText(longRunId)
      .find((node) => node.tagName.toLowerCase() === "h5");
    expect(selectedRunValue).toHaveStyle({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });

  it("renders spec preview strategy and models with rail-list rows inside a scrollable panel", () => {
    render(
      <MemoryRouter>
        <EvaluationSpecPreviewPanel
          deferredSpecPath="eval_spec.example.yaml"
          specPreviewPath="eval_spec.example.yaml"
          specPreviewSchema="schema-v1"
          specPreviewRunId="run-1"
          specPreviewEpisodeDir="episodes"
          specPreviewSelection="qt1 / feasible / 1"
          specPreviewStrategy={{
            timeout: 60,
            temperature: 0,
            orchestration: {
              max_workers: 2,
            },
          }}
          specPreviewApi={{
            base: "https://api.openai.com/v1",
            key_source: "env:OPENAI_API_KEY",
          }}
          specPreviewJudge={{
            model: "gpt-5-mini",
            api_base: "https://api.openai.com/v1",
            api_key_source: "env:OPENAI_API_KEY",
          }}
          specPreviewModels={[
            {
              model: "openai/gpt-4.1",
              api_base: "https://api.openai.com/v1",
              api_key_source: null,
              judge_model: null,
              judge_api_base: null,
              judge_api_key_source: null,
            },
          ]}
          specPreviewYaml="schema: schema-v1"
          specPreviewError={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("orchestration.max_workers")).toBeInTheDocument();
    expect(screen.getByText("Judge")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("Model 1")).toBeInTheDocument();
    expect(screen.getByText("Judge")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("Models")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("Model 1")).toHaveStyle({ fontWeight: "700" });
    expect(screen.queryByText("key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("Schema")).not.toBeInTheDocument();
    expect(screen.queryByText("Spec YAML")).not.toBeInTheDocument();
    expect(screen.queryByText("[0].model")).not.toBeInTheDocument();
    expect(screen.queryByText("[0].judge_api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("judge_model")).not.toBeInTheDocument();
    expect(screen.queryByText("judge_api_key_source")).not.toBeInTheDocument();

    const wrappedKey = screen.getByText("orchestration.max_workers");
    expect(wrappedKey).toHaveStyle({ maxWidth: "260px" });
    expect(wrappedKey.parentElement).toHaveStyle({
      gridTemplateColumns: "fit-content(260px) minmax(0, 1fr)",
    });
    expect(screen.queryByText("env:OPENAI_API_KEY")).not.toBeInTheDocument();

    const scrollArea = screen.getByTestId("evaluation-spec-preview-scroll-area");
    expect(scrollArea).toHaveStyle({ overflowX: "auto" });
    expect(scrollArea).toHaveStyle({ overflowY: "auto" });
    expect(scrollArea).toHaveStyle({ scrollbarWidth: "none" });
  });
});
