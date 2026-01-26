import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Get user-friendly release notes from recent git commits
function getUserFriendlyReleaseNotes(): string[] {
  try {
    // Get last 20 commits to find enough user-facing changes
    const gitLog = execSync('git log --oneline -20 --pretty=format:"%s"', {
      encoding: "utf-8",
    });

    const commits = gitLog.split("\n").filter(Boolean);
    const userFacingChanges: string[] = [];

    for (const commit of commits) {
      if (userFacingChanges.length >= 5) break;

      // Parse conventional commit format: type(scope): message
      const match = commit.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)$/);
      if (!match) continue;

      const [, type, message] = match;
      const cleanMessage = message.charAt(0).toUpperCase() + message.slice(1);

      // Only include user-facing changes (features and fixes)
      if (type === "feat") {
        userFacingChanges.push(`New: ${cleanMessage}`);
      } else if (type === "fix") {
        userFacingChanges.push(`Fixed: ${cleanMessage}`);
      }
      // Skip: chore, docs, refactor, test, style, ci, build
    }

    // Fallback if no user-facing commits found
    if (userFacingChanges.length === 0) {
      return ["Bug fixes and improvements"];
    }

    return userFacingChanges;
  } catch {
    // Fallback if git command fails
    return ["Bug fixes and improvements"];
  }
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
