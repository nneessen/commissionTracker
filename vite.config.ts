import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Parse conventional commit messages into user-friendly release notes
function parseCommitToReleaseNote(commit: string): string | null {
  // Extract commit message (skip hash if present)
  const message = commit.replace(/^[a-f0-9]+ /, "").trim();

  // Skip automated commits
  if (
    message.includes("Automated checkpoint") ||
    message.includes("Generated with [Claude Code]") ||
    message.startsWith("docs: multiple changes")
  ) {
    return null;
  }

  // Parse conventional commit format: type(scope): description
  const conventionalMatch = message.match(
    /^(feat|fix|refactor|perf|style|chore|test|docs)(?:\(([^)]+)\))?:\s*(.+)/i,
  );

  if (conventionalMatch) {
    const [, type, scope, description] = conventionalMatch;
    const typeLabels: Record<string, string> = {
      feat: "New",
      fix: "Fixed",
      refactor: "Improved",
      perf: "Optimized",
      style: "Updated",
      chore: "Updated",
      test: "Testing",
      docs: "Documentation",
    };

    const label = typeLabels[type.toLowerCase()] || "Updated";
    // Clean up description - remove trailing metadata
    const cleanDesc = description
      .replace(/\s*🤖.*$/, "")
      .replace(/\s*Co-Authored.*$/i, "")
      .trim();

    // Capitalize first letter
    const capitalizedDesc =
      cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);

    if (scope) {
      return `${label}: ${capitalizedDesc} (${scope})`;
    }
    return `${label}: ${capitalizedDesc}`;
  }

  // Handle non-conventional commits - just capitalize and clean
  const cleanMessage = message
    .replace(/\s*🤖.*$/, "")
    .replace(/\s*Co-Authored.*$/i, "")
    .trim();
  if (cleanMessage.length > 10 && cleanMessage.length < 100) {
    return cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
  }

  return null;
}

// Plugin to generate version.json for cache busting detection
function versionPlugin(): Plugin {
  return {
    name: "version-plugin",
    closeBundle() {
      let changes: string[] = [];

      // Try to get recent git commits for release notes
      try {
        // Get the last 25 commits that aren't merge commits (to find meaningful ones)
        const gitLog = execSync(
          'git log --oneline --no-merges -25 --pretty=format:"%h %s"',
          {
            cwd: __dirname,
            encoding: "utf-8",
            timeout: 5000,
          },
        );

        const commits = gitLog.split("\n").filter((line) => line.trim());

        // Parse commits into release notes
        for (const commit of commits) {
          const note = parseCommitToReleaseNote(commit);
          if (note && !changes.includes(note)) {
            changes.push(note);
            // Limit to 5 release notes max
            if (changes.length >= 5) break;
          }
        }
      } catch (e) {
        console.warn("Could not read git history for release notes:", e);
      }

      // Fallback to release-notes.json if no commits parsed
      if (changes.length === 0) {
        const releaseNotesPath = path.resolve(__dirname, "release-notes.json");
        if (fs.existsSync(releaseNotesPath)) {
          try {
            const releaseNotes = JSON.parse(
              fs.readFileSync(releaseNotesPath, "utf-8"),
            );
            changes = releaseNotes.changes || [];
          } catch (e) {
            console.warn("Could not parse release-notes.json:", e);
          }
        }
      }

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
