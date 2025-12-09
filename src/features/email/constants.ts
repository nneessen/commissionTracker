// Email feature constants

import type { EmailTemplateCategory } from '@/types/email.types'

// Template categories for dropdowns
export const EMAIL_TEMPLATE_CATEGORIES: { value: EmailTemplateCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'documents', label: 'Documents' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'general', label: 'General' },
]

// Preview variables for template builder
export const TEMPLATE_PREVIEW_VARIABLES: Record<string, string> = {
  recruit_name: 'John Doe',
  recruit_first_name: 'John',
  recruit_email: 'john.doe@example.com',
  phase_name: 'Bootcamp',
  phase_description: 'Initial training and orientation',
  sender_name: 'Jane Smith',
  recruiter_name: 'Jane Smith',
  checklist_items: '1. Complete training\n2. Submit documents',
  current_date: new Date().toLocaleDateString(),
  deadline_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
}
