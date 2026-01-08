// src/features/messages/components/linkedin/LinkedInMessageInput.tsx
// Message composer with 8000 character limit for LinkedIn DMs

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Send, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_CHARS = 8000; // LinkedIn allows up to 8000 characters

interface LinkedInMessageInputProps {
  onSend: (text: string, templateId?: string) => void;
  onScheduleClick?: () => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showScheduleButton?: boolean;
}

export function LinkedInMessageInput({
  onSend,
  onScheduleClick,
  isSending = false,
  disabled = false,
  placeholder = "Type a message...",
  showScheduleButton = true,
}: LinkedInMessageInputProps): ReactNode {
  const [text, setText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || isSending;
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = text.trim().length > 0 && !isOverLimit && !isDisabled;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), selectedTemplateId || undefined);
    setText("");
    setSelectedTemplateId(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-end gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border transition-colors",
          isOverLimit
            ? "border-red-300 dark:border-red-700"
            : "border-zinc-200 dark:border-zinc-700",
        )}
      >
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Clear template ID if user modifies text
            if (selectedTemplateId) {
              setSelectedTemplateId(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={cn(
            "flex-1 min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-1.5 text-[11px] placeholder:text-zinc-400",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
          rows={1}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Schedule button */}
          {showScheduleButton && onScheduleClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onScheduleClick}
              disabled={isDisabled}
              title="Schedule message"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Send button */}
          <Button
            size="icon"
            className="h-7 w-7 bg-blue-600 hover:bg-blue-700"
            onClick={handleSend}
            disabled={!canSend}
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Character counter */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
          Press Enter to send, Shift+Enter for new line
        </p>
        <p
          className={cn(
            "text-[9px]",
            isOverLimit
              ? "text-red-500 font-medium"
              : charCount > MAX_CHARS * 0.9
                ? "text-amber-500"
                : "text-zinc-400 dark:text-zinc-500",
          )}
        >
          {charCount}/{MAX_CHARS}
        </p>
      </div>
    </div>
  );
}
