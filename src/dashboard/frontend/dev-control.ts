import { execFile } from "node:child_process";
import { resolve } from "node:path";

export const DASHBOARD_CONTROL_PATHS = {
  start: "/__dashboard_control/start-api",
  stop: "/__dashboard_control/stop-api",
} as const;

type DashboardControlAction = "start" | "stop";
type ExecFileImpl = typeof execFile;

const REPO_ROOT = resolve(__dirname, "../../..");
const API_PORT = "8000";

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
