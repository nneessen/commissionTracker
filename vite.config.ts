import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Get user-friendly release notes
// Commit messages are always technical - just use simple, friendly defaults
function getUserFriendlyReleaseNotes(): string[] {
  // Always return friendly, non-technical messages
  return ["Bug fixes and improvements", "Better overall experience"];
}

// Plugin to generate version.json for cache busting detection
function versionPlugin(): Plugin {
  return {
    name: "version-plugin",
    closeBundle() {
      // Use simple, user-friendly release notes
      const changes = getUserFriendlyReleaseNotes();

      const version = {
        v: Date.now().toString(),
        buildTime: new Date().toISOString(),
        changes,
      };
      fs.writeFileSync(
        path.resolve(__dirname, "build/version.json"),
        JSON.stringify(version),
      );
      console.log("Generated version.json:", version.v);
      if (changes.length > 0) {
        console.log("Included release notes:", changes);
      }
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
