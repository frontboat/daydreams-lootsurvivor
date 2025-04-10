import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5555",
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // "/api/gigaverse": {
      //   target: "https://gigaverse.io/api/",
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api\/gigaverse/, ""),
      // },
      // "/api/sandbox": {
      //   target: "http://localhost:8888",
      //   changeOrigin: true,
      //   // rewrite: (path) => path.replace(/^\/api\/sandbox/, ""),
      // },
      // "/proxy/tools-server": {
      //   target: "http://localhost:5555",
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace("/proxy/tools-server", ""),
      // },
      // "/proxy/mcp": {
      //   target: "http://localhost:8787",
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace("/proxy/mcp", ""),
      // },
    },
  },
});
