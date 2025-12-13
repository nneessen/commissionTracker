#!/bin/bash
# scripts/deploy-edge-function.sh

echo "Deploying Edge Function: create-auth-user"

# Deploy the Edge Function
npx supabase functions deploy create-auth-user \
  --project-ref pcyaqwodnyrpkaiojnpz

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully!"
else
  echo "❌ Deployment failed. Please check your Supabase configuration."
  exit 1
fi