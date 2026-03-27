import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationRunDetailContainer } from "@/pages/GenerationRunDetail/Container";
import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "@/store";

const DETAIL_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    run_id: "demo-generation",
    path: "/tmp/generated/demo-generation",
    manifest: { run_id: "demo-generation" },
    summary: {
      total: 3,
      success: 1,
      failed: 1,
      pending: 1,
      output_dir: "/tmp/generated/demo-generation/episodes",
    },
    seeds: [
      {
        seed: 1,
        status: "success",
        file: "episodes/qt1_feasible_seed_1.json",
        error: null,
        updated_at: "2026-03-27T10:00:00",
      },
      {
        seed: 2,
        status: "failed",
        file: null,
        error: "model timeout",
        updated_at: "2026-03-27T10:01:00",
      },
      {
        seed: 3,
        status: "pending",
        file: null,
        error: null,
        updated_at: "2026-03-27T10:02:00",
      },
    ],
    artifacts: [
      {
        file_name: "qt1_feasible_seed_1.json",
        file_path: "/tmp/generated/demo-generation/episodes/qt1_feasible_seed_1.json",
        seed: 1,
        query_type: "qt1",
        query: "Is the utility room bright?",
        raw_payload: {
          query_type: "qt1",
          query: "Is the utility room bright?",
          messages: [{ role: "user", content: "Question" }],
        },
      },
    ],
    failed_items: [{ seed: 2, error: "model timeout" }],
    pending_seeds: [3],
  },
  error: null,
};

describe("GenerationRunDetailPage", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/local/generations/runs/demo-generation/detail")) {
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

  it("renders seed status, artifact list, and raw JSON preview", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/generation/demo-generation"]}>
        <Routes>
          <Route path="/generation/:runId" element={<GenerationRunDetailContainer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Generation detail" })).toBeInTheDocument();
    expect(await screen.findByText("Seed status")).toBeInTheDocument();
    expect(await screen.findByText("Artifacts")).toBeInTheDocument();
    expect(await screen.findByText(/Seed 2/i)).toBeInTheDocument();
    expect(await screen.findByText(/model timeout/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /qt1_feasible_seed_1\.json/i }));

    expect(await screen.findByText("Artifact preview")).toBeInTheDocument();
    expect(await screen.findByText(/Is the utility room bright\?/i)).toBeInTheDocument();
    expect(await screen.findByText(/"messages"/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Back to runs/i })).toHaveAttribute(
      "href",
      "/generation",
    );
  });
});
