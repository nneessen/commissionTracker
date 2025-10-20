#!/bin/bash

echo "Fixing component imports after reorganization..."

# Fix imports from feature folders to custom_ui
echo "Updating Alert imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/features/auth/components/Alert|@/components/custom_ui/Alert|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|'./Alert'|'@/components/custom_ui/Alert'|g" 2>/dev/null

echo "Updating EmailIcon imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/features/auth/components/EmailIcon|@/components/custom_ui/EmailIcon|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|'./EmailIcon'|'@/components/custom_ui/EmailIcon'|g" 2>/dev/null

echo "Updating InfoButton imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/features/analytics/components/InfoButton|@/components/custom_ui/InfoButton|g"

echo "Updating ChartCard imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/features/analytics/ChartCard|@/components/custom_ui/ChartCard|g"

echo "Updating MetricsCard imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/features/analytics/MetricsCard|@/components/custom_ui/MetricsCard|g"

# Fix imports from ui to custom_ui
echo "Updating DataTable imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/DataTable|@/components/custom_ui/DataTable|g"

echo "Updating Modal imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/Modal|@/components/custom_ui/Modal|g"

echo "Updating TimePeriodSelector imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/TimePeriodSelector|@/components/custom_ui/TimePeriodSelector|g"

echo "Updating MetricTooltip imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/MetricTooltip|@/components/custom_ui/MetricTooltip|g"

echo "Updating stat-card imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/stat-card|@/components/custom_ui/stat-card|g"

echo "Updating heading imports..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|@/components/ui/heading|@/components/custom_ui/heading|g"

echo "Component import fixes complete!"