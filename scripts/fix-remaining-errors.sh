#!/bin/bash
# Fix remaining TypeScript errors

echo "Fixing remaining TypeScript errors..."

# Fix _can -> can in PermissionGate
sed -i 's/\._can/\.can/g' src/components/permissions/PermissionGate.tsx

# Fix _error -> error in AuthDiagnostic
sed -i 's/\._error/\.error/g' src/features/admin/components/AuthDiagnostic.tsx

# Fix _periodCommissions -> periodCommissions
sed -i 's/_periodCommissions/periodCommissions/g' src/features/analytics/components/PaceMetrics.tsx

# Fix _breakevenNeeded -> breakevenNeeded
sed -i 's/_breakevenNeeded/breakevenNeeded/g' src/features/analytics/components/PaceMetrics.tsx

# Fix _scaleToDisplayPeriod -> scaleToDisplayPeriod
sed -i 's/_scaleToDisplayPeriod/scaleToDisplayPeriod/g' src/features/dashboard/DashboardHome.tsx

# Fix _scaleCountToDisplayPeriod -> scaleCountToDisplayPeriod
sed -i 's/_scaleCountToDisplayPeriod/scaleCountToDisplayPeriod/g' src/features/dashboard/config/metricsConfig.ts

echo "Done fixing remaining errors"