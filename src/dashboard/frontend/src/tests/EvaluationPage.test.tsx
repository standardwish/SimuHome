import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvaluationPage } from "../EvaluationPage";

const RUNTIME_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    experiments_dir: "/tmp/experiments",
    exists: true,
    eval_spec_example: "/data2/pyojunseong/SimuHome/eval_spec.example.yaml",
  },
  error: null,
};

const RUNS_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    runs: [],
  },
  error: null,
};

const PREVIEW_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    path: "/data2/pyojunseong/SimuHome/eval_spec.example.yaml",
    exists: true,
    valid: true,
    summary: {
      schema: "simuhome-eval-spec-v1",
      run_id: "example_qt1_seed_1_3_5",
      output_root: "experiments",
      episode_dir: "data/benchmark",
      selection: {
        qt: "qt1",
        case: "feasible",
        seed: "1 - 3, 5",
      },
      strategy: {
        name: "react",
        timeout: 60,
        temperature: 0,
        max_steps: 20,
      },
      orchestration: {
        max_workers: 2,
        simulator_start_timeout: 30,
        simulator_start_retries: 1,
        evaluation_retries: 1,
        allow_partial_start: true,
      },
      models: [
        {
          model: "openai/gpt-4.1",
          api_base: "https://openrouter.ai/api/v1",
          api_key_source: "env:OPENROUTER_API_KEY",
          judge_model: "gpt-5-mini",
          judge_api_base: "https://api.openai.com/v1",
          judge_api_key_source: "env:OPENAI_API_KEY",
        },
      ],
    },
    raw_text: "schema: simuhome-eval-spec-v1\nrun:\n  id: example_qt1_seed_1_3_5\n",
  },
  error: null,
};

describe("EvaluationPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/local/runtime/config")) {
          return new Response(JSON.stringify(RUNTIME_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/local/evaluations/runs")) {
          return new Response(JSON.stringify(RUNS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/local/evaluations/spec-preview")) {
          return new Response(JSON.stringify(PREVIEW_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            status: { code: 404, message: "Not Found" },
            data: null,
            error: { type: "not_found", detail: `Unhandled request: ${url}` },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
  });

  it("keeps the empty runs placeholder visible while runs are still loading", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/local/runtime/config")) {
          return Promise.resolve(
            new Response(JSON.stringify(RUNTIME_RESPONSE), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.includes("/api/local/evaluations/spec-preview")) {
          return Promise.resolve(
            new Response(JSON.stringify(PREVIEW_RESPONSE), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.includes("/api/local/evaluations/runs")) {
          return new Promise(() => {}) as Promise<Response>;
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: { code: 404, message: "Not Found" },
              data: null,
              error: { type: "not_found", detail: `Unhandled request: ${url}` },
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }),
    );

    render(<EvaluationPage />);

    expect(await screen.findByText("No runs detected yet.")).toBeInTheDocument();
  });

  it("shows spec preview details in the right rail", async () => {
    render(<EvaluationPage />);

    expect(await screen.findByText("Spec preview")).toBeInTheDocument();
    expect(await screen.findByText("example_qt1_seed_1_3_5")).toBeInTheDocument();
    expect(await screen.findByText(/openai\/gpt-4\.1/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/simuhome-eval-spec-v1/i)).length).toBeGreaterThan(0);
  });
});
