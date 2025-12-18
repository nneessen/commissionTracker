// src/features/hierarchy/components/SendInvitationModal.tsx
// Modal for sending hierarchy invitations - email-only input

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../components/ui/alert";
import { useSendInvitation } from "../../../hooks/hierarchy/useInvitations";
import { useTeamSizeLimit } from "../../../hooks/subscription";
import { Loader2, Mail, Send, AlertTriangle, Crown, Users } from "lucide-react";

const _sendInvitationSchema = z.object({
  invitee_email: z.string().email("Invalid email address"),
  message: z.string().optional(),
});

interface SendInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvitationModal({
  open,
  onOpenChange,
}: SendInvitationModalProps) {
  const sendInvitationMutation = useSendInvitation();
  const { status: teamLimit, isLoading: limitLoading } = useTeamSizeLimit();

  // Check if user has reached team size limit
  const isAtLimit =
    teamLimit &&
    !teamLimit.canAdd &&
    teamLimit.limit !== null &&
    teamLimit.limit > 0;
  const showWarning = teamLimit?.atWarning && !isAtLimit;

  const form = useForm({
    defaultValues: {
      invitee_email: "",
      message: "",
    },
    onSubmit: async ({ value }) => {
      const response = await sendInvitationMutation.mutateAsync({
        invitee_email: value.invitee_email,
        message: value.message || undefined,
      });

      if (response.success) {
        onOpenChange(false);
        form.reset();
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Agent to Your Downline
          </DialogTitle>
          <DialogDescription>
            Send an invitation by email. They must have a registered account to
            accept.
          </DialogDescription>
        </DialogHeader>

        {/* Team size limit status */}
        {teamLimit && teamLimit.limit !== null && teamLimit.limit > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
            <Users className="h-3.5 w-3.5" />
            <span>
              Team: {teamLimit.current} / {teamLimit.limit} direct downlines
            </span>
            {teamLimit.remaining !== null && teamLimit.remaining > 0 && (
              <span className="text-emerald-600">
                ({teamLimit.remaining} remaining)
              </span>
            )}
          </div>
        )}

        {/* Limit reached - block sending */}
        {isAtLimit && (
          <Alert variant="destructive" className="mt-3">
            <Crown className="h-4 w-4" />
            <AlertTitle>Team Size Limit Reached</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                You've reached the maximum of {teamLimit?.limit} direct
                downlines for your {teamLimit?.planName} plan.
              </p>
              <p>Upgrade to Team for unlimited team members.</p>
              <Link to="/settings" search={{ tab: "billing" }}>
                <Button size="sm" variant="outline" className="mt-2">
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  View Plans
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Warning - approaching limit */}
        {showWarning && (
          <Alert className="mt-3 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Approaching Team Limit
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You have {teamLimit?.remaining} spot
              {teamLimit?.remaining === 1 ? "" : "s"} remaining on your{" "}
              {teamLimit?.planName} plan. Consider upgrading to Team for
              unlimited team members.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            {/* Email Field */}
            <form.Field name="invitee_email">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="invitee_email" className="font-semibold">
                    Email Address *
                  </Label>
                  <Input
                    id="invitee_email"
                    type="email"
                    placeholder="agent@example.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoFocus
                  />
                  {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  <p className="text-xs text-muted-foreground">
                    The email must belong to a registered user
                  </p>
                </div>
              )}
            </form.Field>

            {/* Optional Message */}
            <form.Field name="message">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="message" className="text-muted-foreground">
                    Message (optional)
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message to your invitation..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional message to include with your invitation
                  </p>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendInvitationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                sendInvitationMutation.isPending || limitLoading || !!isAtLimit
              }
            >
              {(sendInvitationMutation.isPending || limitLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {!sendInvitationMutation.isPending && !limitLoading && (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isAtLimit ? "Limit Reached" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
