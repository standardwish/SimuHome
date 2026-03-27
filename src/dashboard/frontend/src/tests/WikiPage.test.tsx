import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "@/store";

const DEVICE_TYPES_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    device_types: ["on_off_light", "air_conditioner"],
    devices: [
      {
        device_type: "on_off_light",
        endpoint_ids: ["1"],
        cluster_count: 2,
        attribute_count: 5,
        command_count: 3,
        doc_cluster_count: 1,
        implementation: {
          class_name: "OnOffLight",
          module: "src.simulator.domain.devices.on_off_light",
          source_file: "/tmp/on_off_light.py",
        },
      },
      {
        device_type: "air_conditioner",
        endpoint_ids: ["1", "2"],
        cluster_count: 4,
        attribute_count: 14,
        command_count: 5,
        doc_cluster_count: 2,
        implementation: {
          class_name: "AirConditioner",
          module: "src.simulator.domain.devices.air_conditioner",
          source_file: "/tmp/air_conditioner.py",
        },
      },
    ],
    source: "device_factory",
  },
  error: null,
};

const AGGREGATORS_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    aggregator_types: ["temperature", "pm10", "illuminance", "humidity"],
    aggregators: [
      {
        aggregator_type: "temperature",
        environment_signal: "Temperature",
        unit: "°C",
        baseline_value: 2500,
        current_value: 2500,
        interested_device_types: ["air_conditioner", "heat_pump", "fan"],
        summary: "Tracks room temperature from HVAC and air movement devices.",
      },
      {
        aggregator_type: "illuminance",
        environment_signal: "Illuminance",
        unit: "lux",
        baseline_value: 1000,
        current_value: 1000,
        interested_device_types: ["on_off_light", "dimmable_light"],
        summary: "Tracks perceived brightness from lighting devices.",
      },
    ],
    source: "aggregator_registry",
  },
  error: null,
};

const AGGREGATOR_DETAIL_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    aggregator_type: "temperature",
    environment_signal: "Temperature",
    unit: "°C",
    baseline_value: 2500,
    current_value: 2500,
    interested_device_types: ["air_conditioner", "heat_pump", "fan"],
    summary: "Tracks room temperature from HVAC and air movement devices.",
    mechanism:
      "Uses heat exchange from active HVAC devices and passive restoration toward the baseline.",
    formula_readable:
      "current_value(t+1) = current_value(t) + device_effects + restoration toward baseline",
    formula_code:
      "restoration_delta = baseline_value - current_value\ncurrent_value += total_effect\ncurrent_value += restoration_delta * restoration_rate_per_second * tick_interval",
    formula_settings: [
      {
        name: "tick_interval",
        value: 0.1,
        description: "Simulation tick duration used by the aggregator update loop.",
      },
      {
        name: "delta",
        value: 0,
        description: "Current restoration gap computed as baseline_value - current_value.",
      },
      {
        name: "restoration_rate_per_second",
        value: 0.0002,
        description: "Passive return speed toward the baseline temperature.",
      },
    ],
    sensor_sync:
      "Thermostat and temperature-reporting sensor clusters are synchronized from the aggregated environment state.",
    implementation: {
      class_name: "TemperatureAggregator",
      module: "src.simulator.domain.aggregators.temperature",
      source_file: "/tmp/temperature.py",
    },
    source: "aggregator_registry",
  },
  error: null,
};

const LEGACY_AGGREGATOR_DETAIL_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    aggregator_type: "temperature",
    environment_signal: "Temperature",
    unit: "°C",
    baseline_value: 2500,
    current_value: 2500,
    interested_device_types: ["air_conditioner", "heat_pump", "fan"],
    summary: "Tracks room temperature from HVAC and air movement devices.",
    mechanism:
      "Uses heat exchange from active HVAC devices and passive restoration toward the baseline.",
    formula_readable:
      "current_value(t+1) = current_value(t) + device_effects + restoration toward baseline",
    formula_code:
      "restoration_delta = baseline_value - current_value\ncurrent_value += total_effect\ncurrent_value += restoration_delta * restoration_rate_per_second * tick_interval",
    sensor_sync:
      "Thermostat and temperature-reporting sensor clusters are synchronized from the aggregated environment state.",
    implementation: {
      class_name: "TemperatureAggregator",
      module: "src.simulator.domain.aggregators.temperature",
      source_file: "/tmp/temperature.py",
    },
    source: "aggregator_registry",
  },
  error: null,
};

const DEVICE_DETAIL_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    device_type: "on_off_light",
    structure: {
      device_id: "on_off_light",
      device_type: "on_off_light",
      endpoints: {
        "1": {
          clusters: {
            OnOff: {
              cluster_id: "OnOff",
              attributes: {
                OnOff: { value: false, type: "bool", readonly: true },
              },
              commands: ["Off", "On", "Toggle"],
            },
          },
        },
      },
    },
    clusters: {
      OnOff: {
        cluster_id: "OnOff",
        attributes: {
          OnOff: { value: false, type: "bool", readonly: true },
        },
        commands: ["Off", "On", "Toggle"],
        command_args: {},
        doc_path: "/data2/pyojunseong/SimuHome/docs/clusters/On_Off_Cluster.md",
        implementation: {
          class_name: "OnOffCluster",
          module: "src.simulator.domain.clusters.onoff",
          source_file: "/tmp/onoff.py",
        },
        metadata: {
          supported_features: 0,
        },
      },
    },
    implementation: {
      class_name: "OnOffLight",
      module: "src.simulator.domain.devices.on_off_light",
      source_file: "/tmp/on_off_light.py",
    },
    metadata: {
      tick_interval: 0.1,
    },
    source: "device_factory",
  },
  error: null,
};

