// src/features/workflows/components/WorkflowDiagnostic.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";

export default function WorkflowDiagnostic() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- diagnostic results type
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- diagnostic data type
    const diagnostic: any = {
      timestamp: new Date().toISOString(),
      auth: {},
      database: {},
      cache: {},
      recommendations: [],
    };

    try {
      // 1. Check authentication
      diagnostic.auth.isAuthenticated = !!user;
      diagnostic.auth.userId = user?.id || null;
      diagnostic.auth.email = user?.email || null;

      if (!user) {
        diagnostic.recommendations.push(
          "❌ You are not authenticated. Workflows require authentication to save.",
        );
      }

      // 2. Check database workflows
      const { data: dbWorkflows, error: dbError } = await supabase
        .from("workflows")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false });

      if (dbError) {
        diagnostic.database.error = dbError.message;
        diagnostic.recommendations.push(
          `❌ Database error: ${dbError.message}`,
        );
      } else {
        diagnostic.database.workflowCount = dbWorkflows?.length || 0;
        diagnostic.database.workflows = dbWorkflows || [];

        if (dbWorkflows?.length === 0) {
          diagnostic.recommendations.push(
            "⚠️ No workflows found in database. Any workflows you see are from browser cache.",
          );
        } else {
          diagnostic.recommendations.push(
            `✅ Found ${dbWorkflows.length} workflows in database`,
          );
        }
      }

      // 3. Check email templates
      const { data: _templates, count: templateCount } = await supabase
        .from("email_templates")
        .select("*", { count: "exact", head: true });

      diagnostic.database.emailTemplateCount = templateCount || 0;
      if (templateCount === 0) {
        diagnostic.recommendations.push(
          "⚠️ No email templates found. Create templates before creating workflows.",
        );
      } else {
        diagnostic.recommendations.push(
          `✅ Found ${templateCount} email templates`,
        );
      }

      // 4. Check Gmail connection
      if (user) {
        const { data: oauthTokens } = await supabase
          .from("user_email_oauth_tokens")
          .select("provider, email_address, is_active")
          .eq("provider", "gmail");

        diagnostic.database.gmailConnected =
          oauthTokens && oauthTokens.length > 0;
        if (!diagnostic.database.gmailConnected) {
          diagnostic.recommendations.push(
            "❌ No Gmail connection found. Connect Gmail in Settings > Email",
          );
        } else {
          diagnostic.recommendations.push(
            `✅ Gmail connected: ${oauthTokens?.[0]?.email_address || "unknown"}`,
          );
        }
      }

      // 5. Check browser cache
      const cacheKeys = await caches.keys();
      diagnostic.cache.cacheNames = cacheKeys;
      diagnostic.cache.hasTanstackCache =
        localStorage.getItem("REACT_QUERY_OFFLINE_CACHE") !== null;

      // 6. Check localStorage for any workflow data
      const localStorageKeys = Object.keys(localStorage);
      diagnostic.cache.localStorageKeys = localStorageKeys.filter(
        (key) => key.includes("workflow") || key.includes("QUERY"),
      );

      // 7. Test workflow creation
      if (user) {
        const testWorkflow = {
          name: `Diagnostic Test ${Date.now()}`,
          description: "Diagnostic test workflow",
          category: "general",
          trigger_type: "manual",
          status: "draft",
          config: { trigger: { type: "manual" } },
          conditions: [],
          actions: [],
          max_runs_per_day: 1,
          priority: 50,
          created_by: user.id,
        };

        const { data: created, error: createError } = await supabase
          .from("workflows")
          .insert(testWorkflow)
          .select()
          .single();

        if (createError) {
          diagnostic.database.canCreateWorkflow = false;
          diagnostic.database.createError = createError.message;
          diagnostic.recommendations.push(
            `❌ Cannot create workflows: ${createError.message}`,
          );
        } else {
          diagnostic.database.canCreateWorkflow = true;
          diagnostic.database.testWorkflowId = created.id;

          // Delete the test workflow
          await supabase.from("workflows").delete().eq("id", created.id);
          diagnostic.recommendations.push("✅ Workflow creation is working");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      diagnostic.error = error.message;
      diagnostic.recommendations.push(`❌ Diagnostic error: ${error.message}`);
    }

    setResults(diagnostic);
    setLoading(false);
  };

  const clearCache = () => {
    // Clear TanStack Query cache
    localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");

    // Clear any workflow-related cache
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("workflow") || key.includes("QUERY")) {
        localStorage.removeItem(key);
      }
    });

    // Clear all caches
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });

    window.location.reload();
  };

  return (
    <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Workflow System Diagnostic
        </h3>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex gap-1.5">
          <Button
            onClick={runDiagnostic}
            disabled={loading}
            size="sm"
            className="h-6 text-[10px]"
          >
            {loading ? "Running..." : "Run Diagnostic"}
          </Button>
          <Button
            onClick={clearCache}
            variant="destructive"
            size="sm"
            className="h-6 text-[10px]"
          >
            Clear Cache & Reload
          </Button>
        </div>

        {results && (
          <div className="space-y-3">
            {/* Authentication Status */}
            <div className="p-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-zinc-500" />
                <div className="text-[11px]">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Authentication:
                  </span>{" "}
                  {results.auth.isAuthenticated ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✅ Logged in as {results.auth.email}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      ❌ Not authenticated
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-zinc-500" />
                <div className="text-[11px]">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Database Workflows:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {results.database.workflowCount} workflows found
                  </span>
                  {results.database.workflows?.length > 0 && (
                    <ul className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflow data type */}
                      {results.database.workflows.slice(0, 3).map((wf: any) => (
                        <li key={wf.id}>
                          • {wf.name} ({wf.status})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Recommendations:
              </h4>
              <div className="space-y-0.5">
                {results.recommendations.map((rec: string, idx: number) => (
                  <div
                    key={idx}
                    className="text-[11px] text-zinc-600 dark:text-zinc-400"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Data (collapsible) */}
            <details className="text-[10px]">
              <summary className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-400">
                Raw Diagnostic Data
              </summary>
              <pre className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-auto text-zinc-700 dark:text-zinc-300">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
