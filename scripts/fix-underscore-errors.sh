#!/bin/bash
# Fix incorrect underscore prefixes from lint fixing

echo "Fixing incorrect underscore prefixes..."

# Fix _useCallback -> useCallback
find src/ -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/_useCallback/useCallback/g'

# Fix _formatDateForDB -> formatDateForDB
find src/ -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/_formatDateForDB/formatDateForDB/g'

# Fix _error -> error (in specific contexts)
sed -i 's/\._error/\.error/g' src/features/admin/components/AuthDiagnostic.tsx

# Fix _can -> can
sed -i 's/\._can/\.can/g' src/components/permissions/PermissionGate.tsx

# Fix _isCollapsed -> isCollapsed
sed -i 's/_isCollapsed/isCollapsed/g' src/components/notifications/NotificationDropdown.tsx

# Fix _isFetching -> isFetching
sed -i 's/_isFetching/isFetching/g' src/features/admin/components/UserManagementDashboard.tsx

echo "Done fixing underscore errors"