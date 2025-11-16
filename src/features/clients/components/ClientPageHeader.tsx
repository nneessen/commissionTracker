// ClientPageHeader.tsx - Page header with title and primary actions
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientPageHeaderProps {
  onAddClient: () => void;
}

export function ClientPageHeader({ onAddClient }: ClientPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Manage your client database and track their insurance policies
        </p>
      </div>
      <Button onClick={onAddClient}>
        <UserPlus className="mr-2 h-4 w-4" />
        Add Client
      </Button>
    </div>
  );
}