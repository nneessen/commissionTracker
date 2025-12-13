/**
 * Messaging Types
 *
 * Types for the two-way messaging system between recruits, uplines, trainers, and admins.
 */

import type { UserProfileMinimal } from './user.types';

// Re-export for backward compatibility
// New code should import directly from user.types.ts
export type { UserProfileMinimal as UserProfile } from './user.types';

export interface MessageThread {
  id: string;
  subject: string;
  participant_ids: string[]; // Array of user_profile.id
  created_by: string; // user_profile.id
  last_message_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;

  // Joined data from relations
  created_by_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  };

  // Client-side computed fields
  unread_count?: number;
  last_message_preview?: string;
  participants?: UserProfileMinimal[];
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string; // user_profile.id
  content: string;
  read_by: string[]; // Array of user_profile.id
  created_at: string;
  updated_at: string;

  // Joined data from relations
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  };
}

export interface CreateThreadRequest {
  subject: string;
  recipient_ids: string[]; // Array of user_profile.id (current user auto-added)
  initial_message?: string; // Optional first message
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
}

export interface MarkAsReadRequest {
  messageIds: string[];
  userId: string; // user_profile.id
}

// For UI component props
export interface ThreadListProps {
  threads: MessageThread[];
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
}

export interface ThreadViewProps {
  thread: MessageThread;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export interface MessageComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ComposeThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CreateThreadRequest) => void;
  availableRecipients: UserProfileMinimal[];
}
