// src/features/policies/components/FirstSellerNamingDialog.tsx
// Dialog shown to first seller of the day to name the leaderboard

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/services/base/supabase";
import { toast } from "sonner";

// Common emojis for leaderboard titles
const QUICK_EMOJIS = [
  "🔥",
  "💰",
  "🚀",
  "💪",
  "⭐",
  "🏆",
  "👑",
  "💎",
  "🎯",
  "📈",
  "🙌",
  "✨",
  "💵",
  "🎉",
  "🌟",
  "⚡",
];

interface FirstSellerNamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  agencyName: string;
}

export function FirstSellerNamingDialog({
  open,
  onOpenChange,
  logId,
  agencyName,
}: FirstSellerNamingDialogProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHandlingClose, setIsHandlingClose] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setTitle((prev) => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? title.length;
    const end = input.selectionEnd ?? title.length;
    const newValue = title.slice(0, start) + emoji + title.slice(end);
    setTitle(newValue);

    // Set cursor position after the inserted emoji
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for the leaderboard");
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Update the title in the database
      const { error } = await supabase.rpc("set_leaderboard_title", {
        p_log_id: logId,
        p_title: title.trim(),
      });

      if (error) {
        console.error("Error setting leaderboard title:", error);
        toast.error("Failed to set leaderboard title");
        return;
      }

      // Step 2: Complete the first sale - posts to Slack with the new title
      try {
        const response = await supabase.functions.invoke(
          "slack-policy-notification",
          {
            body: {
              action: "complete-first-sale",
              logId: logId,
            },
          },
        );

        if (response.error) {
          console.error("Error completing first sale:", response.error);
          toast.error("Leaderboard named but failed to post to Slack");
        } else {
          toast.success("Leaderboard named and posted to Slack!");
        }
      } catch (slackErr) {
        console.error("Error calling complete-first-sale:", slackErr);
        toast.error("Leaderboard named but failed to post to Slack");
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error setting leaderboard title:", err);
      toast.error("Failed to set leaderboard title");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // User skipped naming - still need to post to Slack with default title
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke(
        "slack-policy-notification",
        {
          body: {
            action: "complete-first-sale",
            logId: logId,
          },
        },
      );

      if (response.error) {
        console.error("Error completing first sale on skip:", response.error);
      }
    } catch (err) {
      console.error("Error on skip:", err);
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  // Handle dialog dismissal (clicking outside, pressing ESC)
  // This ensures the notification is always posted even if user dismisses without action
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && !isHandlingClose && !isSubmitting) {
      // Dialog being dismissed without completing - trigger skip to post notification
      setIsHandlingClose(true);
      await handleSkip();
      setIsHandlingClose(false);
      return; // handleSkip already calls onOpenChange(false)
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            Congratulations! First Sale of the Day!
          </DialogTitle>
          <DialogDescription className="text-base">
            You're the first to close a deal{" "}
            {agencyName !== "IMO-Level" ? `at ${agencyName}` : ""} today! As a
            reward, you get to name today's leaderboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="leaderboard-title">Leaderboard Title</Label>
            <Input
              ref={inputRef}
              id="leaderboard-title"
              placeholder="e.g., Freaky Friday Sales, Monday Motivation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitting) {
                  handleSubmit();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This title will appear on the Slack leaderboard for everyone to
              see
            </p>
          </div>

          {/* Quick emoji picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Add emoji</Label>
            <div className="flex flex-wrap gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                  disabled={isSubmitting}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? "Saving..." : "Name the Leaderboard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
