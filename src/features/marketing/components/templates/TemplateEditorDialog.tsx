import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EmailBlockBuilder,
  blocksToHtml,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  EMAIL_TEMPLATE_CATEGORIES,
} from "@/features/email";
import type {
  EmailBlock,
  EmailTemplate,
  EmailTemplateCategory,
} from "@/types/email.types";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<EmailTemplateCategory>("general");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);

  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();

  const isEditing = !!template;

  useEffect(() => {
    if (open && template) {
      setName(template.name);
      setSubject(template.subject);
      setCategory(template.category);
      setBlocks(template.blocks || []);
    } else if (open) {
      setName("");
      setSubject("");
      setCategory("general");
      setBlocks([]);
    }
  }, [open, template]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }

    const html = blocksToHtml(blocks);

    if (isEditing && template) {
      updateTemplate.mutate(
        {
          id: template.id,
          updates: {
            name: name.trim(),
            subject: subject.trim(),
            category,
            body_html: html,
            blocks,
            is_block_template: true,
          },
        },
        {
          onSuccess: () => {
            toast.success("Template updated.");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to update template."),
        },
      );
    } else {
      createTemplate.mutate(
        {
          name: name.trim(),
          subject: subject.trim(),
          body_html: html,
          category,
          is_global: true,
          is_active: true,
          blocks,
          is_block_template: true,
        },
        {
          onSuccess: () => {
            toast.success("Template created.");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to create template."),
        },
      );
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-2.5 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">
            {isEditing ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        {/* Fields */}
        <div className="flex gap-3 px-4 py-2 border-b shrink-0">
          <div className="flex-1 space-y-0.5">
            <Label className="text-[10px]">Name</Label>
            <Input
              className="h-7 text-[11px]"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-0.5">
            <Label className="text-[10px]">Subject</Label>
            <Input
              className="h-7 text-[11px]"
              placeholder="Email subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="w-[140px] space-y-0.5">
            <Label className="text-[10px]">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as EmailTemplateCategory)}
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="text-[11px]"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Block Builder */}
        <div
          className="flex-1 overflow-hidden min-h-0"
          style={{ minHeight: 360 }}
        >
          <EmailBlockBuilder
            blocks={blocks}
            onChange={setBlocks}
            subject={subject}
            onSubjectChange={setSubject}
            previewVariables={{
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
            }}
          />
        </div>

        <DialogFooter className="px-4 py-2.5 border-t gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
          >
            {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
