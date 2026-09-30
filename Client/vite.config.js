import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://mini-e-commerce-yk0t.onrender.com/api",
        changeOrigin: true,
      },
    },
  },
});