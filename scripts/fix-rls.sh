#!/bin/bash
# /home/nneessen/projects/commissionTracker/scripts/fix-rls.sh

echo "🔧 Fixing RLS policies for development..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Run the SQL script using Supabase CLI
echo "📝 Applying RLS policy fixes..."
npx supabase db execute --file database/fix-rls-policies.sql

echo "✅ RLS policies updated!"
echo ""
echo "⚠️  WARNING: These are permissive policies for development."
echo "    In production, implement proper authentication and user-specific policies."
echo ""
echo "🔄 Please restart your dev server to test the changes."