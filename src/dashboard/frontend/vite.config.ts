import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import { createDashboardControlMiddleware } from "./dev-control";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "dashboard-control",
      configureServer(server) {
        server.middlewares.use(createDashboardControlMiddleware());
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    port: 4173,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
