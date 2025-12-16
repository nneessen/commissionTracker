// src/features/messages/components/labels/CreateLabelDialog.tsx
// Dialog for creating new email labels

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

const LABEL_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

interface CreateLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLabel: (name: string, color: string) => Promise<void>;
}

export function CreateLabelDialog({
  open,
  onOpenChange,
  onCreateLabel,
}: CreateLabelDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[4].value); // Default blue
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Label name is required");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      await onCreateLabel(name.trim(), color);
      setName("");
      setColor(LABEL_COLORS[4].value);
      onOpenChange(false);
    } catch (_err) {
      setError("Failed to create label");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setColor(LABEL_COLORS[4].value);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="label-name" className="text-[11px]">
              Label Name
            </Label>
            <Input
              id="label-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter label name"
              className="h-8 text-[11px]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px]">Color</Label>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-7 text-[11px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="h-7 text-[11px]"
          >
            {isCreating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
