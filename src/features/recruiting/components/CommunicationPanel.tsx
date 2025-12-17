// CommunicationPanel - Email communication for recruits to contact their recruiter/upline
// Emails are sent via Resend and stored in user_emails table

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Inbox, Clock, CheckCircle2, AlertCircle, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService, type SendEmailRequest } from '@/services/emailService';
import { showToast } from '@/utils/toast';
import type { UserProfile } from '@/types/hierarchy.types';

interface CommunicationPanelProps {
  userId: string;                    // Current user's profile ID
  upline?: UserProfile | null;       // User's upline (recruiter)
  currentUserProfile?: UserProfile;  // Current user's profile with email
}

export function CommunicationPanel({
  userId,
  upline,
  currentUserProfile
}: CommunicationPanelProps) {
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const queryClient = useQueryClient();

  // Fetch messages for this user
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['user-messages', userId],
    queryFn: () => emailService.getEmailsForUser(userId),
    enabled: !!userId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { subject: string; body: string }) => {
      if (!upline?.email) {
        throw new Error('No recruiter email available');
      }

      const request: SendEmailRequest = {
        to: [upline.email],
        subject: messageData.subject || 'Message from Recruiting Pipeline',
        html: messageData.body.replace(/\n/g, '<br>'),
        text: messageData.body,
        replyTo: currentUserProfile?.email,
        recruitId: userId,
        senderId: userId,
        metadata: {
          sent_via: 'communication_panel',
          from_recruit: true,
        },
      };

      return emailService.sendEmail(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages', userId] });
      setSubject('');
      setMessageBody('');
      showToast.success('Email sent successfully!');
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      showToast.error(error instanceof Error ? error.message : 'Failed to send email');
    },
  });

  const handleSendMessage = () => {
    if (!messageBody.trim()) {
      showToast.error('Please enter a message');
      return;
    }

    if (!upline?.email) {
      showToast.error('No recruiter assigned. Please contact support.');
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, 'MMM d');
  };

  const recruiterName = upline
    ? `${upline.first_name || ''} ${upline.last_name || ''}`.trim() || upline.email
    : null;

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="compose" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 h-8 shrink-0">
          <TabsTrigger value="compose" className="text-[10px]">
            <Send className="h-3 w-3 mr-1" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="inbox" className="text-[10px]">
            <Inbox className="h-3 w-3 mr-1" />
            Messages ({messages?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
          {/* Recipient Display */}
          <div className="shrink-0">
            <label className="text-[10px] font-semibold text-muted-foreground">To:</label>
            {upline ? (
              <div className="flex items-center gap-2 mt-1 p-2 bg-muted/50 rounded-sm">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={upline.profile_photo_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {upline.first_name?.[0]}{upline.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{recruiterName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{upline.email}</p>
                </div>
                <Badge variant="secondary" className="text-[8px] px-1 py-0">
                  My Recruiter
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1 p-2 bg-destructive/10 rounded-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-xs text-destructive">No recruiter assigned</p>
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div className="shrink-0">
            <label className="text-[10px] font-semibold text-muted-foreground">Subject:</label>
            <Input
              placeholder="Email subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-7 text-xs mt-1"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* Message Body */}
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="text-[10px] font-semibold text-muted-foreground shrink-0">Message:</label>
            <Textarea
              placeholder="Type your message here..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="flex-1 min-h-[100px] text-xs resize-none mt-1"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!upline?.email || !messageBody.trim() || sendMessageMutation.isPending}
            size="sm"
            className="h-7 text-xs shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 mr-1" />
                Send Email
              </>
            )}
          </Button>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="flex-1 overflow-auto p-2">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((message) => {
                const isSent = message.sender_id === userId;
                const statusIcon = message.status === 'sent' || message.status === 'delivered'
                  ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                  : message.status === 'failed'
                  ? <AlertCircle className="h-3 w-3 text-red-600" />
                  : <Clock className="h-3 w-3 text-muted-foreground" />;

                return (
                  <Card key={message.id} className="p-2 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[8px]">
                          {isSent ? <Send className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-semibold truncate">
                            {isSent ? 'Sent' : 'Received'}
                          </p>
                          {statusIcon}
                        </div>
                        <p className="text-[10px] font-medium mt-0.5 truncate">{message.subject}</p>
                        <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5">
                          {message.body_text}
                        </p>
                        <p className="text-[8px] text-muted-foreground mt-1">
                          {message.sent_at ? formatRelativeTime(message.sent_at) : formatRelativeTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No messages yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Send your first message to your recruiter
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
