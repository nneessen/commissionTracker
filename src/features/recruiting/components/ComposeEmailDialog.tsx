// src/features/recruiting/components/ComposeEmailDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useSendEmail } from '../hooks/useRecruitEmails';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitId: string;
  recruitEmail: string;
  recruitName: string;
  senderId: string;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recruitId,
  recruitEmail,
  recruitName,
  senderId,
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const sendEmail = useSendEmail();

  const handleSend = async () => {
    if (!subject || !body) {
      alert('Please fill in subject and message');
      return;
    }

    try {
      await sendEmail.mutateAsync({
        recruitId,
        senderId,
        subject,
        body,
      });

      // Reset form and close
      setSubject('');
      setBody('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    }
  };

  const handleTemplateSelect = (template: string) => {
    switch (template) {
      case 'welcome':
        setSubject(`Welcome to our team, ${recruitName}!`);
        setBody(`Hi ${recruitName},\n\nWelcome to our team! We're excited to have you on board.\n\nIn the next few days, you'll receive information about the next steps in your onboarding process.\n\nIf you have any questions, feel free to reach out.\n\nBest regards`);
        break;
      case 'document_request':
        setSubject('Document Upload Request');
        setBody(`Hi ${recruitName},\n\nWe need you to upload the following documents to proceed with your onboarding:\n\n- [List documents here]\n\nPlease upload these documents at your earliest convenience.\n\nThank you!`);
        break;
      case 'follow_up':
        setSubject('Checking in on your progress');
        setBody(`Hi ${recruitName},\n\nI wanted to check in and see how things are going with your onboarding process.\n\nDo you have any questions or need any assistance?\n\nLooking forward to hearing from you.\n\nBest regards`);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email to {recruitName} ({recruitEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Templates */}
          <div className="space-y-2">
            <Label>Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect('welcome')}
              >
                Welcome Email
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect('document_request')}
              >
                Document Request
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect('follow_up')}
              >
                Follow-up
              </Button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={12}
              className="resize-none"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {body.length} characters
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendEmail.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!subject || !body || sendEmail.isPending}
          >
            {sendEmail.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
