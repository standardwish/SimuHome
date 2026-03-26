import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimulatorPage } from "../SimulatorPage";

const EMPTY_HOME_STATE = {
  status: { code: 200, message: "OK" },
  data: {
    tick_interval: 0.5,
    current_tick: 7,
    current_time: "2026-03-26T00:00:07",
    base_time: "2026-03-26T00:00:00",
    rooms: {},
  },
  error: null,
};

const EMPTY_WORKFLOWS = {
  status: { code: 200, message: "OK" },
  data: [],
  error: null,
};

describe("SimulatorPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/home/state")) {
          return new Response(JSON.stringify(EMPTY_HOME_STATE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/schedule/workflows")) {
          return new Response(JSON.stringify(EMPTY_WORKFLOWS), {
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

  it("keeps the live snapshot viewport stable when no rooms are present", async () => {
    render(<SimulatorPage />);

    expect(
      await screen.findByText("No rooms are available in the current snapshot."),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("live-home-snapshot-viewport")).toBeInTheDocument();
    expect(await screen.findByText("No scheduled workflows.")).toBeInTheDocument();
  });

  it("uses a slider for tick interval control", async () => {
    render(<SimulatorPage />);

    expect(await screen.findByRole("slider", { name: /tick interval/i })).toBeInTheDocument();
  });
});
