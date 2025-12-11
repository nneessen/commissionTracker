// /home/nneessen/projects/commissionTracker/src/features/training-hub/components/WorkflowDiagnostic.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/services/base/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function WorkflowDiagnostic() {
  const { user } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const diagnostic: any = {
      timestamp: new Date().toISOString(),
      auth: {},
      database: {},
      cache: {},
      recommendations: []
    };

    try {
      // 1. Check authentication
      diagnostic.auth.isAuthenticated = !!user;
      diagnostic.auth.userId = user?.id || null;
      diagnostic.auth.email = user?.email || null;

      if (!user) {
        diagnostic.recommendations.push('❌ You are not authenticated. Workflows require authentication to save.');
      }

      // 2. Check database workflows
      const { data: dbWorkflows, error: dbError } = await supabase
        .from('workflows')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false });

      if (dbError) {
        diagnostic.database.error = dbError.message;
        diagnostic.recommendations.push(`❌ Database error: ${dbError.message}`);
      } else {
        diagnostic.database.workflowCount = dbWorkflows?.length || 0;
        diagnostic.database.workflows = dbWorkflows || [];

        if (dbWorkflows?.length === 0) {
          diagnostic.recommendations.push('⚠️ No workflows found in database. Any workflows you see are from browser cache.');
        } else {
          diagnostic.recommendations.push(`✅ Found ${dbWorkflows.length} workflows in database`);
        }
      }

      // 3. Check email templates
      const { data: templates, count: templateCount } = await supabase
        .from('email_templates')
        .select('*', { count: 'exact', head: true });

      diagnostic.database.emailTemplateCount = templateCount || 0;
      if (templateCount === 0) {
        diagnostic.recommendations.push('⚠️ No email templates found. Create templates before creating workflows.');
      } else {
        diagnostic.recommendations.push(`✅ Found ${templateCount} email templates`);
      }

      // 4. Check Gmail connection
      if (user) {
        const { data: oauthTokens } = await supabase
          .from('user_email_oauth_tokens')
          .select('provider, email_address, is_active')
          .eq('provider', 'gmail');

        diagnostic.database.gmailConnected = oauthTokens && oauthTokens.length > 0;
        if (!diagnostic.database.gmailConnected) {
          diagnostic.recommendations.push('❌ No Gmail connection found. Connect Gmail in Settings > Email');
        } else {
          diagnostic.recommendations.push(`✅ Gmail connected: ${oauthTokens?.[0]?.email_address || 'unknown'}`);
        }
      }

      // 5. Check browser cache
      const cacheKeys = await caches.keys();
      diagnostic.cache.cacheNames = cacheKeys;
      diagnostic.cache.hasTanstackCache = localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') !== null;

      // 6. Check localStorage for any workflow data
      const localStorageKeys = Object.keys(localStorage);
      diagnostic.cache.localStorageKeys = localStorageKeys.filter(key =>
        key.includes('workflow') || key.includes('QUERY')
      );

      // 7. Test workflow creation
      if (user) {
        const testWorkflow = {
          name: `Diagnostic Test ${Date.now()}`,
          description: 'Diagnostic test workflow',
          category: 'general',
          trigger_type: 'manual',
          status: 'draft',
          config: { trigger: { type: 'manual' } },
          conditions: [],
          actions: [],
          max_runs_per_day: 1,
          priority: 50,
          created_by: user.id
        };

        const { data: created, error: createError } = await supabase
          .from('workflows')
          .insert(testWorkflow)
          .select()
          .single();

        if (createError) {
          diagnostic.database.canCreateWorkflow = false;
          diagnostic.database.createError = createError.message;
          diagnostic.recommendations.push(`❌ Cannot create workflows: ${createError.message}`);
        } else {
          diagnostic.database.canCreateWorkflow = true;
          diagnostic.database.testWorkflowId = created.id;

          // Delete the test workflow
          await supabase.from('workflows').delete().eq('id', created.id);
          diagnostic.recommendations.push('✅ Workflow creation is working');
        }
      }

    } catch (error: any) {
      diagnostic.error = error.message;
      diagnostic.recommendations.push(`❌ Diagnostic error: ${error.message}`);
    }

    setResults(diagnostic);
    setLoading(false);
  };

  const clearCache = () => {
    // Clear TanStack Query cache
    localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');

    // Clear any workflow-related cache
    Object.keys(localStorage).forEach(key => {
      if (key.includes('workflow') || key.includes('QUERY')) {
        localStorage.removeItem(key);
      }
    });

    // Clear all caches
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });

    window.location.reload();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Workflow System Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostic} disabled={loading} size="sm">
            {loading ? 'Running...' : 'Run Diagnostic'}
          </Button>
          <Button onClick={clearCache} variant="destructive" size="sm">
            Clear Cache & Reload
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            {/* Authentication Status */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Authentication:</strong> {results.auth.isAuthenticated ? (
                  <span className="text-green-600">✅ Logged in as {results.auth.email}</span>
                ) : (
                  <span className="text-red-600">❌ Not authenticated</span>
                )}
              </AlertDescription>
            </Alert>

            {/* Database Status */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Database Workflows:</strong> {results.database.workflowCount} workflows found
                {results.database.workflows?.length > 0 && (
                  <ul className="mt-2 text-xs">
                    {results.database.workflows.slice(0, 3).map((wf: any) => (
                      <li key={wf.id}>• {wf.name} ({wf.status})</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <div className="space-y-1">
                {results.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="text-sm">
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Data (collapsible) */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Raw Diagnostic Data</summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}