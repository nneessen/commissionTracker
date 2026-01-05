// src/features/messages/components/instagram/InstagramContactInfoPanel.tsx
// Collapsible panel for viewing/editing contact info in conversation header

import { type ReactNode, useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Save,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUpdateInstagramContactInfo } from "@/hooks/instagram";
import type { InstagramConversation } from "@/types/instagram.types";

interface InstagramContactInfoPanelProps {
  conversation: InstagramConversation;
}

export function InstagramContactInfoPanel({
  conversation,
}: InstagramContactInfoPanelProps): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState(conversation.participant_email || "");
  const [phone, setPhone] = useState(conversation.participant_phone || "");
  const [notes, setNotes] = useState(conversation.contact_notes || "");
  const [showSaved, setShowSaved] = useState(false);

  const updateContactInfo = useUpdateInstagramContactInfo();

  // Compute hasChanges with useMemo to avoid unnecessary state updates
  const hasChanges = useMemo(() => {
    return (
      email !== (conversation.participant_email || "") ||
      phone !== (conversation.participant_phone || "") ||
      notes !== (conversation.contact_notes || "")
    );
  }, [
    email,
    phone,
    notes,
    conversation.participant_email,
    conversation.participant_phone,
    conversation.contact_notes,
  ]);

  // Reset form when conversation changes (by id and contact field values)
  useEffect(() => {
    setEmail(conversation.participant_email || "");
    setPhone(conversation.participant_phone || "");
    setNotes(conversation.contact_notes || "");
    setShowSaved(false);
  }, [
    conversation.id,
    conversation.participant_email,
    conversation.participant_phone,
    conversation.contact_notes,
  ]);

  const handleSave = async () => {
    try {
      await updateContactInfo.mutateAsync({
        conversationId: conversation.id,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowSaved(true);
      toast.success("Contact info saved");

      // Hide saved indicator after 2 seconds
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error("[InstagramContactInfoPanel] Save failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save contact info",
      );
    }
  };

  // Check if any contact info exists
  const hasContactInfo =
    conversation.participant_email ||
    conversation.participant_phone ||
    conversation.contact_notes;

  // Collapsed state - show summary
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
          {hasContactInfo ? (
            <>
              {conversation.participant_email && (
                <span className="flex items-center gap-0.5">
                  <Mail className="h-3 w-3" />
                  {conversation.participant_email}
                </span>
              )}
              {conversation.participant_phone && (
                <span className="flex items-center gap-0.5">
                  <Phone className="h-3 w-3" />
                  {conversation.participant_phone}
                </span>
              )}
              {conversation.contact_notes &&
                !conversation.participant_email &&
                !conversation.participant_phone && (
                  <span className="flex items-center gap-0.5">
                    <FileText className="h-3 w-3" />
                    Has notes
                  </span>
                )}
            </>
          ) : (
            <span className="italic">Add contact info</span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>
    );
  }

  // Expanded state - show form
  return (
    <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 space-y-2">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
          Contact Info
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
        >
          <ChevronUp className="h-3 w-3 text-zinc-400" />
        </button>
      </div>

      {/* Email and Phone row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <Mail className="h-2.5 w-2.5" />
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="h-6 text-[10px] px-2"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <Phone className="h-2.5 w-2.5" />
            Phone
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 555-5555"
            className="h-6 text-[10px] px-2"
          />
        </div>
      </div>

      {/* Notes row */}
      <div className="space-y-0.5">
        <label className="text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <FileText className="h-2.5 w-2.5" />
          Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes about this contact..."
          className="h-14 text-[10px] px-2 py-1 resize-none"
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        {showSaved ? (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Saved
          </div>
        ) : (
          <Button
            size="sm"
            variant={hasChanges ? "default" : "ghost"}
            className={cn(
              "h-5 text-[9px] px-2",
              !hasChanges && "text-zinc-400",
            )}
            onClick={handleSave}
            disabled={!hasChanges || updateContactInfo.isPending}
          >
            <Save className="h-2.5 w-2.5 mr-1" />
            {updateContactInfo.isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}
