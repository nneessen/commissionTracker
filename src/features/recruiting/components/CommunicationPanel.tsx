// src/features/recruiting/components/CommunicationPanel.tsx
// Communication panel with modern zinc palette styling

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Send,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailService, type SendEmailRequest } from "@/services/email";
import { showToast } from "@/utils/toast";
import type { UserProfile } from "@/types/hierarchy.types";

interface CommunicationPanelProps {
  userId: string;
  upline?: UserProfile | null;
  currentUserProfile?: UserProfile;
}

export function CommunicationPanel({
  userId,
  upline,
  currentUserProfile,
}: CommunicationPanelProps) {
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const queryClient = useQueryClient();

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["user-messages", userId],
    queryFn: () => emailService.getEmailsForUser(userId),
    enabled: !!userId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { subject: string; body: string }) => {
      if (!upline?.email) {
        throw new Error("No recruiter email available");
      }

      const request: SendEmailRequest = {
        to: [upline.email],
        subject: messageData.subject || "Message from Recruiting Pipeline",
        html: messageData.body.replace(/\n/g, "<br>"),
        text: messageData.body,
        replyTo: currentUserProfile?.email,
        recruitId: userId,
        senderId: userId,
        metadata: {
          sent_via: "communication_panel",
          from_recruit: true,
        },
      };

      return emailService.sendEmail(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-messages", userId] });
      setSubject("");
      setMessageBody("");
      showToast.success("Email sent successfully!");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to send email",
      );
    },
  });

  const handleSendMessage = () => {
    if (!messageBody.trim()) {
      showToast.error("Please enter a message");
      return;
    }

    if (!upline?.email) {
      showToast.error("No recruiter assigned. Please contact support.");
      return;
    }

    sendMessageMutation.mutate({
      subject: subject.trim(),
      body: messageBody.trim(),
    });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, "MMM d");
  };

  const recruiterName = upline
    ? `${upline.first_name || ""} ${upline.last_name || ""}`.trim() ||
      upline.email
    : null;

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="compose" className="flex-1 flex flex-col">
        <TabsList variant="segment" className="mx-3 mt-3 grid grid-cols-2">
          <TabsTrigger value="compose" variant="segment" className="text-sm">
            <Send className="h-4 w-4 mr-1.5" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="inbox" variant="segment" className="text-sm">
            <Inbox className="h-4 w-4 mr-1.5" />
            Messages ({messages?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent
          value="compose"
          className="flex-1 flex flex-col p-3 space-y-3 overflow-hidden"
        >
          {/* Recipient Display */}
          <div className="shrink-0">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              To:
            </label>
            {upline ? (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={upline.profile_photo_url || undefined} />
                  <AvatarFallback className="text-xs bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {upline.first_name?.[0]}
                    {upline.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {recruiterName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {upline.email}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                >
                  My Recruiter
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  No recruiter assigned
                </p>
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div className="shrink-0">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              Subject:
            </label>
            <Input
              placeholder="Email subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* Message Body */}
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 shrink-0 block">
              Message:
            </label>
            <Textarea
              placeholder="Type your message here..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="flex-1 min-h-[120px] resize-none"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={
              !upline?.email ||
              !messageBody.trim() ||
              sendMessageMutation.isPending
            }
            className="h-10 shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="flex-1 overflow-auto p-3">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((message) => {
                const isSent = message.sender_id === userId;
                const statusIcon =
                  message.status === "sent" ||
                  message.status === "delivered" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  ) : message.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  );

                return (
                  <div
                    key={message.id}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                          {isSent ? (
                            <Send className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {isSent ? "Sent" : "Received"}
                          </p>
                          {statusIcon}
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                          {message.subject || "(No subject)"}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                          {message.body_text}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                          {message.sent_at
                            ? formatRelativeTime(message.sent_at)
                            : formatRelativeTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
              <p className="text-base text-zinc-600 dark:text-zinc-400 mb-1">
                No messages yet
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Send your first message to your recruiter
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
