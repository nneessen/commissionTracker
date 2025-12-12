// src/features/recruiting/components/EmailManager.tsx

import React, { useState } from 'react';
import {UserEmail} from '@/types/recruiting';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {Mail, Send, Clock, CheckCircle2, AlertCircle, Eye, FileText} from 'lucide-react';
import {useSendEmail} from '../hooks/useRecruitEmails';
import {ComposeEmailDialog} from './ComposeEmailDialog';

interface EmailManagerProps {
  recruitId: string;
  recruitEmail: string;
  recruitName: string;
  emails?: UserEmail[];
  isUpline?: boolean;
  currentUserId?: string;
}

const EMAIL_STATUS_CONFIG = {
  draft: { icon: Mail, color: 'text-gray-600 bg-gray-100', label: 'Draft' },
  sending: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Sending' },
  sent: { icon: Send, color: 'text-green-600 bg-green-100', label: 'Sent' },
  delivered: { icon: CheckCircle2, color: 'text-green-600 bg-green-100', label: 'Delivered' },
  opened: { icon: Eye, color: 'text-purple-600 bg-purple-100', label: 'Opened' },
  failed: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
};

export function EmailManager({
  recruitId,
  recruitEmail,
  recruitName,
  emails,
  isUpline = false,
  currentUserId
}: EmailManagerProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<UserEmail | null>(null);

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
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header with Compose Button */}
      {isUpline && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {emails && emails.length > 0 ? `${emails.length} emails` : 'No emails'}
          </h3>
          <Button size="sm" onClick={() => setIsComposeOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
        </div>
      )}

      {/* Email List */}
      {emails && emails.length > 0 ? (
        <div className="space-y-2">
          {emails.map((email) => {
            const statusConfig = EMAIL_STATUS_CONFIG[email.status] || EMAIL_STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={email.id} className="p-4 hover:border-muted-foreground/30 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{email.subject}</h4>
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {email.sent_at && (
                          <span>Sent {formatRelativeTime(email.sent_at)}</span>
                        )}
                        {email.delivered_at && (
                          <>
                            <span>•</span>
                            <span>Delivered {formatRelativeTime(email.delivered_at)}</span>
                          </>
                        )}
                        {email.opened_at && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600">
                              Opened {formatRelativeTime(email.opened_at)}
                            </span>
                          </>
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>

                      {email.failed_reason && (
                        <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-950/50 rounded-sm text-sm">
                          <span className="font-medium text-red-900 dark:text-red-100">Failed: </span>
                          <span className="text-red-800 dark:text-red-200">{email.failed_reason}</span>
                        </div>
                      )}

                      {/* Email Preview */}
                      {email.body_text && (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {email.body_text}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No emails sent yet</p>
          {isUpline && (
            <p className="text-sm mt-1">Click "Compose Email" to send your first email</p>
          )}
        </div>
      )}

      {/* Compose Dialog */}
      {isUpline && (
        <ComposeEmailDialog
          open={isComposeOpen}
          onOpenChange={setIsComposeOpen}
          recruitId={recruitId}
          recruitEmail={recruitEmail}
          recruitName={recruitName}
          senderId={currentUserId || ''}
        />
      )}

      {/* View Email Dialog */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedEmail.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmail.sent_at && `Sent ${new Date(selectedEmail.sent_at).toLocaleString()}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                    ×
                  </Button>
                </div>

                {selectedEmail.body_html ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{selectedEmail.body_text}</div>
                )}

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>{attachment.file_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
