import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "@/App";
import { resetDashboardRuntimeStore } from "@/store";

describe("App", () => {
  beforeEach(() => {
    resetDashboardRuntimeStore();
  });

  it("renders the simulator workspace by default", async () => {
    render(
      <MemoryRouter initialEntries={["/simulator"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Simulator workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "SimuHome: A Temporal- and Environment-Aware Benchmark for Smart Home LLM Agents",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("ICLR 2026 Oral")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Paper (Arxiv)")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Evaluation" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "API Explorer" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.queryByText("Active section")).not.toBeInTheDocument();
  });

  it("renders the standalone API explorer route", async () => {
    render(
      <MemoryRouter initialEntries={["/api-explorer"]}>
        <App />
      </MemoryRouter>,
    );

    expect((await screen.findAllByRole("heading", { name: "API Explorer" })).length).toBeGreaterThan(0);
  });

  it("renders the wiki route for implemented device metadata", async () => {
    render(
      <MemoryRouter initialEntries={["/wiki"]}>
        <App />
      </MemoryRouter>,
    );

    expect((await screen.findAllByRole("heading", { name: "Devices" })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Implemented device library/i)).length).toBeGreaterThan(0);
  });
});
