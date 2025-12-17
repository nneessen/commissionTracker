// src/features/hierarchy/components/InvitationsList.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/format";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import showToast from "@/utils/toast";

interface Invitation {
  id: string;
  invitee_email: string;
  status: "pending" | "accepted" | "rejected" | "expired";
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
        .from("hierarchy_invitations")
        .select("*")
        .eq("inviter_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Failed to load invitations:", error);
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
      showToast.error("Failed to resend invitation");
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    try {
      const { error } = await supabase
        .from("hierarchy_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      if (error) throw error;
      showToast.success("Invitation cancelled");
      await loadInvitations();
    } catch (_error) {
      showToast.error("Failed to cancel invitation");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400"
          >
            <Clock className="h-2 w-2 mr-0.5" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
          >
            <CheckCircle className="h-2 w-2 mr-0.5" />
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600"
          >
            <XCircle className="h-2 w-2 mr-0.5" />
            Declined
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700"
          >
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Pending Invitations
          </div>
          {invitations.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-zinc-600 dark:text-zinc-400"
            >
              View All
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-2">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Send className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mb-1" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              No pending invitations
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {invitations.slice(0, 5).map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between py-1.5 px-2 rounded transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                      {invitation.invitee_email}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Sent {formatDate(invitation.created_at)}
                    </div>
                  </div>
                  {getStatusBadge(invitation.status)}
                </div>

                {invitation.status === "pending" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation)}
                      className="h-5 w-5 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      title="Resend invitation"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation)}
                      className="h-5 w-5 p-0 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
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
      </div>
    </div>
  );
}
