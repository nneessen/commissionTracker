// src/features/hierarchy/components/SendInvitationModal.tsx
// Modal for sending hierarchy invitations - email-only input

import {useState} from 'react';
import {useForm} from '@tanstack/react-form';
import {zodValidator} from '@tanstack/zod-form-adapter';
import {z} from 'zod';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../../../components/ui/dialog';
import {Button} from '../../../components/ui/button';
import {Input} from '../../../components/ui/input';
import {Label} from '../../../components/ui/label';
import {Textarea} from '../../../components/ui/textarea';
import {useSendInvitation} from '../../../hooks/hierarchy/useInvitations';
import {Loader2, Mail, Send} from 'lucide-react';

const _sendInvitationSchema = z.object({
  invitee_email: z.string().email('Invalid email address'),
  message: z.string().optional(),
});

interface SendInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvitationModal({ open, onOpenChange }: SendInvitationModalProps) {
  const sendInvitationMutation = useSendInvitation();

  const form = useForm({
    defaultValues: {
      invitee_email: '',
      message: '',
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
            Send an invitation by email. They must have a registered account to accept.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            {/* Email Field */}
            <form.Field
              name="invitee_email"
            >
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
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
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
            <Button type="submit" disabled={sendInvitationMutation.isPending}>
              {sendInvitationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!sendInvitationMutation.isPending && <Send className="mr-2 h-4 w-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
