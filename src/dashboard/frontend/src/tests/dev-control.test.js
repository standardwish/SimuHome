// @vitest-environment node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { describe, expect, it, vi } from "vitest";
import { createDashboardApiProxyMiddleware, DASHBOARD_CONTROL_PATHS, createDashboardControlMiddleware, isDashboardApiProxyPath, runDashboardControlCommand, } from "../../dev-control";
describe("dev-control", function () {
    it("runs the start command from the repository root", function () { return __awaiter(void 0, void 0, void 0, function () {
        var execFileMock;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    execFileMock = vi.fn(function (_file, _args, _options, callback) {
                        callback(null, "started", "");
                        return {};
                    });
                    return [4 /*yield*/, runDashboardControlCommand("start", execFileMock)];
                case 1:
                    _a.sent();
                    expect(execFileMock).toHaveBeenCalledWith("uv", ["run", "simuhome", "server-start", "--port", "8000"], expect.objectContaining({
                        cwd: expect.stringMatching(/SimuHome$/),
                    }), expect.any(Function));
                    return [2 /*return*/];
            }
        });
    }); });
    it("handles the start control endpoint", function () { return __awaiter(void 0, void 0, void 0, function () {
        var execFileMock, middleware, next, body, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    execFileMock = vi.fn(function (_file, _args, _options, callback) {
                        callback(null, "started", "");
                        return {};
                    });
                    middleware = createDashboardControlMiddleware(execFileMock);
                    next = vi.fn();
                    body = "";
                    response = {
                        statusCode: 0,
                        headers: {},
                        setHeader: function (name, value) {
                            this.headers[name] = value;
                        },
                        end: function (chunk) {
                            body = chunk;
                        },
                    };
                    middleware({ method: "POST", url: DASHBOARD_CONTROL_PATHS.start }, response, next);
                    return [4 /*yield*/, vi.waitFor(function () {
                            expect(response.statusCode).toBe(200);
                        })];
                case 1:
                    _a.sent();
                    expect(JSON.parse(body)).toEqual({ ok: true, action: "start" });
                    expect(next).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    it("passes through non-control requests", function () {
        var middleware = createDashboardControlMiddleware();
        var next = vi.fn();
        middleware({ method: "GET", url: "/api/__health__" }, {}, next);
        expect(next).toHaveBeenCalledOnce();
    });
    it("proxies api requests to the dashboard backend", function () { return __awaiter(void 0, void 0, void 0, function () {
        var fetchMock, middleware, next, body, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fetchMock = vi.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, new Response("# On/Off Cluster", {
                                    status: 200,
                                    headers: { "Content-Type": "text/markdown; charset=utf-8" },
                                })];
                        });
                    }); });
                    middleware = createDashboardApiProxyMiddleware(fetchMock);
                    next = vi.fn();
                    body = "";
                    response = {
                        statusCode: 0,
                        headers: {},
                        setHeader: function (name, value) {
                            this.headers[name] = value;
                        },
                        end: function (chunk) {
                            body =
                                typeof chunk === "string"
                                    ? chunk
                                    : chunk
                                        ? Buffer.from(chunk).toString("utf-8")
                                        : "";
                        },
                    };
                    middleware({
                        method: "GET",
                        url: "/api/dashboard/wiki/clusters/OnOff/raw",
                        headers: { accept: "text/markdown" },
                    }, response, next);
                    return [4 /*yield*/, vi.waitFor(function () {
                            expect(response.statusCode).toBe(200);
                        })];
                case 1:
                    _a.sent();
                    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/dashboard/wiki/clusters/OnOff/raw", expect.objectContaining({
                        method: "GET",
                    }));
                    expect(response.headers["content-type"]).toContain("text/markdown");
                    expect(body).toContain("On/Off Cluster");
                    expect(next).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    it("passes through non-api requests in the api proxy middleware", function () {
        var middleware = createDashboardApiProxyMiddleware();
        var next = vi.fn();
        middleware({ method: "GET", url: "/wiki/on_off_light", headers: {} }, {}, next);
        expect(next).toHaveBeenCalledOnce();
    });
    it("does not treat app routes like /api-explorer as proxied api paths", function () {
        expect(isDashboardApiProxyPath("/api")).toBe(true);
        expect(isDashboardApiProxyPath("/api/dashboard/wiki/apis")).toBe(true);
        expect(isDashboardApiProxyPath("/api-explorer")).toBe(false);
        expect(isDashboardApiProxyPath("/api-explorer/details")).toBe(false);
    });
});
