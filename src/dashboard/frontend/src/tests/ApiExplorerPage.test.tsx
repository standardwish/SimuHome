import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "@/store";
import { ApiExplorerContainer } from "@/pages/ApiExplorer/Container";

describe("ApiExplorerPage", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/dashboard/wiki/apis")) {
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: {
                routes: [
                  {
                    method: "GET",
                    path: "/api/dashboard/wiki/apis",
                    name: "get_wiki_apis",
                    summary: "Dashboard route catalog",
                    description: "Description is not provided.",
                    args: [],
                  },
                  {
                    method: "GET",
                    path: "/api/__health__",
                    name: "health_check",
                    summary: "Description is not provided.",
                    description: "Description is not provided.",
                    args: [],
                  },
                  {
                    method: "GET",
                    path: "/api/home/state",
                    name: "home_state",
                    summary: "Get a full home snapshot in home_config format.",
                    description: "Get a full home snapshot in home_config format.",
                    args: [],
                  },
                  {
                    method: "GET",
                    path: "/api/rooms/{room_id}/states",
                    name: "get_room_states",
                    summary:
                      "Get environmental states of a room (temperature, humidity, illuminance, PM10).",
                    description:
                      "Get environmental states of a room (temperature, humidity, illuminance, PM10).",
                    args: [
                      {
                        name: "room_id",
                        type: "str",
                        description: 'Room id (e.g., "living_room")',
                        required: true,
                      },
                    ],
                  },
                  {
                    method: "POST",
                    path: "/api/custom/echo",
                    name: "echo_payload",
                    summary: "Echo a JSON payload",
                    description: "Echo a JSON payload.",
                    args: [
                      {
                        name: "message",
                        type: "string",
                        description: "Message to echo back.",
                        required: false,
                      },
                    ],
                  },
                ],
              },
              error: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.includes("/api/custom/echo")) {
          const rawBody = typeof init?.body === "string" ? init.body : "{}";
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: {
                echoedBody: JSON.parse(rawBody),
              },
              error: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.includes("/api/__health__")) {
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: null,
              error: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (url.includes("/api/home/state")) {
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: { current_tick: 1 },
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

  it("loads the first route by default and executes a selected request", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    expect(await screen.findByDisplayValue("/api/__health__")).toBeInTheDocument();
    expect(screen.getByLabelText("JSON body")).toBeDisabled();

    const routeSelect = screen.getByRole("combobox");
    await user.click(routeSelect);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "POST /api/custom/echo" }));

    expect(screen.getByLabelText("Request path")).toHaveValue("/api/custom/echo");
    expect(screen.getByLabelText("JSON body")).not.toBeDisabled();

    const bodyField = screen.getByLabelText("JSON body");
    await user.clear(bodyField);
    fireEvent.change(bodyField, { target: { value: '{"message":"hello"}' } });
    await user.click(screen.getByRole("button", { name: "Execute" }));

    expect(screen.getAllByText(/"message": "hello"/)).toHaveLength(2);
    expect(screen.queryByText("Explorer executions will be recorded here.")).not.toBeInTheDocument();
  });

  it("shows the full API envelope for responses whose data is null", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    const routeSelect = await screen.findByRole("combobox");
    await user.click(routeSelect);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "GET /api/__health__" }));

    await user.click(screen.getByRole("button", { name: "Execute" }));

    expect((await screen.findAllByText(/"status": \{/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"data": null/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"error": null/).length).toBeGreaterThan(0);
  });

  it("shows explicit missing-description text when a route has no mapped tool docs", async () => {
    render(<ApiExplorerContainer />);

    expect(await screen.findByDisplayValue("/api/__health__")).toBeInTheDocument();
    expect(screen.getAllByText("Description is not provided.").length).toBeGreaterThan(0);
  });

  it("shows tool-derived route description and collapsible args details", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    const routeSelect = await screen.findByRole("combobox");
    await user.click(routeSelect);
    const listbox = await screen.findByRole("listbox");
    await user.click(
      within(listbox).getByRole("option", { name: "GET /api/rooms/{room_id}/states" }),
    );

    expect(screen.getAllByText(/temperature, humidity, illuminance, PM10/i).length).toBeGreaterThan(0);

    const argsToggle = screen.getByRole("button", { name: /arguments/i });
    expect(argsToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("room_id")).not.toBeVisible();

    await user.click(argsToggle);

    expect(argsToggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("room_id")).toBeVisible();
    expect(screen.getByText('Room id (e.g., "living_room")')).toBeVisible();
  });

  it("lets the route catalog list collapse while keeping the route selector visible", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide routes" })).toBeInTheDocument();
    expect(
      screen.getByText("Get a full home snapshot in home_config format."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide routes" }));

    expect(screen.getByRole("button", { name: "Show routes" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.queryByText("Get a full home snapshot in home_config format."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/temperature, humidity, illuminance, PM10/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show routes" }));

    expect(screen.getByRole("button", { name: "Hide routes" })).toBeInTheDocument();
    expect(
      screen.getByText("Get a full home snapshot in home_config format."),
    ).toBeInTheDocument();
  });

  it("groups route selector options by http method", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    const routeSelect = await screen.findByRole("combobox");
    await user.click(routeSelect);

    expect(await screen.findByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "GET /api/__health__" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "POST /api/custom/echo" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "GET /api/dashboard/wiki/apis" }),
    ).not.toBeInTheDocument();
  });

  it("keeps dashboard routes out of the manual route catalog and lists them separately", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    expect(await screen.findByDisplayValue("/api/__health__")).toBeInTheDocument();
    const routePanel = screen.getByText("Route").closest(".MuiPaper-root");
    const dashboardToggle = await screen.findByRole("button", { name: /dashboard apis/i });
    const dashboardPanel = screen.getByRole("region", { name: /dashboard apis reference/i });

    expect(routePanel).not.toBeNull();
    expect(dashboardPanel).not.toBeNull();
    expect(within(routePanel as HTMLElement).queryByText("Dashboard route catalog")).not.toBeInTheDocument();

    await user.click(dashboardToggle);

    expect(within(dashboardPanel).getByText("GET /api/dashboard/wiki/apis")).toBeInTheDocument();
    expect(within(dashboardPanel).getByText("Dashboard route catalog")).toBeInTheDocument();
  });

  it("keeps dashboard APIs collapsed by default and expands them on demand", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    const toggle = await screen.findByRole("button", { name: /dashboard apis/i });
    const hiddenDashboardRoute = screen.getByText("GET /api/dashboard/wiki/apis");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(hiddenDashboardRoute).not.toBeVisible();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("GET /api/dashboard/wiki/apis")).toBeVisible();
  });

  it("renders dashboard API rows without thin divider borders", async () => {
    const user = userEvent.setup();

    render(<ApiExplorerContainer />);

    const toggle = await screen.findByRole("button", { name: /dashboard apis/i });
    await user.click(toggle);

    const routeLabel = await screen.findByText("GET /api/dashboard/wiki/apis");
    const routeRow = routeLabel.closest("div");
    const routeList = routeRow?.parentElement;

    expect(routeRow).not.toBeNull();
    expect(routeList).not.toBeNull();
    expect(getComputedStyle(routeRow as HTMLElement).borderBottomWidth).not.toBe("1px");
    expect(getComputedStyle(routeList as HTMLElement).borderTopWidth).not.toBe("1px");
  });

  it("renders dashboard APIs without an outer paper border shell", async () => {
    render(<ApiExplorerContainer />);

    const dashboardPanel = await screen.findByRole("region", {
      name: /dashboard apis reference/i,
    });

    expect(dashboardPanel.className).not.toContain("MuiPaper-root");
  });
});