const CLUSTER_DOC_RESPONSE = {
  status: { code: 200, message: "OK" },
  data: {
    cluster_id: "OnOff",
    path: "/data2/pyojunseong/SimuHome/docs/clusters/On_Off_Cluster.md",
    content: "# On/Off Cluster\n\nCommands and attributes.",
  },
  error: null,
};

async function renderWiki(initialEntry: string) {
  const { WikiContainer } = await import("@/pages/Wiki/Container");
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/wiki" element={<WikiContainer />} />
        <Route path="/wiki/:deviceType" element={<WikiContainer />} />
        <Route path="/wiki/aggregators" element={<WikiContainer />} />
        <Route path="/wiki/aggregators/:aggregatorType" element={<WikiContainer />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WikiPage", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
    useDashboardRuntimeStore.setState({ apiHealthy: true, pollingIntervalMs: 5000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/dashboard/wiki/aggregators/temperature")) {
          return new Response(JSON.stringify(AGGREGATOR_DETAIL_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/wiki/aggregators")) {
          return new Response(JSON.stringify(AGGREGATORS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/wiki/device-types/on_off_light")) {
          return new Response(JSON.stringify(DEVICE_DETAIL_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/wiki/device-types")) {
          return new Response(JSON.stringify(DEVICE_TYPES_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/wiki/clusters/OnOff")) {
          return new Response(JSON.stringify(CLUSTER_DOC_RESPONSE), {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports a wiki container for route composition", async () => {
    const { WikiContainer } = await import("@/pages/Wiki/Container");
    expect(WikiContainer).toBeTypeOf("function");
  });

  it("renders the wiki index as a linked device directory", async () => {
    await renderWiki("/wiki");

    expect(await screen.findByRole("heading", { name: "Devices", level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Wiki" })).not.toBeInTheDocument();
    const deviceLink = await screen.findByRole("link", { name: /on_off_light/i });
    expect(deviceLink).toHaveAttribute("href", "/wiki/on_off_light");
    expect(screen.queryByText("Back to device list")).not.toBeInTheDocument();
  });

  it("navigates to a dedicated device route when a device is clicked", async () => {
    const user = userEvent.setup();
    await renderWiki("/wiki");

    await user.click(await screen.findByRole("link", { name: /on_off_light/i }));

    expect(
      (await screen.findAllByRole("link", { name: /back to device list/i })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Devices", level: 3 })).not.toBeInTheDocument();
    expect(await screen.findByText("OnOffCluster")).toBeInTheDocument();
    expect(await screen.findByText(/Commands and attributes\./i)).toBeInTheDocument();
  });

  it("renders a device detail route directly", async () => {
    await renderWiki("/wiki/on_off_light");

    expect(
      (await screen.findAllByRole("link", { name: /back to device list/i })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Devices", level: 3 })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "on_off_light", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Wiki" })).not.toBeInTheDocument();
    expect(await screen.findByText("Registry source")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Commands and attributes\./i)).toBeInTheDocument();
    });
  });

  it("links the cluster doc file to a browser-accessible markdown endpoint", async () => {
    await renderWiki("/wiki/on_off_light");

    const docFileLink = await screen.findByRole("link", {
      name: /on_off_cluster\.md/i,
    });

    expect(docFileLink).toHaveAttribute(
      "href",
      expect.stringContaining("/api/dashboard/wiki/clusters/OnOff/raw"),
    );
    expect(docFileLink).not.toHaveAttribute(
      "href",
      "/data2/pyojunseong/SimuHome/docs/clusters/On_Off_Cluster.md",
    );
  });

  it("renders the aggregators section as a linked directory", async () => {
    await renderWiki("/wiki/aggregators");

    expect(await screen.findByRole("heading", { name: "Aggregators", level: 3 })).toBeInTheDocument();
    const aggregatorLink = await screen.findByRole("link", { name: /temperature/i });
    expect(aggregatorLink).toHaveAttribute("href", "/wiki/aggregators/temperature");
    expect(await screen.findByText(/Tracks room temperature/i)).toBeInTheDocument();
  });

  it("renders an aggregator detail route directly", async () => {
    await renderWiki("/wiki/aggregators/temperature");

    expect(await screen.findByRole("heading", { name: "temperature", level: 3 })).toBeInTheDocument();
    expect(await screen.findByText(/heat exchange/i)).toBeInTheDocument();
    expect(await screen.findByText(/current_value\(t\+1\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/restoration_delta = baseline_value - current_value/i)).toBeInTheDocument();
    expect(await screen.findByText("restoration_rate_per_second")).toBeInTheDocument();
    expect(await screen.findByText("0.0002")).toBeInTheDocument();
    expect(await screen.findByText("delta")).toBeInTheDocument();
    expect(await screen.findByText(/air_conditioner/i)).toBeInTheDocument();
    expect(await screen.findByText(/TemperatureAggregator/i)).toBeInTheDocument();
  });

  it("does not crash when formula settings are missing from aggregator detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/api/dashboard/wiki/aggregators/temperature")) {
          return new Response(JSON.stringify(LEGACY_AGGREGATOR_DETAIL_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/dashboard/wiki/aggregators")) {
          return new Response(JSON.stringify(AGGREGATORS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(DEVICE_TYPES_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    await renderWiki("/wiki/aggregators/temperature");

    expect(await screen.findByRole("heading", { name: "temperature", level: 3 })).toBeInTheDocument();
    expect(await screen.findByText("No formula settings available.")).toBeInTheDocument();
  });
});
