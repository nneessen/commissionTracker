#!/bin/bash
# Run migration 007: Users View

echo "Running Migration 007: Users View & Column Migration"
echo "File: supabase/migrations/20251001_007_SAFE_users_view_corrected.sql"
echo ""
echo "Please run this in Supabase Dashboard → SQL Editor:"
echo "1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new"
echo "2. Copy the contents below:"
echo ""
echo "========================================="
cat supabase/migrations/20251001_007_SAFE_users_view_corrected.sql
echo ""
echo "========================================="
echo ""
echo "3. Paste into SQL Editor"
echo "4. Click RUN"
echo ""
echo "Expected output:"
echo "  - NOTICE: policies: Renamed agent_id to user_id"
echo "  - NOTICE: ✓ public.users VIEW created successfully"
echo "  - NOTICE: Migration 007 completed successfully!"
