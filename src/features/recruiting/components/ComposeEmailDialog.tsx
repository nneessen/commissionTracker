// src/features/recruiting/components/ComposeEmailDialog.tsx

import {useState, useMemo} from 'react'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {EmailComposer} from '@/features/email'
import {TemplatePicker} from '@/features/email/components/TemplatePicker'
import {blocksToHtml} from '@/features/email/components/block-builder'
import {useSendEmail} from '../hooks/useRecruitEmails'
import type {SendEmailRequest, EmailTemplate} from '@/types/email.types'

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recruitId: string
  recruitEmail: string
  recruitName: string
  senderId: string
}

// Replace variables in text with actual values
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recruitId,
  recruitEmail,
  recruitName,
}: ComposeEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const sendEmail = useSendEmail()

  // Variables available for substitution
  const variables = useMemo(() => ({
    recruit_name: recruitName,
    recruit_first_name: recruitName.split(' ')[0] || recruitName,
    recruit_email: recruitEmail,
    // Add more variables as needed
  }), [recruitName, recruitEmail])

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

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template)
  }

  // Get template data with variable substitution
  const templateData = useMemo(() => {
    if (!selectedTemplate) {
      return { subject: '', bodyHtml: '' }
    }

    // If template has blocks, convert to HTML
    let bodyHtml = ''
    if (selectedTemplate.blocks && Array.isArray(selectedTemplate.blocks) && selectedTemplate.blocks.length > 0) {
      bodyHtml = blocksToHtml(selectedTemplate.blocks, variables)
    } else if (selectedTemplate.body_html) {
      bodyHtml = replaceVariables(selectedTemplate.body_html, variables)
    }

    // Replace variables in subject
    const subject = selectedTemplate.subject
      ? replaceVariables(selectedTemplate.subject, variables)
      : ''

    return { subject, bodyHtml }
  }, [selectedTemplate, variables])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header with template picker */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Compose Email to {recruitName}</DialogTitle>
            <DialogDescription className="sr-only">
              Send an email to {recruitEmail}
            </DialogDescription>
          </DialogHeader>

          {/* Template Picker */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">Template:</span>
            <TemplatePicker
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplate?.id}
              category="recruiting"
            />
            {selectedTemplate && (
              <span className="text-xs text-muted-foreground">
                Using: {selectedTemplate.name}
              </span>
            )}
          </div>
        </div>

        {/* Email Composer - fills remaining space */}
        <div className="flex-1 min-h-0 px-6 py-4">
          <EmailComposer
            to={[recruitEmail]}
            subject={templateData.subject}
            bodyHtml={templateData.bodyHtml}
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
