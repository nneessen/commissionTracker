// src/features/hierarchy/components/SentInvitationsCard.tsx
// Card showing invitations sent by the current user

import {useState} from 'react';
import {useSentInvitations, useCancelInvitation} from '../../../hooks/hierarchy/useInvitations';
import {Button} from '../../../components/ui/button';
import {Ban, Loader2, ChevronDown, ChevronUp, Mail, Clock, XCircle} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';

export function SentInvitationsCard() {
  const { data: sentInvitations, isLoading } = useSentInvitations('pending');
  const cancelMutation = useCancelInvitation();
  const [expanded, setExpanded] = useState(true);

  if (isLoading || !sentInvitations || sentInvitations.length === 0) {
    return null;
  }

  const handleCancel = async (invitationId: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      await cancelMutation.mutateAsync({ invitation_id: invitationId });
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Pending Invitations Sent
          </h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {sentInvitations.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {sentInvitations.map((invitation) => {
            const isExpired = invitation.is_expired || false;

            return (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {invitation.invitee_email}
                    </span>
                    {isExpired && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        Expired
                      </span>
                    )}
                  </div>

                  {invitation.message && (
                    <p className="text-xs text-muted-foreground italic pl-5">
                      "{invitation.message}"
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {!isExpired && (
                      <span>
                        Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancel(invitation.id)}
                  disabled={isExpired || cancelMutation.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
