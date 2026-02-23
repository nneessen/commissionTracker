// src/features/contracting/components/BulkStatusChangeDialog.tsx
// Dialog for bulk status changes

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const STATUS_OPTIONS = [
  { value: "requested", label: "Requested" },
  { value: "in_progress", label: "In Progress" },
  { value: "writing_received", label: "Writing Received" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

interface BulkStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (newStatus: string) => Promise<void>;
}

export function BulkStatusChangeDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkStatusChangeDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState("in_progress");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedStatus);
      onOpenChange(false);
    } catch (_error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Change Status for {selectedCount} Contracts
          </AlertDialogTitle>
          <AlertDialogDescription>
            Select the new status to apply to all selected contract requests.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={selectedStatus}
          onValueChange={setSelectedStatus}
          className="space-y-2 py-4"
        >
          {STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem
                value={option.value}
                id={`status-${option.value}`}
              />
              <Label
                htmlFor={`status-${option.value}`}
                className="cursor-pointer text-sm"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
