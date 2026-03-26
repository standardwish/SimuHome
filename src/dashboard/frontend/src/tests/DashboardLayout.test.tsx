import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DashboardLayout } from "../DashboardLayout";

function renderLayout(initialEntry = "/simulator") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/simulator" element={<div>Simulator workspace</div>} />
          <Route path="/evaluation" element={<div>Evaluation workspace</div>} />
          <Route path="/api-explorer" element={<div>API explorer workspace</div>} />
          <Route path="/wiki" element={<div>Wiki workspace</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
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

    renderLayout();

    expect(await screen.findByText("API healthy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop API" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start API" })).not.toBeInTheDocument();
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
});
