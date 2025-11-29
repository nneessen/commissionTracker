// /home/nneessen/projects/commissionTracker/src/features/recruiting/components/CommunicationPanel.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Users,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import type { UserProfile } from '@/types/hierarchy.types';

interface CommunicationPanelProps {
  userId: string;
  upline?: UserProfile | null;
  currentUserProfile?: any; // Using any to avoid type conflict
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  channel: 'email' | 'slack';
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  sender?: UserProfile;
  recipient?: UserProfile;
}

export function CommunicationPanel({
  userId,
  upline,
  currentUserProfile
}: CommunicationPanelProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [messageChannel, setMessageChannel] = useState<'email' | 'slack'>('email');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available contacts (upline, contract admins, trainers)
  const { data: contacts } = useQuery({
    queryKey: ['communication-contacts', userId],
    queryFn: async () => {
      // Build the query conditions
      const conditions = [];

      // Add upline if exists
      if (upline?.id) {
        conditions.push(`id.eq.${upline.id}`);
      }

      // Add admins
      conditions.push('is_admin.eq.true');

      // If no conditions, just get admins
      const orFilter = conditions.length > 0 ? conditions.join(',') : 'is_admin.eq.true';

      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(orFilter)
        .order('first_name');

      if (error) throw error;

      // Filter for trainers and contract managers in JavaScript since roles is an array
      const filteredProfiles = profiles?.filter(p =>
        p.id === upline?.id ||
        p.is_admin ||
        p.roles?.includes('trainer') ||
        p.roles?.includes('contracting_manager')
      ) || [];

      return filteredProfiles as UserProfile[];
    },
    enabled: !!userId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['user-messages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_emails')
        .select(`
          *,
          sender:sender_id(id, first_name, last_name, email, profile_photo_url),
          recipient:user_id(id, first_name, last_name, email, profile_photo_url)
        `)
        .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      recipients: string[];
      subject: string;
      body: string;
      channel: 'email' | 'slack';
    }) => {
      setSendingMessage(true);

      // Create message records for each recipient
      const messagePromises = messageData.recipients.map(async (recipientId) => {
        const { data, error } = await supabase
          .from('user_emails')
          .insert({
            user_id: recipientId,
            sender_id: userId,
            subject: messageData.subject,
            body_text: messageData.body,
            body_html: messageData.body.replace(/\n/g, '<br>'),
            status: 'sent',
            metadata: {
              channel: messageData.channel,
              sent_via: 'recruiting_pipeline',
            },
          })
          .select()
          .single();

        if (error) throw error;

        // If Slack, also send via Slack API (placeholder)
        if (messageData.channel === 'slack') {
          // TODO: Implement Slack integration
          console.log('Sending Slack message to', recipientId);
        }

        return data;
      });

      return Promise.all(messagePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      // Reset form
      setSubject('');
      setMessageBody('');
      setSelectedRecipients([]);
      setSendingMessage(false);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setSendingMessage(false);
    },
  });

  const handleSendMessage = () => {
    if (selectedRecipients.length === 0 || !messageBody.trim()) {
      return;
    }

    sendMessageMutation.mutate({
      recipients: selectedRecipients,
      subject: subject || 'Message from Recruiting Pipeline',
      body: messageBody,
      channel: messageChannel,
    });
  };

  const getContactRole = (contact: UserProfile) => {
    if (contact.is_admin) return 'Admin';
    if (contact.roles?.includes('trainer')) return 'Trainer';
    if (contact.roles?.includes('contracting_manager')) return 'Contracts';
    if (contact.id === upline?.id) return 'Upline';
    return 'Contact';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'Trainer': return 'secondary';
      case 'Contracts': return 'outline';
      case 'Upline': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="border rounded-sm bg-card h-full flex flex-col">
      <Tabs defaultValue="compose" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 h-8">
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
        <TabsContent value="compose" className="flex-1 flex flex-col p-2 space-y-2">
          {/* Recipients Selection */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground">
              Recipients:
            </label>
            <div className="mt-1 space-y-1 max-h-24 overflow-auto">
              {contacts?.map((contact) => {
                const role = getContactRole(contact);
                const isSelected = selectedRecipients.includes(contact.id);

                return (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-2 p-1 rounded-sm cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedRecipients(prev =>
                        isSelected
                          ? prev.filter(id => id !== contact.id)
                          : [...prev, contact.id]
                      );
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-3 w-3"
                    />
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={contact.profile_photo_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-sans truncate">
                        {contact.first_name} {contact.last_name}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(role)} className="text-[8px] px-1 py-0">
                      {role}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Channel Selection */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold text-muted-foreground">
              Channel:
            </label>
            <Select value={messageChannel} onValueChange={(v: any) => setMessageChannel(v)}>
              <SelectTrigger className="h-6 text-[10px] flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email" className="text-[10px]">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="slack" className="text-[10px]">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Slack
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject (for email) */}
          {messageChannel === 'email' && (
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-6 text-[10px]"
            />
          )}

          {/* Message Body */}
          <Textarea
            placeholder="Type your message here..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            className="flex-1 min-h-[80px] text-[10px] resize-none"
          />

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={selectedRecipients.length === 0 || !messageBody.trim() || sendingMessage}
            size="sm"
            className="h-6 text-[10px]"
          >
            <Send className="h-3 w-3 mr-1" />
            {sendingMessage ? 'Sending...' : `Send ${messageChannel === 'slack' ? 'Slack' : 'Email'}`}
          </Button>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="flex-1 overflow-auto p-2">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((message) => {
                const isSent = message.sender_id === userId;
                const otherPerson = isSent ? message.recipient : message.sender;

                return (
                  <div
                    key={message.id}
                    className="p-2 border rounded-sm hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={otherPerson?.profile_photo_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {otherPerson?.first_name?.[0]}{otherPerson?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-semibold truncate">
                            {isSent ? 'To: ' : 'From: '}
                            {otherPerson?.first_name} {otherPerson?.last_name}
                          </p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0">
                            {message.metadata?.channel || 'email'}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-medium mt-1">{message.subject}</p>
                        <p className="text-[9px] text-muted-foreground line-clamp-2 mt-1">
                          {message.body_text}
                        </p>
                        <p className="text-[8px] text-muted-foreground mt-1">
                          {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      {message.status === 'delivered' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : message.status === 'read' ? (
                        <CheckCircle2 className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">No messages yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}