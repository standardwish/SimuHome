import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvaluationRunDetailContainer } from "../pages/EvaluationRunDetail/Container";
import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "../store";

const DETAIL_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    run_id: "example_qt1_seed_1_3_5",
    path: "/tmp/experiments/example_qt1_seed_1_3_5",
    summary: {
      total: 4,
      success: 3,
      failed: 1,
      pending: 0,
    },
    models: [
      {
        model: "gpt-4.1",
        path: "/tmp/experiments/example_qt1_seed_1_3_5/gpt-4.1",
        artifacts: [
          {
            file_name: "qt1_feasible_seed_1.json",
            file_path:
              "/tmp/experiments/example_qt1_seed_1_3_5/gpt-4.1/qt1_feasible_seed_1.json",
            query_type: "qt1",
            case: "feasible",
            seed: 1,
            duration: 4.7,
            score: -1,
            error_type: "Judge Error",
            final_answer: "Utility room is bright; bathroom is dim.",
            required_actions: {
              total: 2,
              invoked: 2,
            },
            judge: ["Error", "Error", "Error"],
            judge_error_details: [
              "Unsupported value: 'temperature' does not support 0.0 with this model.",
            ],
            tools_invoked: [
              {
                tool: "get_room_states",
                ok: true,
                status_code: 200,
                error_type: null,
              },
            ],
            steps: [
              {
                step: 1,
                thought: "Check utility room.",
                action: "get_room_states",
                action_input: { room_id: "utility_room" },
              },
              {
                step: 2,
                thought: "Answer.",
                action: "finish",
                action_input: { answer: "Utility room is bright; bathroom is dim." },
              },
            ],
          },
          {
            file_name: "qt1_feasible_seed_2.json",
            file_path:
              "/tmp/experiments/example_qt1_seed_1_3_5/gpt-4.1/qt1_feasible_seed_2.json",
            query_type: "qt1",
            case: "feasible",
            seed: 2,
            duration: 3.9,
            score: 1,
            error_type: null,
            final_answer: "Bathroom is dim.",
            required_actions: {
              total: 1,
              invoked: 1,
            },
            judge: ["A", "A", "A"],
            tools_invoked: [],
          },
        ],
      },
    ],
  },
  error: null,
};

describe("EvaluationRunDetailPage", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/local/evaluations/runs/example_qt1_seed_1_3_5/detail")) {
          return new Response(JSON.stringify(DETAIL_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/__health__")) {
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: {},
              error: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
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

  it("renders a full-width run detail view with model groups and artifact cards", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/evaluation/example_qt1_seed_1_3_5"]}>
        <Routes>
          <Route path="/evaluation/:runId" element={<EvaluationRunDetailContainer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Run detail" })).toBeInTheDocument();
    expect(await screen.findByText("Total")).toBeInTheDocument();

    const modelAccordion = await screen.findByRole("button", { name: /gpt-4\.1/i });
    expect(modelAccordion).toHaveAttribute("aria-expanded", "false");
    await user.click(modelAccordion);
    expect(modelAccordion).toHaveAttribute("aria-expanded", "true");

    const artifactAccordion = await screen.findByRole("button", {
      name: /qt1_feasible_seed_1\.json/i,
    });
    expect(artifactAccordion).toHaveAttribute("aria-expanded", "false");
    await user.click(artifactAccordion);
    expect(artifactAccordion).toHaveAttribute("aria-expanded", "true");

    expect((await screen.findAllByText(/Utility room is bright/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Unsupported value: 'temperature'/i)).toBeInTheDocument();
    expect(await screen.findByText("Step timeline")).toBeInTheDocument();
    expect(await screen.findByText(/Check utility room\./i)).toBeInTheDocument();
    expect(await screen.findByText("get_room_states")).toBeInTheDocument();
    expect(screen.queryByText("Spec preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Manifest")).not.toBeInTheDocument();
    expect(screen.queryByText("Run state")).not.toBeInTheDocument();

    const secondArtifactAccordion = await screen.findByRole("button", {
      name: /qt1_feasible_seed_2\.json/i,
    });
    await user.click(secondArtifactAccordion);
    expect(await screen.findByText("Bathroom is dim.")).toBeInTheDocument();
  });
});
