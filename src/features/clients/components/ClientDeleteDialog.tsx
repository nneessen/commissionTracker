// ClientDeleteDialog.tsx - Confirmation dialog for client deletion
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { ClientWithStats } from '@/types/client.types';

interface ClientDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithStats | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function ClientDeleteDialog({
  open,
  onOpenChange,
  client,
  onConfirm,
  isDeleting,
}: ClientDeleteDialogProps) {
  if (!client) return null;

  const hasPolicies = client.policy_count > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            {hasPolicies ? (
              <>
                <p>
                  Cannot delete <strong>{client.name}</strong> because they have{' '}
                  <strong>{client.policy_count} {client.policy_count === 1 ? 'policy' : 'policies'}</strong>.
                </p>
                <p>
                  Please delete or reassign all policies before deleting this client.
                </p>
              </>
            ) : (
              <>
                <p>
                  Are you sure you want to delete <strong>{client.name}</strong>?
                </p>
                <p className="text-destructive">
                  This action cannot be undone. All client information will be permanently removed.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!hasPolicies && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Client'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}