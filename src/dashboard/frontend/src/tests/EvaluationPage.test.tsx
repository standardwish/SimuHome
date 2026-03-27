import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "@/store";
import { EvaluationContainer } from "@/pages/Evaluation/Container";

function renderPage() {
  return render(
    <MemoryRouter>
      <EvaluationContainer />
    </MemoryRouter>,
  );
}

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
    runs: [
      {
        run_id: "example_qt1_seed_1_3_5",
        path: "/tmp/experiments/example_qt1_seed_1_3_5",
        has_summary: false,
        judge_failures: [
          {
            model: "gpt-4.1",
            artifact: "qt1_feasible_seed_1.json",
            artifact_path:
              "/tmp/experiments/example_qt1_seed_1_3_5/gpt-4.1/qt1_feasible_seed_1.json",
            details: ["LLM request exhausted 11 attempts: 400 unsupported model"],
          },
        ],
        manifest: { run_id: "example_qt1_seed_1_3_5" },
        state: { status: "running" },
        summary: null,
      },
    ],
  },
  error: null,
};

const LOGS_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    run_id: "example_qt1_seed_1_3_5",
    log_path: "/tmp/logs/evaluation/example_qt1_seed_1_3_5.log",
    lines: ["[Main] Evaluation started", "[Worker] Step 1 complete"],
  },
  error: null,
};

const START_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    accepted: true,
    pid: 4242,
    log_path: "/tmp/logs/evaluation/eval_spec.example-dashboard.log",
    mode: "start",
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
        schema: "hidden-strategy-schema",
      },
      orchestration: {
        max_workers: 2,
        simulator_start_timeout: 30,
        simulator_start_retries: 1,
        evaluation_retries: 1,
        allow_partial_start: true,
      },
      api: {
        base: "https://openrouter.ai/api/v1",
        key_source: "env:OPENROUTER_API_KEY",
      },
      judge: {
        model: "gpt-5-mini",
        api_base: "https://api.openai.com/v1",
        api_key_source: "env:OPENAI_API_KEY",
      },
      models: [
        {
          model: "openai/gpt-4.1",
          api_base: "https://openrouter.ai/api/v1",
          api_key_source: "env:OPENROUTER_API_KEY",
          judge_model: "gpt-5-mini",
          judge_api_base: "https://api.openai.com/v1",
          judge_api_key_source: "env:OPENAI_API_KEY",
          schema: "hidden-model-schema",
        },
      ],
    },
    raw_text: "schema: simuhome-eval-spec-v1\nrun:\n  id: example_qt1_seed_1_3_5\n",
  },
  error: null,
};

describe("EvaluationContainer", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/dashboard/local/runtime/config")) {
          return new Response(JSON.stringify(RUNTIME_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/evaluations/start")) {
          return new Response(JSON.stringify(START_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/evaluations/runs/eval_spec.example-dashboard/logs")) {
          return new Response(
            JSON.stringify({
              ...LOGS_RESPONSE,
              data: {
                run_id: "eval_spec.example-dashboard",
                log_path: "/tmp/logs/evaluation/eval_spec.example-dashboard.log",
                lines: ["[Main] Booting dashboard worker"],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.includes("/api/dashboard/local/evaluations/runs/example_qt1_seed_1_3_5/logs")) {
          return new Response(JSON.stringify(LOGS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/evaluations/runs")) {
          return new Response(JSON.stringify(RUNS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/evaluations/spec-preview")) {
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
        if (url.includes("/api/dashboard/local/runtime/config")) {
          return Promise.resolve(
            new Response(JSON.stringify(RUNTIME_RESPONSE), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.includes("/api/dashboard/local/evaluations/spec-preview")) {
          return Promise.resolve(
            new Response(JSON.stringify(PREVIEW_RESPONSE), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.includes("/api/dashboard/local/evaluations/runs")) {
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

    renderPage();

    expect(await screen.findByText("No runs detected yet.")).toBeInTheDocument();
  });

  it("shows spec preview details in the right rail", async () => {
    renderPage();

    expect(await screen.findByText("Spec preview")).toBeInTheDocument();
    expect((await screen.findAllByText("example_qt1_seed_1_3_5")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/openai\/gpt-4\.1/i)).toBeInTheDocument();
    expect(await screen.findByText("timeout")).toBeInTheDocument();
    expect(await screen.findByText("Judge")).toBeInTheDocument();
    expect(await screen.findByText("Models")).toBeInTheDocument();
    expect(await screen.findByText("Model 1")).toBeInTheDocument();
    expect(screen.queryByText("key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("[0].model")).not.toBeInTheDocument();
    expect(screen.queryByText("[0].judge_api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("judge_api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("env:OPENAI_API_KEY")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-strategy-schema")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-model-schema")).not.toBeInTheDocument();
  });

  it("shows a live dashboard log tail for the selected run", async () => {
    renderPage();

    expect(await screen.findByText("/tmp/logs/evaluation/example_qt1_seed_1_3_5.log")).toBeInTheDocument();
    const tailBlock = await screen.findByText((content, node) => {
      return node?.textContent === "[Main] Evaluation started\n[Worker] Step 1 complete";
    });
    expect(tailBlock).toBeInTheDocument();
  });

  it("shows judge failure details for the selected run", async () => {
    renderPage();

    expect(await screen.findByText("Judge failures")).toBeInTheDocument();
    expect(await screen.findByText(/gpt-4\.1 \/ qt1_feasible_seed_1\.json/i)).toBeInTheDocument();
    expect(await screen.findByText(/400 unsupported model/i)).toBeInTheDocument();
  });

  it("switches the log tail to the started dashboard run immediately after start", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start evaluation" }));

    expect(await screen.findByText("Started evaluation process 4242.")).toBeInTheDocument();
    expect((await screen.findAllByText("eval_spec.example-dashboard")).length).toBeGreaterThan(0);
    expect(
      await screen.findByText("/tmp/logs/evaluation/eval_spec.example-dashboard.log"),
    ).toBeInTheDocument();
    expect(await screen.findByText("[Main] Booting dashboard worker")).toBeInTheDocument();
  });
});
