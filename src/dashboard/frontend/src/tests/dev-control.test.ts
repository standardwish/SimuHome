// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createDashboardApiProxyMiddleware,
  DASHBOARD_CONTROL_PATHS,
  createDashboardControlMiddleware,
  runDashboardControlCommand,
} from "../../dev-control";

describe("dev-control", () => {
  it("runs the start command from the repository root", async () => {
    const execFileMock = vi.fn((_file, _args, _options, callback) => {
      callback(null, "started", "");
      return {} as never;
    });

    await runDashboardControlCommand("start", execFileMock as never);

    expect(execFileMock).toHaveBeenCalledWith(
      "uv",
      ["run", "simuhome", "server-start", "--port", "8000"],
      expect.objectContaining({
        cwd: expect.stringMatching(/SimuHome$/),
      }),
      expect.any(Function),
    );
  });

  it("handles the start control endpoint", async () => {
    const execFileMock = vi.fn((_file, _args, _options, callback) => {
      callback(null, "started", "");
      return {} as never;
    });
    const middleware = createDashboardControlMiddleware(execFileMock as never);
    const next = vi.fn();
    let body = "";
    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      end(chunk: string) {
        body = chunk;
      },
    };

    middleware(
      { method: "POST", url: DASHBOARD_CONTROL_PATHS.start } as never,
      response as never,
      next,
    );

    await vi.waitFor(() => {
      expect(response.statusCode).toBe(200);
    });

    expect(JSON.parse(body)).toEqual({ ok: true, action: "start" });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes through non-control requests", () => {
    const middleware = createDashboardControlMiddleware();
    const next = vi.fn();

    middleware(
      { method: "GET", url: "/api/__health__" } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it("proxies api requests to the dashboard backend", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("# On/Off Cluster", {
        status: 200,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      }),
    );
    const middleware = createDashboardApiProxyMiddleware(fetchMock);
    const next = vi.fn();
    let body = "";
    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      end(chunk?: string | Buffer) {
        body =
          typeof chunk === "string"
            ? chunk
            : chunk
              ? Buffer.from(chunk).toString("utf-8")
              : "";
      },
    };

    middleware(
      {
        method: "GET",
        url: "/api/wiki/clusters/OnOff/raw",
        headers: { accept: "text/markdown" },
      } as never,
      response as never,
      next,
    );

    await vi.waitFor(() => {
      expect(response.statusCode).toBe(200);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/wiki/clusters/OnOff/raw",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(body).toContain("On/Off Cluster");
    expect(next).not.toHaveBeenCalled();
  });

  it("passes through non-api requests in the api proxy middleware", () => {
    const middleware = createDashboardApiProxyMiddleware();
    const next = vi.fn();

    middleware(
      { method: "GET", url: "/wiki/on_off_light", headers: {} } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
