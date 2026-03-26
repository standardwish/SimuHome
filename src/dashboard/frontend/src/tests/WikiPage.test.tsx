import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDashboardRuntimeStore, useDashboardRuntimeStore } from "../store";

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
  const { WikiContainer } = await import("../pages/Wiki/Container");
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/wiki" element={<WikiContainer />} />
        <Route path="/wiki/:deviceType" element={<WikiContainer />} />
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
        if (url.includes("/api/wiki/device-types/on_off_light")) {
          return new Response(JSON.stringify(DEVICE_DETAIL_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/wiki/device-types")) {
          return new Response(JSON.stringify(DEVICE_TYPES_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/wiki/clusters/OnOff")) {
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
    const { WikiContainer } = await import("../pages/Wiki/Container");
    expect(WikiContainer).toBeTypeOf("function");
  });

  it("renders the wiki index as a linked device directory", async () => {
    await renderWiki("/wiki");

    expect(await screen.findByRole("heading", { name: "Wiki" })).toBeInTheDocument();
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
    expect(await screen.findByText("OnOffCluster")).toBeInTheDocument();
    expect(await screen.findByText(/Commands and attributes\./i)).toBeInTheDocument();
  });

  it("renders a device detail route directly", async () => {
    await renderWiki("/wiki/on_off_light");

    expect(
      (await screen.findAllByRole("link", { name: /back to device list/i })).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "on_off_light" })).toBeInTheDocument();
    expect(await screen.findByText("Registry source")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Commands and attributes\./i)).toBeInTheDocument();
    });
  });
});
