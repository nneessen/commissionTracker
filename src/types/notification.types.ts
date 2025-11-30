/**
 * Notification Types
 *
 * Types for the notification system used to alert users of important events.
 */

export type NotificationType =
  | 'recruit_graduated'
  | 'document_approved'
  | 'document_rejected'
  | 'document_uploaded'
  | 'new_message'
  | 'phase_completed'
  | 'phase_advanced'
  | 'checklist_item_completed'
  | 'email_received';

export interface Notification {
  id: string;
  user_id: string; // user_profile.id
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  expires_at: string | null;
  updated_at: string;
}

export interface CreateNotificationRequest {
  user_id: string; // user_profile.id
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  expires_at?: string; // ISO timestamp
}

export interface NotificationMetadata {
  // For recruit_graduated
  recruit_id?: string;
  recruit_name?: string;
  contract_level?: number;
  graduated_at?: string;

  // For document notifications
  document_id?: string;
  document_type?: string;
  document_name?: string;
  rejection_reason?: string;

  // For message notifications
  thread_id?: string;
  message_id?: string;
  sender_id?: string;
  sender_name?: string;

  // For phase notifications
  phase_id?: string;
  phase_name?: string;
  phase_order?: number;

  // For checklist notifications
  checklist_item_id?: string;
  item_name?: string;

  // For email notifications
  email_id?: string;
  email_subject?: string;

  // Navigation
  link?: string; // Where to navigate when clicked
}

// For UI component props
export interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
}

// Helper type for notification icons
export type NotificationIcon =
  | 'graduate'
  | 'document-approved'
  | 'document-rejected'
  | 'document-uploaded'
  | 'message'
  | 'phase-completed'
  | 'phase-advanced'
  | 'checklist-completed'
  | 'email';

// Notification display configuration
export interface NotificationConfig {
  type: NotificationType;
  icon: NotificationIcon;
  color: string; // Tailwind color class
  defaultTitle: string;
  navigationPath?: (metadata: NotificationMetadata) => string;
}
