import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import { Layout } from "@/Layout";
import { SimulatorContainer } from "@/pages/Simulator/Container";
import { resetDashboardRuntimeStore } from "@/store";

function renderLayout(initialEntry = "/simulator", simulatorElement: ReactNode = <div>Simulator workspace</div>) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/simulator" element={simulatorElement} />
          <Route path="/evaluation" element={<div>Evaluation workspace</div>} />
          <Route path="/generation" element={<div>Generation workspace</div>} />
          <Route path="/api-explorer" element={<div>API explorer workspace</div>} />
          <Route path="/wiki" element={<div>Wiki workspace</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetDashboardRuntimeStore();
  });

  it("shows a stop action when the API server is healthy", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/__health__")) {
        return new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: {},
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: { code: 404, message: "Not Found" },
          data: null,
          error: { type: "not_found", detail: `Unhandled request: ${url}` },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout("/simulator", <SimulatorContainer />);

    expect(await screen.findByText("API healthy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop API" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start API" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Health checks and dashboard polling run every 5 seconds."),
    ).toBeInTheDocument();
  });

  it("shows a start action when the API server is offline", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/__health__")) {
        return new Response(
          JSON.stringify({
            status: { code: 503, message: "SERVICE_UNAVAILABLE" },
            data: null,
            error: { type: "CONNECTION_ERROR", detail: "offline" },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: { code: 404, message: "Not Found" },
          data: null,
          error: { type: "not_found", detail: `Unhandled request: ${url}` },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout();

    expect(await screen.findByText("API offline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start API" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop API" })).not.toBeInTheDocument();
  });

  it("dispatches the correct control actions and links the oral badge to the conference page", async () => {
    const stopFetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: {},
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: { ok: true, action: "stop" },
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", stopFetchMock);

    const stopView = renderLayout();

    fireEvent.click(await screen.findByRole("button", { name: "Stop API" }));

    await waitFor(() => {
      expect(stopFetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/__dashboard_control/stop-api"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(
      screen.getByRole("link", { name: "ICLR 2026 Oral" }),
    ).toHaveAttribute("href", "https://iclr.cc/Conferences/2026");

    stopView.unmount();

    const startFetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: { code: 503, message: "SERVICE_UNAVAILABLE" },
            data: null,
            error: { type: "CONNECTION_ERROR", detail: "offline" },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, action: "start" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: {},
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", startFetchMock);

    renderLayout();

    expect(await screen.findByText("API offline")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Start API" }));

    await waitFor(() => {
      expect(startFetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/__dashboard_control/start-api"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("avoids non-health polling while the API server is offline", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/__health__")) {
        return new Response(
          JSON.stringify({
            status: { code: 503, message: "SERVICE_UNAVAILABLE" },
            data: null,
            error: { type: "CONNECTION_ERROR", detail: "offline" },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/api/home/state") || url.includes("/api/schedule/workflows")) {
        const data = url.includes("/api/home/state")
          ? {
              tick_interval: 0.5,
              current_tick: 7,
              current_time: "2026-03-26T00:00:07",
              base_time: "2026-03-26T00:00:00",
              rooms: {},
            }
          : [];
        return new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data,
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: { code: 404, message: "Not Found" },
          data: null,
          error: { type: "not_found", detail: `Unhandled request: ${url}` },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout("/simulator", <SimulatorContainer />);

    expect(await screen.findByText("API offline")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/home/state"),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/schedule/workflows"),
      expect.anything(),
    );
  });

  it("shows the fixed 5-second polling note instead of a configurable control", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/__health__")) {
        return new Response(
          JSON.stringify({
            status: { code: 503, message: "SERVICE_UNAVAILABLE" },
            data: null,
            error: { type: "CONNECTION_ERROR", detail: "offline" },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: { code: 404, message: "Not Found" },
          data: null,
          error: { type: "not_found", detail: `Unhandled request: ${url}` },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout("/simulator", <SimulatorContainer />);

    expect(await screen.findByText("API offline")).toBeInTheDocument();
    expect(
      screen.getByText("Health checks and dashboard polling run every 5 seconds."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /polling interval/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the Generation navigation tab", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/__health__")) {
        return new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: {},
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: { code: 404, message: "Not Found" },
          data: null,
          error: { type: "not_found", detail: `Unhandled request: ${url}` },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout("/generation");

    expect(await screen.findByText("API healthy")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Generation" })).toBeInTheDocument();
    expect(screen.getByText("Generation workspace")).toBeInTheDocument();
  });
});
