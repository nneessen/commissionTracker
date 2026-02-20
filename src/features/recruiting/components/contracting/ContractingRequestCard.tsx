// src/features/recruiting/components/contracting/ContractingRequestCard.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, Trash2 } from 'lucide-react';
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

interface ContractingRequestCardProps {
  request: {
    id: string;
    carrier: { id: string; name: string } | null;
    request_order: number;
    status: string;
    requested_date: string;
    writing_number?: string | null;
    writing_received_date?: string | null;
    carrier_instructions?: string | null;
  };
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isStaff: boolean;
}

const statusColors: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  writing_received: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function ContractingRequestCard({ request, onUpdate, onDelete, isStaff }: ContractingRequestCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [writingNumber, setWritingNumber] = useState(request.writing_number || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSaveWritingNumber = async () => {
    try {
      await onUpdate(request.id, {
        writing_number: writingNumber || null,
        // Only auto-update status if transitioning from requested/in_progress to writing_received
        ...(writingNumber && (request.status === 'requested' || request.status === 'in_progress')
          ? { status: 'writing_received' }
          : {}),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save writing number:', error);
      // Reset to original value on error
      setWritingNumber(request.writing_number || '');
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete(request.id);
        setShowDeleteDialog(false);
      } catch (error) {
        console.error('Failed to delete contract request:', error);
        setShowDeleteDialog(false);
      }
    }
  };

  return (
    <>
      <Card className="p-2 border-l-4 border-l-blue-500 hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-2">
          {/* Order Badge */}
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
              {request.request_order}
            </div>
          </div>

          {/* Carrier Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {request.carrier?.name || 'Unknown Carrier'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Requested: {new Date(request.requested_date).toLocaleDateString()}
            </div>
          </div>

          {/* Status Badge */}
          <Badge className={`text-xs px-2 py-0.5 ${statusColors[request.status] || 'bg-gray-100 text-gray-700'}`}>
            {request.status.replace(/_/g, ' ')}
          </Badge>

          {/* Delete Button */}
          {isStaff && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Writing Number Input */}
        {isStaff && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={writingNumber}
                onChange={(e) => setWritingNumber(e.target.value)}
                placeholder="Writing #"
                className="h-7 text-xs flex-1"
                onFocus={() => setIsEditing(true)}
                onBlur={() => {
                  // Auto-save on blur if changed
                  if (writingNumber !== (request.writing_number || '')) {
                    handleSaveWritingNumber();
                  } else {
                    setIsEditing(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveWritingNumber();
                  } else if (e.key === 'Escape') {
                    setWritingNumber(request.writing_number || '');
                    setIsEditing(false);
                  }
                }}
              />
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={handleSaveWritingNumber}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            {request.writing_received_date && (
              <div className="text-xs text-green-600 mt-1">
                Received: {new Date(request.writing_received_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Carrier Instructions (Expandable) - Sanitized */}
        {request.carrier_instructions && (
          <details className="mt-2 pt-2 border-t">
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Carrier Instructions
            </summary>
            <div className="mt-1 text-xs text-muted-foreground prose prose-xs max-w-none">
              {/* Use textContent rendering to prevent any XSS risk */}
              <pre className="whitespace-pre-wrap font-sans text-inherit bg-transparent border-none p-0 m-0">
                {request.carrier_instructions}
              </pre>
            </div>
          </details>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this carrier contract request for{' '}
              <strong>{request.carrier?.name || 'this carrier'}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
