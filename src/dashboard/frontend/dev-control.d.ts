import { execFile } from "node:child_process";
export declare const DASHBOARD_CONTROL_PATHS: {
    readonly start: "/__dashboard_control/start-api";
    readonly stop: "/__dashboard_control/stop-api";
};
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
export declare function isDashboardApiProxyPath(pathname: string): boolean;
export declare function runDashboardControlCommand(action: DashboardControlAction, execFileImpl?: ExecFileImpl): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function createDashboardControlMiddleware(execFileImpl?: ExecFileImpl): (req: {
    method?: string;
    url?: string;
}, res: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk: string): void;
}, next: () => void) => void;
export declare function createDashboardApiProxyMiddleware(fetchImpl?: FetchImpl): (req: MiddlewareRequest, res: MiddlewareResponse, next: () => void) => Promise<void>;
export {};
