// src/features/recruiting/components/ComposeEmailDialog.tsx

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmailComposer, TemplatePicker, blocksToHtml } from "@/features/email";
import { useSendEmail } from "../hooks/useRecruitEmails";
// eslint-disable-next-line no-restricted-imports
import type { SendEmailRequest } from "@/services/email";
import type { EmailTemplate } from "@/types/email.types";
import { toast } from "sonner";
import { replaceTemplateVariables } from "@/lib/templateVariables";

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitId: string;
  recruitEmail: string;
  recruitName: string;
  senderId: string;
  uplineEmail?: string;
  uplineName?: string;
}

// Extract body innerHTML from a full HTML document so TipTap receives a fragment
function extractBodyContent(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body?.innerHTML?.trim() || html;
  } catch {
    return html;
  }
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recruitId,
  recruitEmail,
  recruitName,
  senderId: _senderId,
  uplineEmail,
  uplineName,
}: ComposeEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const sendEmail = useSendEmail();

  // Variables available for substitution
  const variables = useMemo(
    () => ({
      recruit_name: recruitName,
      recruit_first_name: recruitName.split(" ")[0] || recruitName,
      recruit_email: recruitEmail,
      // Add more variables as needed
    }),
    [recruitName, recruitEmail],
  );

  const handleSend = async (email: SendEmailRequest) => {
    try {
      // For block-based templates, send the properly formatted block HTML
      // instead of TipTap's processed output (which loses block structure)
      let finalHtml = email.html;
      if (
        selectedTemplate?.blocks &&
        Array.isArray(selectedTemplate.blocks) &&
        selectedTemplate.blocks.length > 0
      ) {
        finalHtml = blocksToHtml(selectedTemplate.blocks, variables);
      }

      await sendEmail.mutateAsync({
        ...email,
        html: finalHtml,
        recruitId,
      });

      toast.success("Email sent successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send email:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send email";
      toast.error("Failed to send email", {
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  // Get template data with variable substitution
  const templateData = useMemo(() => {
    if (!selectedTemplate) {
      return { subject: "", bodyHtml: "" };
    }

    // If template has blocks, extract the body fragment for TipTap display
    // (TipTap cannot handle a full <!DOCTYPE html> document as content)
    let bodyHtml = "";
    if (
      selectedTemplate.blocks &&
      Array.isArray(selectedTemplate.blocks) &&
      selectedTemplate.blocks.length > 0
    ) {
      bodyHtml = extractBodyContent(
        blocksToHtml(selectedTemplate.blocks, variables),
      );
    } else if (selectedTemplate.body_html) {
      bodyHtml = extractBodyContent(
        replaceTemplateVariables(selectedTemplate.body_html, variables),
      );
    }

    const subject = selectedTemplate.subject
      ? replaceTemplateVariables(selectedTemplate.subject, variables)
      : "";

    return { subject, bodyHtml };
  }, [selectedTemplate, variables]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col p-0 gap-0 z-50">
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
            uplineEmail={uplineEmail}
            uplineName={uplineName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
