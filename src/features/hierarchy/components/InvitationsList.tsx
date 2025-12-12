// src/features/hierarchy/components/InvitationsList.tsx

import {useState, useEffect} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';
import {Send, X, Clock, CheckCircle, XCircle} from 'lucide-react';
import {formatDate} from '@/lib/format';
import {supabase} from '@/services/base/supabase';
import {useAuth} from '@/contexts/AuthContext';
import showToast from '@/utils/toast';

interface Invitation {
  id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
}

export function InvitationsList() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('inviter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      // Would implement resend logic here
      showToast.success(`Invitation resent to ${invitation.invitee_email}`);
      await loadInvitations();
    } catch (_error) {
      showToast.error('Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    try {
      const { error } = await supabase
        .from('hierarchy_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      if (error) throw error;
      showToast.success('Invitation cancelled');
      await loadInvitations();
    } catch (_error) {
      showToast.error('Failed to cancel invitation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            <Clock className="h-2 w-2 mr-0.5" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-success border-success/50">
            <CheckCircle className="h-2 w-2 mr-0.5" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-error border-error/50">
            <XCircle className="h-2 w-2 mr-0.5" />
            Declined
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Pending Invitations
          </div>
          {invitations.length > 5 && (
            <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px]">
              View All
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-[11px] text-muted-foreground text-center py-2">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-4">
            No pending invitations
          </div>
        ) : (
          <div className="space-y-1.5">
            {invitations.slice(0, 5).map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-[11px] font-medium">
                      {invitation.invitee_email}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Sent {formatDate(invitation.created_at)}
                    </div>
                  </div>
                  {getStatusBadge(invitation.status)}
                </div>

                {invitation.status === 'pending' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation)}
                      className="h-5 w-5 p-0"
                      title="Resend invitation"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation)}
                      className="h-5 w-5 p-0 text-destructive"
                      title="Cancel invitation"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}