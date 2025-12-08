import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCreateEmailTemplate } from '@/features/email/hooks/useEmailTemplates'
import { EmailBlockBuilder } from '@/features/email/components/block-builder'
import type { EmailBlock, EmailTemplateCategory } from '@/types/email.types'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: { value: EmailTemplateCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'documents', label: 'Documents' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'general', label: 'General' },
]

const PREVIEW_VARIABLES: Record<string, string> = {
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

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<EmailTemplateCategory>('general')
  const [isGlobal, setIsGlobal] = useState(false)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])

  const createTemplate = useCreateEmailTemplate()

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName('')
      setSubject('')
      setCategory('general')
      setIsGlobal(false)
      setBlocks([])
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim() || !subject.trim()) return

    await createTemplate.mutateAsync({
      name: name.trim(),
      subject: subject.trim(),
      body_html: '',
      category,
      is_global: isGlobal,
      blocks,
      is_block_template: true,
    })

    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const isValid = name.trim() && subject.trim()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-sm font-semibold">Create Email Template</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createTemplate.isPending}
            size="sm"
            className="h-8"
          >
            {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Template
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Settings sidebar */}
        <div className="w-56 shrink-0 space-y-4 overflow-y-auto border-r bg-muted/20 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subject Line</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to the Team!"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EmailTemplateCategory)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="global"
              checked={isGlobal}
              onCheckedChange={setIsGlobal}
            />
            <Label htmlFor="global" className="text-xs">
              Global Template
            </Label>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createTemplate.isPending}
              className="w-full"
              size="sm"
            >
              {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </div>
        </div>

        {/* Block builder */}
        <div className="flex-1 overflow-hidden">
          <EmailBlockBuilder
            blocks={blocks}
            onChange={setBlocks}
            previewVariables={PREVIEW_VARIABLES}
          />
        </div>
      </div>
    </div>
  )
}
