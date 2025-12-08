import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  FileText,
} from 'lucide-react'
import {
  useEmailTemplates,
  useDeleteEmailTemplate,
  useDuplicateEmailTemplate,
  useToggleTemplateActive,
} from '@/features/email/hooks/useEmailTemplates'
import { CreateTemplateDialog, EditTemplateDialog } from './templates'

interface EmailTemplatesTabProps {
  searchQuery?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  documents: 'Documents',
  follow_up: 'Follow Up',
  general: 'General',
}

export function EmailTemplatesTab({ searchQuery }: EmailTemplatesTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)

  const { data: templates = [], isLoading } = useEmailTemplates({ searchQuery })
  const deleteTemplate = useDeleteEmailTemplate()
  const duplicateTemplate = useDuplicateEmailTemplate()
  const toggleActive = useToggleTemplateActive()

  const handleDelete = async () => {
    if (!deleteTemplateId) return
    await deleteTemplate.mutateAsync(deleteTemplateId)
    setDeleteTemplateId(null)
  }

  const templateToDelete = deleteTemplateId
    ? templates.find((t) => t.id === deleteTemplateId)
    : null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-7 gap-1">
          <Plus className="h-3.5 w-3.5" />
          New Template
        </Button>
      </div>

      {/* Templates table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No email templates yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="mt-2"
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">Name</TableHead>
                <TableHead className="h-8 text-xs">Subject</TableHead>
                <TableHead className="h-8 text-xs">Category</TableHead>
                <TableHead className="h-8 text-xs">Type</TableHead>
                <TableHead className="h-8 text-xs">Status</TableHead>
                <TableHead className="h-8 text-xs">Updated</TableHead>
                <TableHead className="h-8 w-10 text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{template.name}</span>
                      {template.is_global && (
                        <Badge variant="secondary" className="text-[10px]">
                          Global
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">
                    <span className="line-clamp-1">{template.subject}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORY_LABELS[template.category] || template.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={template.is_block_template ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {template.is_block_template ? 'Block' : 'HTML'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                      className={`text-[10px] ${template.is_active ? 'bg-green-500/10 text-green-600' : ''}`}
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">
                    {format(new Date(template.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTemplateId(template.id)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateTemplate.mutate(template.id)}
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toggleActive.mutate({
                              id: template.id,
                              isActive: !template.is_active,
                            })
                          }
                        >
                          {template.is_active ? (
                            <>
                              <ToggleLeft className="mr-2 h-3.5 w-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTemplateId(template.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      <EditTemplateDialog
        templateId={editTemplateId}
        open={!!editTemplateId}
        onOpenChange={(open) => !open && setEditTemplateId(null)}
      />

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
