import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useEmailTemplate, useUpdateEmailTemplate } from '@/features/email/hooks/useEmailTemplates'
import { EmailBlockBuilder } from '@/features/email/components/block-builder'
import type { EmailBlock, EmailTemplateCategory } from '@/types/email.types'

interface EditTemplateDialogProps {
  templateId: string | null
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

export function EditTemplateDialog({ templateId, open, onOpenChange }: EditTemplateDialogProps) {
  const { data: template, isLoading } = useEmailTemplate(templateId)
  const updateTemplate = useUpdateEmailTemplate()

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<EmailTemplateCategory>('general')
  const [isGlobal, setIsGlobal] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Populate form when template loads
  useEffect(() => {
    if (template && !isInitialized) {
      setName(template.name)
      setSubject(template.subject)
      setCategory(template.category)
      setIsGlobal(template.is_global)
      setIsActive(template.is_active)
      setBlocks(template.blocks || [])
      setIsInitialized(true)
    }
  }, [template, isInitialized])

  // Reset initialization when dialog closes
  useEffect(() => {
    if (!open) {
      setIsInitialized(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!templateId || !name.trim() || !subject.trim()) return

    await updateTemplate.mutateAsync({
      id: templateId,
      updates: {
        name: name.trim(),
        subject: subject.trim(),
        category,
        is_global: isGlobal,
        is_active: isActive,
        blocks,
        is_block_template: true,
      },
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
        <h1 className="text-sm font-semibold">Edit Email Template</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || updateTemplate.isPending || isLoading}
            size="sm"
            className="h-8"
          >
            {updateTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
                id="edit-global"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
              <Label htmlFor="edit-global" className="text-xs">
                Global Template
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="edit-active" className="text-xs">
                Active
              </Label>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!isValid || updateTemplate.isPending}
                className="w-full"
                size="sm"
              >
                {updateTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
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
      )}
    </div>
  )
}
