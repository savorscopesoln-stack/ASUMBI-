import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This config only affects `vite dev` (local development).
// Production builds (`vite build`) are static files with no dev server,
// so the /api proxy below does nothing in production — that's why
// api.js and socket.js read VITE_API_URL / VITE_SOCKET_URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});