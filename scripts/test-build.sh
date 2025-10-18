#!/bin/bash
# Test if project builds successfully
echo "🔨 Testing build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully"
  exit 0
else
  echo "❌ Build failed"
  exit 1
fi
