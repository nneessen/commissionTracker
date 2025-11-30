// src/features/recruiting/components/ComposeEmailDialog.tsx

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmailComposer } from '@/features/email'
import { useSendEmail } from '../hooks/useRecruitEmails'
import type { SendEmailRequest } from '@/types/email.types'

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recruitId: string
  recruitEmail: string
  recruitName: string
  senderId: string
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recruitId,
  recruitEmail,
  recruitName,
  senderId,
}: ComposeEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const sendEmail = useSendEmail()

  const handleSend = async (email: SendEmailRequest) => {
    try {
      // Send the email with proper format for Edge Function
      await sendEmail.mutateAsync({
        ...email,
        recruitId, // Add recruit context
      })

      // Close dialog on success
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    }
  }

  // Template data (will be replaced with database templates in Phase 2B)
  const templates = {
    welcome: {
      subject: `Welcome to our team, ${recruitName}!`,
      bodyHtml: `<p>Hi ${recruitName},</p><p>Welcome to our team! We're excited to have you on board.</p><p>In the next few days, you'll receive information about the next steps in your onboarding process.</p><p>If you have any questions, feel free to reach out.</p><p>Best regards</p>`,
    },
    document_request: {
      subject: 'Document Upload Request',
      bodyHtml: `<p>Hi ${recruitName},</p><p>We need you to upload the following documents to proceed with your onboarding:</p><ul><li>[List documents here]</li></ul><p>Please upload these documents at your earliest convenience.</p><p>Thank you!</p>`,
    },
    follow_up: {
      subject: 'Checking in on your progress',
      bodyHtml: `<p>Hi ${recruitName},</p><p>I wanted to check in and see how things are going with your onboarding process.</p><p>Do you have any questions or need any assistance?</p><p>Looking forward to hearing from you.</p><p>Best regards</p>`,
    },
  }

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template)
  }

  const getTemplateData = () => {
    if (selectedTemplate && selectedTemplate in templates) {
      return templates[selectedTemplate as keyof typeof templates]
    }
    return { subject: '', bodyHtml: '' }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header with templates */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Compose Email to {recruitName}</DialogTitle>
            <DialogDescription className="sr-only">
              Send an email to {recruitEmail}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Templates */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">Templates:</span>
            <Button
              type="button"
              variant={selectedTemplate === 'welcome' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleTemplateSelect('welcome')}
            >
              Welcome
            </Button>
            <Button
              type="button"
              variant={selectedTemplate === 'document_request' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleTemplateSelect('document_request')}
            >
              Document Request
            </Button>
            <Button
              type="button"
              variant={selectedTemplate === 'follow_up' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleTemplateSelect('follow_up')}
            >
              Follow-up
            </Button>
          </div>
        </div>

        {/* Email Composer - fills remaining space */}
        <div className="flex-1 min-h-0 px-6 py-4">
          <EmailComposer
            to={[recruitEmail]}
            subject={getTemplateData().subject}
            bodyHtml={getTemplateData().bodyHtml}
            recruitId={recruitId}
            onSend={handleSend}
            onCancel={() => onOpenChange(false)}
            isSending={sendEmail.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
