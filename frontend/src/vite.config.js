import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-recharts";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
        },
      },
    },
  },
});