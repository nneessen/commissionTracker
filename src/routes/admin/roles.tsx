// src/routes/admin/roles.tsx

import { createFileRoute } from '@tanstack/react-router';
import { RoleManagementPage } from '@/features/admin/components/RoleManagementPage';

export const Route = createFileRoute('/admin/roles')({
  component: RoleManagementPage,
});
