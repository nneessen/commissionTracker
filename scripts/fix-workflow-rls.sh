#!/bin/bash
# /home/nneessen/projects/commissionTracker/scripts/fix-workflow-rls.sh

echo "Fixing workflow RLS policies..."

# Apply the SQL file
PGPASSWORD='N123j234n345!$!$' psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.pcyaqwodnyrpkaiojnpz \
  -d postgres <<EOF
-- Fix RLS policies for workflow_runs table

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view runs for own workflows" ON workflow_runs;

-- Create policies for workflow_runs
CREATE POLICY "Users can view runs for own workflows" ON workflow_runs
  FOR SELECT USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can create runs for own workflows" ON workflow_runs
  FOR INSERT WITH CHECK (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can update runs for own workflows" ON workflow_runs
  FOR UPDATE USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

-- Also ensure trigger and action policies are set up correctly
DROP POLICY IF EXISTS "Users can manage triggers for own workflows" ON workflow_triggers;
CREATE POLICY "Users can manage triggers for own workflows" ON workflow_triggers
  FOR ALL USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  ) WITH CHECK (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage actions for own workflows" ON workflow_actions;
CREATE POLICY "Users can manage actions for own workflows" ON workflow_actions
  FOR ALL USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  ) WITH CHECK (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

-- List the policies to confirm
\echo '\nWorkflow_runs policies:'
SELECT pol.polname, pol.polcmd
FROM pg_policies pol
WHERE pol.tablename = 'workflow_runs';

EOF

echo "RLS policies fixed!"