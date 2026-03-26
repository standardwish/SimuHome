// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
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
});
