import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/".
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules[\/]three/ },
            { name: "charts", test: /node_modules[\/](recharts|d3-|victory)/ },
            { name: "map", test: /node_modules[\/](leaflet|react-leaflet)/ },
          ],
        },
      },
    },
  },
});
