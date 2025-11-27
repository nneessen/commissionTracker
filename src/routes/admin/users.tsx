// src/routes/admin/users.tsx

import { createFileRoute } from '@tanstack/react-router';
import { UserManagementPage } from '@/features/admin/components/UserManagementPage';

export const Route = createFileRoute('/admin/users')({
  component: UserManagementPage,
});
