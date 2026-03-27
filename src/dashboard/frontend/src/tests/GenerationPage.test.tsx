import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationRunsPanel } from "@/components/Generation/GenerationRunsPanel";
import { GenerationContainer } from "@/pages/Generation/Container";
import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "@/store";

function renderPage() {
  return render(
    <MemoryRouter>
      <GenerationContainer />
    </MemoryRouter>,
  );
}

const RUNTIME_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    experiments_dir: "/tmp/experiments",
    exists: true,
    eval_spec_example: "/data2/pyojunseong/SimuHome/eval_spec.example.yaml",
    generation_runs_dir: "/tmp/generated",
    generation_exists: true,
    gen_spec_example: "/data2/pyojunseong/SimuHome/gen_spec.example.yaml",
  },
  error: null,
};

const RUNS_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    runs: [
      {
        run_id: "demo-generation",
        path: "/tmp/generated/demo-generation",
        has_summary: true,
        manifest: { run_id: "demo-generation" },
        state: { generation: { total: 3, completed: 1, failed: 1, pending: 1 } },
        summary: { total: 3, success: 1, failed: 1, pending: 1 },
      },
    ],
  },
  error: null,
};

const LOGS_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    run_id: "demo-generation",
    log_path: "/tmp/logs/generation/demo-generation.log",
    lines: ["[generation] seed=1 complete", "[generation] seed=2 failed"],
  },
  error: null,
};

const START_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    accepted: true,
    pid: 6060,
    log_path: "/tmp/logs/generation/gen_spec.example-dashboard.log",
    mode: "start",
  },
  error: null,
};

const PREVIEW_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    path: "/data2/pyojunseong/SimuHome/gen_spec.example.yaml",
    exists: true,
    valid: true,
    summary: {
      schema: "simuhome-gen-spec-v1",
      run_id: "demo-generation",
      output_root: "data/benchmark",
      selection: {
        qt: "qt4-2",
        case: "feasible",
        seed: "1-3",
      },
      base_date: "2025-08-23",
      home: {
        room_count: 5,
        devices_per_room: { min: 4, max: 7 },
        environment: {
          path: "configs/home/demo.json",
          schema: "hidden-home-schema",
        },
      },
      llm: {
        model: "gpt-5-mini",
        api_base: "https://openrouter.ai/api/v1",
        api_key_source: "env:OPENROUTER_API_KEY",
        temperature: 1,
        schema: "hidden-llm-schema",
      },
    },
    raw_text: "schema: simuhome-gen-spec-v1\nrun:\n  id: demo-generation\n",
  },
  error: null,
};

describe("GenerationContainer", () => {
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
        if (url.includes("/api/dashboard/local/generations/start")) {
          return new Response(JSON.stringify(START_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/generations/runs/gen_spec.example-dashboard/logs")) {
          return new Response(
            JSON.stringify({
              ...LOGS_RESPONSE,
              data: {
                run_id: "gen_spec.example-dashboard",
                log_path: "/tmp/logs/generation/gen_spec.example-dashboard.log",
                lines: ["[generation] booting worker"],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.includes("/api/dashboard/local/generations/runs/demo-generation/logs")) {
          return new Response(JSON.stringify(LOGS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/generations/runs")) {
          return new Response(JSON.stringify(RUNS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/local/generations/spec-preview")) {
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

  it("shows generation spec preview details in the right rail", async () => {
    renderPage();

    expect(await screen.findByText("Spec preview")).toBeInTheDocument();
    expect((await screen.findAllByText("demo-generation")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/gpt-5-mini/i)).toBeInTheDocument();
    expect(await screen.findByText(/2025-08-23/i)).toBeInTheDocument();
    expect(await screen.findByText("devices_per_room.min")).toBeInTheDocument();
    expect(await screen.findByText("environment.path")).toBeInTheDocument();
    expect(screen.queryByText("api_key_source")).not.toBeInTheDocument();
    expect(screen.queryByText("Schema")).not.toBeInTheDocument();
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(await screen.findByText("LLM")).toBeInTheDocument();
    expect(screen.getByText("Home")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("LLM")).toHaveStyle({ fontWeight: "700" });
    expect(screen.queryByText("Spec YAML")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-home-schema")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-llm-schema")).not.toBeInTheDocument();
    expect(screen.getByText("https://openrouter.ai/api/v1")).toHaveStyle({
      whiteSpace: "nowrap",
    });
    expect(screen.getByTestId("generation-spec-preview-scroll-area")).toHaveStyle({
      overflowX: "auto",
    });
    expect(screen.getByTestId("generation-spec-preview-scroll-area")).toHaveStyle({
      overflowY: "auto",
    });
    expect(screen.getByTestId("generation-spec-preview-scroll-area")).toHaveStyle({
      scrollbarWidth: "none",
    });
  });

  it("shows a live dashboard log tail for the selected generation run", async () => {
    renderPage();

    expect(await screen.findByText("/tmp/logs/generation/demo-generation.log")).toBeInTheDocument();
    const tailBlock = await screen.findByText((content, node) => {
      return node?.textContent === "[generation] seed=1 complete\n[generation] seed=2 failed";
    });
    expect(tailBlock).toBeInTheDocument();
  });

  it("switches the log tail to the started dashboard run immediately after start", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start generation" }));

    expect(await screen.findByText("Started generation process 6060.")).toBeInTheDocument();
    expect((await screen.findAllByText("gen_spec.example-dashboard")).length).toBeGreaterThan(0);
    expect(
      await screen.findByText("/tmp/logs/generation/gen_spec.example-dashboard.log"),
    ).toBeInTheDocument();
    expect(await screen.findByText("[generation] booting worker")).toBeInTheDocument();
  });

  it("truncates the selected run value inside the complete runs strip", () => {
    const longRunId = "very-long-generation-run-id-that-should-truncate-inside-the-complete-runs-strip";

    render(
      <MemoryRouter>
        <GenerationRunsPanel
          runs={[
            {
              run_id: longRunId,
              path: "/tmp/generated/demo-generation",
              has_summary: true,
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
      </MemoryRouter>,
    );

    const selectedRunValue = screen
      .getAllByText(longRunId)
      .find((node) => node.tagName.toLowerCase() === "h5");
    expect(selectedRunValue).toHaveStyle({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });
});
