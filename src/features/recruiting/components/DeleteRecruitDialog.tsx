// src/features/recruiting/components/DeleteRecruitDialog.tsx

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRecruitMutations } from '../hooks/useRecruitMutations';
import { supabase } from '@/services/base/supabase';
import type { UserProfile } from '@/types/hierarchy.types';
import { showToast } from '@/utils/toast';

interface DeleteRecruitDialogProps {
  recruit: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface RelatedDataCount {
  emails: number;
  documents: number;
  activities: number;
  checklistItems: number;
  downlines: number;
}

export function DeleteRecruitDialog({
  recruit,
  open,
  onOpenChange,
  onSuccess
}: DeleteRecruitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [relatedData, setRelatedData] = useState<RelatedDataCount | null>(null);
  const [checkingData, setCheckingData] = useState(false);
  const { deleteRecruit } = useRecruitMutations();

  // Check for related data when dialog opens
  useEffect(() => {
    if (!open || !recruit) {
      setRelatedData(null);
      return;
    }

    const checkRelatedData = async () => {
      setCheckingData(true);
      try {
        // Check emails
        const { count: emailCount } = await supabase
          .from('user_emails')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', recruit.id);

        // Check documents
        const { count: docCount } = await supabase
          .from('user_documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', recruit.id);

        // Check activity logs
        const { count: activityCount } = await supabase
          .from('user_activity_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', recruit.id);

        // Check checklist progress
        const { count: checklistCount } = await supabase
          .from('recruit_checklist_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', recruit.id);

        // Check for downlines (users with this recruit as upline)
        const { count: downlineCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('upline_id', recruit.id);

        setRelatedData({
          emails: emailCount || 0,
          documents: docCount || 0,
          activities: activityCount || 0,
          checklistItems: checklistCount || 0,
          downlines: downlineCount || 0,
        });
      } catch (error) {
        console.error('Error checking related data:', error);
        // Still allow deletion but warn about unknown data
        setRelatedData({
          emails: -1,
          documents: -1,
          activities: -1,
          checklistItems: -1,
          downlines: -1,
        });
      } finally {
        setCheckingData(false);
      }
    };

    checkRelatedData();
  }, [open, recruit]);

  const handleDelete = async () => {
    if (!recruit) return;

    const recruitName = `${recruit.first_name} ${recruit.last_name}`.trim() || recruit.email;

    setLoading(true);
    try {
      await deleteRecruit.mutateAsync(recruit.id);
      showToast.success(`Successfully deleted ${recruitName}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to delete recruit:', error);
      showToast.error(
        error?.message || `Failed to delete ${recruitName}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!recruit) return null;

  const hasRelatedData = relatedData && (
    relatedData.emails > 0 ||
    relatedData.documents > 0 ||
    relatedData.activities > 0 ||
    relatedData.checklistItems > 0 ||
    relatedData.downlines > 0
  );

  const hasDownlines = relatedData && relatedData.downlines > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Recruit
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {recruit.first_name} {recruit.last_name}
              </span>
              ?
            </p>

            {checkingData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for related data...
              </div>
            )}

            {!checkingData && hasDownlines && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This recruit has {relatedData.downlines} downline{relatedData.downlines > 1 ? 's' : ''}
                  that will be orphaned. You should reassign them first.
                </AlertDescription>
              </Alert>
            )}

            {!checkingData && hasRelatedData && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">The following data will be permanently deleted:</div>
                  <ul className="text-sm space-y-1 ml-4">
                    {relatedData.emails > 0 && (
                      <li>• {relatedData.emails} email{relatedData.emails > 1 ? 's' : ''}</li>
                    )}
                    {relatedData.documents > 0 && (
                      <li>• {relatedData.documents} document{relatedData.documents > 1 ? 's' : ''}</li>
                    )}
                    {relatedData.activities > 0 && (
                      <li>• {relatedData.activities} activity log{relatedData.activities > 1 ? ' entries' : ' entry'}</li>
                    )}
                    {relatedData.checklistItems > 0 && (
                      <li>• {relatedData.checklistItems} checklist item{relatedData.checklistItems > 1 ? 's' : ''}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {!checkingData && relatedData && Object.values(relatedData).some(v => v === -1) && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Could not verify all related data. Some associated records may be deleted.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-destructive font-semibold">
              This action cannot be undone.
            </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || checkingData || (hasDownlines || false)}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {hasDownlines ? 'Cannot Delete' : 'Delete Permanently'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}