// src/features/email/components/EmailComposer.tsx

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, X, Paperclip, Trash2, FileText } from "lucide-react";
import { TipTapEditor } from "./TipTapEditor";
import { sanitizeForEmail } from "../services/sanitizationService";
import { convertHtmlToText } from "../services/htmlToTextService";
import type { SendEmailRequest } from "@/services/email";

interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB Gmail limit

export interface EmailComposerProps {
  to?: string[];
  cc?: string[];
  subject?: string;
  bodyHtml?: string;
  recruitId?: string;
  phaseId?: string;
  onSend?: (email: SendEmailRequest) => void | Promise<void>;
  onCancel?: () => void;
  isSending?: boolean;
}

export function EmailComposer({
  to: initialTo = [],
  cc: initialCc = [],
  subject: initialSubject = "",
  bodyHtml: initialBodyHtml = "",
  recruitId,
  onSend,
  onCancel,
  isSending = false,
}: EmailComposerProps) {
  const [to, setTo] = useState<string[]>(initialTo);
  const [cc, setCc] = useState<string[]>(initialCc);
  const [showCc, setShowCc] = useState(initialCc.length > 0);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track previous values to prevent infinite loops
  const prevInitialTo = useRef<string>(JSON.stringify(initialTo));
  const prevInitialCc = useRef<string>(JSON.stringify(initialCc));
  const prevInitialSubject = useRef<string>(initialSubject);
  const prevInitialBodyHtml = useRef<string>(initialBodyHtml);

  useEffect(() => {
    const serializedTo = JSON.stringify(initialTo);
    if (serializedTo !== prevInitialTo.current) {
      prevInitialTo.current = serializedTo;
      setTo(initialTo);
    }
  }, [initialTo]);

  useEffect(() => {
    const serializedCc = JSON.stringify(initialCc);
    if (serializedCc !== prevInitialCc.current) {
      prevInitialCc.current = serializedCc;
      setCc(initialCc);
    }
  }, [initialCc]);

  useEffect(() => {
    if (initialSubject !== prevInitialSubject.current) {
      prevInitialSubject.current = initialSubject;
      setSubject(initialSubject);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (initialBodyHtml !== prevInitialBodyHtml.current) {
      prevInitialBodyHtml.current = initialBodyHtml;
      setBodyHtml(initialBodyHtml);
    }
  }, [initialBodyHtml]);

  const totalAttachmentSize = attachments.reduce((sum, a) => sum + a.size, 0);

  const handleSend = async () => {
    if (!canSend()) return;

    const sanitizedHtml = sanitizeForEmail(bodyHtml);
    const bodyText = convertHtmlToText(sanitizedHtml);

    // Convert attachments to base64 for Edge Function
    const _attachmentData = await Promise.all(
      attachments.map(async (att) => {
        const buffer = await att.file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        return {
          filename: att.name,
          content: base64,
          mimeType: att.type,
        };
      }),
    );

    const emailRequest: SendEmailRequest = {
      to,
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html: sanitizedHtml,
      text: bodyText,
      recruitId,
    };

    await onSend?.(emailRequest);
  };

  const canSend = (): boolean => {
    return (
      to.length > 0 &&
      subject.trim() !== "" &&
      bodyHtml.trim() !== "" &&
      bodyHtml !== "<p></p>" &&
      !isSending
    );
  };

  const addRecipient = (type: "to" | "cc") => {
    const input = type === "to" ? toInput : ccInput;
    const email = input.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    if (type === "to") {
      if (!to.includes(email)) setTo([...to, email]);
      setToInput("");
    } else {
      if (!cc.includes(email)) setCc([...cc, email]);
      setCcInput("");
    }
  };

  const removeRecipient = (type: "to" | "cc", email: string) => {
    if (type === "to") {
      setTo(to.filter((e) => e !== email));
    } else {
      setCc(cc.filter((e) => e !== email));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: "to" | "cc") => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient(type);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    let totalSize = totalAttachmentSize;

    for (const file of Array.from(files)) {
      if (totalSize + file.size > MAX_ATTACHMENT_SIZE) {
        alert(
          `Cannot add ${file.name}: Total attachments would exceed 25MB limit`,
        );
        continue;
      }
      newAttachments.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      });
      totalSize += file.size;
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - To, CC, Subject */}
      <div className="shrink-0 space-y-3 pb-3 border-b">
        {/* To Field - Compact inline */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-16 shrink-0">To:</span>
          <div className="flex-1 flex flex-wrap items-center gap-1">
            {to.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient("to", email)}
                  className="hover:bg-secondary-foreground/20 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Input
              type="email"
              placeholder="Add recipient..."
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "to")}
              onBlur={() => addRecipient("to")}
              disabled={isSending}
              className="flex-1 min-w-[150px] h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
            />
          </div>
          {!showCc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCc(true)}
              className="text-xs h-6"
            >
              Cc
            </Button>
          )}
        </div>

        {/* CC Field */}
        {showCc && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-16 shrink-0">Cc:</span>
            <div className="flex-1 flex flex-wrap items-center gap-1">
              {cc.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient("cc", email)}
                    className="hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Input
                type="email"
                placeholder="Add Cc..."
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "cc")}
                onBlur={() => addRecipient("cc")}
                disabled={isSending}
                className="flex-1 min-w-[150px] h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
              />
            </div>
          </div>
        )}

        {/* Subject Field */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-16 shrink-0">Subject:</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
            disabled={isSending}
            className="flex-1 h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
          />
        </div>
      </div>

      {/* Body Section - Grows to fill space */}
      <div className="flex-1 min-h-0 py-3 overflow-hidden">
        <TipTapEditor
          content={bodyHtml}
          onChange={setBodyHtml}
          placeholder="Write your message..."
          editable={!isSending}
          showMenuBar={true}
          minHeight="100%"
          className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:overflow-y-auto"
        />
      </div>

      {/* Footer Section - Attachments + Actions */}
      <div className="shrink-0 pt-3 border-t space-y-3">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-muted rounded border"
              >
                <FileText className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <span className="text-muted-foreground">
                  ({formatFileSize(att.size)})
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <span className="text-xs text-muted-foreground self-center">
              Total: {formatFileSize(totalAttachmentSize)} / 25 MB
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isSending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSending}
              >
                Cancel
              </Button>
            )}
            <Button onClick={handleSend} disabled={!canSend()}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
