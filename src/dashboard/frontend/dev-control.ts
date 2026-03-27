import { execFile } from "node:child_process";
import { resolve } from "node:path";

export const DASHBOARD_CONTROL_PATHS = {
  start: "/__dashboard_control/start-api",
  stop: "/__dashboard_control/stop-api",
} as const;

type DashboardControlAction = "start" | "stop";
type ExecFileImpl = typeof execFile;
type FetchImpl = typeof fetch;
type MiddlewareRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  on?(event: "data" | "end" | "error", listener: (chunk?: Buffer) => void): void;
};
type MiddlewareResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string | Buffer): void;
};

const REPO_ROOT = resolve(__dirname, "../../..");
const API_PORT = "8000";
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;

function commandArgs(action: DashboardControlAction): string[] {
  return [
    "run",
    "simuhome",
    action === "start" ? "server-start" : "server-stop",
    "--port",
    API_PORT,
  ];
}

export function runDashboardControlCommand(
  action: DashboardControlAction,
  execFileImpl: ExecFileImpl = execFile,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    execFileImpl(
      "uv",
      commandArgs(action),
      { cwd: REPO_ROOT },
      (error, stdout, stderr) => {
        if (error) {
          rejectPromise(new Error(stderr.trim() || stdout.trim() || error.message));
          return;
        }
        resolvePromise({ stdout, stderr });
      },
    );
  });
}

export function createDashboardControlMiddleware(
  execFileImpl: ExecFileImpl = execFile,
) {
  return (
    req: { method?: string; url?: string },
    res: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      end(chunk: string): void;
    },
    next: () => void,
  ) => {
    const pathname = req.url?.split("?")[0];
    const action: DashboardControlAction | null =
      req.method === "POST" && pathname === DASHBOARD_CONTROL_PATHS.start
        ? "start"
        : req.method === "POST" && pathname === DASHBOARD_CONTROL_PATHS.stop
          ? "stop"
          : null;

    if (!action) {
      next();
      return;
    }

    void runDashboardControlCommand(action, execFileImpl)
      .then(() => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, action }));
      })
      .catch((error: unknown) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: false,
            action,
            error: error instanceof Error ? error.message : "Control command failed",
          }),
        );
      });
  };
}

function shouldReadBody(method: string | undefined): boolean {
  return Boolean(method && !["GET", "HEAD"].includes(method));
}

function readRequestBody(req: MiddlewareRequest): Promise<Buffer | undefined> {
  if (!shouldReadBody(req.method) || typeof req.on !== "function") {
    return Promise.resolve(undefined);
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    req.on?.("data", (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    });
    req.on?.("end", () => {
      resolvePromise(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
    });
    req.on?.("error", () => {
      rejectPromise(new Error("Failed to read dashboard proxy request body"));
    });
  });
}

function normalizeRequestHeaders(
  headers: MiddlewareRequest["headers"],
): Headers | undefined {
  if (!headers) {
    return undefined;
  }

  const normalized = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    normalized.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return normalized;
}

export function createDashboardApiProxyMiddleware(fetchImpl: FetchImpl = fetch) {
  return async (
    req: MiddlewareRequest,
    res: MiddlewareResponse,
    next: () => void,
  ) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (!pathname.startsWith("/api")) {
      next();
      return;
    }

    try {
      const requestBody = await readRequestBody(req);
      const upstream = await fetchImpl(`${API_ORIGIN}${req.url ?? pathname}`, {
        method: req.method ?? "GET",
        headers: normalizeRequestHeaders(req.headers),
        body: requestBody ? new Uint8Array(requestBody) : undefined,
      });

      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "Dashboard API proxy failed",
        }),
      );
    }
  };
}
