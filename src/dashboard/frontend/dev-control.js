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
import { execFile } from "node:child_process";
import { resolve } from "node:path";
export var DASHBOARD_CONTROL_PATHS = {
    start: "/__dashboard_control/start-api",
    stop: "/__dashboard_control/stop-api",
};
var REPO_ROOT = resolve(__dirname, "../../..");
var API_PORT = "8000";
var API_ORIGIN = "http://127.0.0.1:".concat(API_PORT);
export function isDashboardApiProxyPath(pathname) {
    return pathname === "/api" || pathname.startsWith("/api/");
}
function commandArgs(action) {
    return [
        "run",
        "simuhome",
        action === "start" ? "server-start" : "server-stop",
        "--port",
        API_PORT,
    ];
}
export function runDashboardControlCommand(action, execFileImpl) {
    if (execFileImpl === void 0) { execFileImpl = execFile; }
    return new Promise(function (resolvePromise, rejectPromise) {
        execFileImpl("uv", commandArgs(action), { cwd: REPO_ROOT }, function (error, stdout, stderr) {
            if (error) {
                rejectPromise(new Error(stderr.trim() || stdout.trim() || error.message));
                return;
            }
            resolvePromise({ stdout: stdout, stderr: stderr });
        });
    });
}
export function createDashboardControlMiddleware(execFileImpl) {
    if (execFileImpl === void 0) { execFileImpl = execFile; }
    return function (req, res, next) {
        var _a;
        var pathname = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split("?")[0];
        var action = req.method === "POST" && pathname === DASHBOARD_CONTROL_PATHS.start
            ? "start"
            : req.method === "POST" && pathname === DASHBOARD_CONTROL_PATHS.stop
                ? "stop"
                : null;
        if (!action) {
            next();
            return;
        }
        void runDashboardControlCommand(action, execFileImpl)
            .then(function () {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, action: action }));
        })
            .catch(function (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
                ok: false,
                action: action,
                error: error instanceof Error ? error.message : "Control command failed",
            }));
        });
    };
}
function shouldReadBody(method) {
    return Boolean(method && !["GET", "HEAD"].includes(method));
}
function readRequestBody(req) {
    if (!shouldReadBody(req.method) || typeof req.on !== "function") {
        return Promise.resolve(undefined);
    }
    return new Promise(function (resolvePromise, rejectPromise) {
        var _a, _b, _c;
        var chunks = [];
        (_a = req.on) === null || _a === void 0 ? void 0 : _a.call(req, "data", function (chunk) {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
        });
        (_b = req.on) === null || _b === void 0 ? void 0 : _b.call(req, "end", function () {
            resolvePromise(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
        });
        (_c = req.on) === null || _c === void 0 ? void 0 : _c.call(req, "error", function () {
            rejectPromise(new Error("Failed to read dashboard proxy request body"));
        });
    });
}
function normalizeRequestHeaders(headers) {
    if (!headers) {
        return undefined;
    }
    var normalized = new Headers();
    for (var _i = 0, _a = Object.entries(headers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value === undefined) {
            continue;
        }
        normalized.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    return normalized;
}
export function createDashboardApiProxyMiddleware(fetchImpl) {
    var _this = this;
    if (fetchImpl === void 0) { fetchImpl = fetch; }
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var pathname, requestBody, upstream, _a, _b, _c, _d, error_1;
        var _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    pathname = (_f = (_e = req.url) === null || _e === void 0 ? void 0 : _e.split("?")[0]) !== null && _f !== void 0 ? _f : "";
                    if (!isDashboardApiProxyPath(pathname)) {
                        next();
                        return [2 /*return*/];
                    }
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, readRequestBody(req)];
                case 2:
                    requestBody = _j.sent();
                    return [4 /*yield*/, fetchImpl("".concat(API_ORIGIN).concat((_g = req.url) !== null && _g !== void 0 ? _g : pathname), {
                            method: (_h = req.method) !== null && _h !== void 0 ? _h : "GET",
                            headers: normalizeRequestHeaders(req.headers),
                            body: requestBody ? new Uint8Array(requestBody) : undefined,
                        })];
                case 3:
                    upstream = _j.sent();
                    res.statusCode = upstream.status;
                    upstream.headers.forEach(function (value, key) {
                        res.setHeader(key, value);
                    });
                    _b = (_a = res).end;
                    _d = (_c = Buffer).from;
                    return [4 /*yield*/, upstream.arrayBuffer()];
                case 4:
                    _b.apply(_a, [_d.apply(_c, [_j.sent()])]);
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _j.sent();
                    res.statusCode = 502;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                        ok: false,
                        error: error_1 instanceof Error ? error_1.message : "Dashboard API proxy failed",
                    }));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
}
