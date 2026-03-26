import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimulatorContainer } from "../pages/Simulator/Container";
import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "../store";

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

const FILLED_HOME_STATE = {
  status: { code: 200, message: "OK" },
  data: {
    tick_interval: 0.5,
    current_tick: 0,
    current_time: "2026-03-26 00:00:00",
    base_time: "2026-03-26 00:00:00",
    rooms: {
      living_room: {
        state: {
          illuminance: 420,
          temperature: 2250,
        },
        devices: [{ device_id: "living_room_light_1", device_type: "on_off_light", attributes: {} }],
      },
    },
  },
  error: null,
};

const DEVICE_STRUCTURE = {
  status: { code: 200, message: "OK" },
  data: {
    device_id: "living_room_light_1",
    device_type: "on_off_light",
    endpoints: {
      "1": {
        clusters: {
          OnOff: {
            cluster_id: "OnOff",
            attributes: {
              OnOff: { value: false, type: "bool", readonly: false },
            },
            commands: ["On", "Off"],
          },
        },
      },
    },
  },
  error: null,
};

const DEVICE_ATTRIBUTES = {
  status: { code: 200, message: "OK" },
  data: {
    "1.OnOff.OnOff": false,
  },
  error: null,
};

describe("SimulatorPage", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    let resetTriggered = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/home/state")) {
          return new Response(JSON.stringify(resetTriggered ? FILLED_HOME_STATE : EMPTY_HOME_STATE), {
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
        if (url.includes("/api/devices/living_room_light_1/structure")) {
          return new Response(JSON.stringify(DEVICE_STRUCTURE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/devices/living_room_light_1/attributes")) {
          return new Response(JSON.stringify(DEVICE_ATTRIBUTES), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/simulation/reset")) {
          resetTriggered = true;
          return new Response(
            JSON.stringify({
              status: { code: 200, message: "OK" },
              data: { meta: { num_rooms: 4 } },
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

  it("keeps the live snapshot viewport stable when no rooms are present", async () => {
    render(<SimulatorContainer />);

    expect(
      await screen.findByText("No rooms are available in the current snapshot."),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("live-home-snapshot-viewport")).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "Workflows" })).toBeInTheDocument();
  });

  it("uses a slider for tick interval control", async () => {
    render(<SimulatorContainer />);

    expect(await screen.findByRole("slider", { name: /tick interval/i })).toBeInTheDocument();
  });

  it("can initialize a demo home when the snapshot is empty", async () => {
    const user = userEvent.setup();
    render(<SimulatorContainer />);

    await user.click(await screen.findByRole("button", { name: /initialize demo home/i }));

    expect(await screen.findByTestId("room-living_room")).toBeInTheDocument();
    expect((await screen.findAllByText("Living Room")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("living_room_light_1")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("on_off_light")).length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: /run command/i })).toBeInTheDocument();
  });

  it("opens the device inspector from the floor plan", async () => {
    const user = userEvent.setup();
    render(<SimulatorContainer />);

    await user.click(await screen.findByRole("button", { name: /initialize demo home/i }));
    await user.click(await screen.findByTestId("device-living_room_light_1"));

    expect(await screen.findByText("Selected device")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("living_room_light_1")).toBeInTheDocument();
    expect(await screen.findByText("1.OnOff.OnOff")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("{}")).toBeInTheDocument();
  });
});
