import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Plugin to generate version.json for cache busting detection
function versionPlugin(): Plugin {
  return {
    name: "version-plugin",
    closeBundle() {
      const version = {
        v: Date.now().toString(),
        buildTime: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.resolve(__dirname, "build/version.json"),
        JSON.stringify(version),
      );
      console.log("Generated version.json:", version.v);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    sourcemap: true,
  },
  define: {
    // Replace process.env for browser compatibility
    global: "globalThis",
  },
});
