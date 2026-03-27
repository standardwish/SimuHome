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
        if (url.includes("/api/wiki/apis")) {
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: {
                routes: [
                  {
                    method: "GET",
                    path: "/api/home/state",
                    name: "home_state",
                    summary: "Read the current state snapshot",
                  },
                  {
                    method: "POST",
                    path: "/api/custom/echo",
                    name: "echo_payload",
                    summary: "Echo a JSON payload",
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

    expect(await screen.findByDisplayValue("/api/home/state")).toBeInTheDocument();
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
});
