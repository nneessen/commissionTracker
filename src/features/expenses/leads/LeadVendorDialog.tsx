// src/features/expenses/leads/LeadVendorDialog.tsx

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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type {
  LeadVendor,
  CreateLeadVendorData,
} from "@/types/lead-purchase.types";

interface LeadVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: LeadVendor | null;
  onSave: (data: CreateLeadVendorData) => Promise<void>;
  isLoading?: boolean;
}

export function LeadVendorDialog({
  open,
  onOpenChange,
  vendor,
  onSave,
  isLoading = false,
}: LeadVendorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    notes: "",
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        contactName: vendor.contactName || "",
        contactEmail: vendor.contactEmail || "",
        contactPhone: vendor.contactPhone || "",
        website: vendor.website || "",
        notes: vendor.notes || "",
      });
    } else {
      setFormData({
        name: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        notes: "",
      });
    }
  }, [vendor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: formData.name.trim(),
      contactName: formData.contactName.trim() || null,
      contactEmail: formData.contactEmail.trim() || null,
      contactPhone: formData.contactPhone.trim() || null,
      website: formData.website.trim() || null,
      notes: formData.notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {vendor ? "Edit Vendor" : "Add Lead Vendor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Only required field */}
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Vendor Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="h-8 text-xs"
              placeholder="e.g., LeadGenPro"
              autoFocus
            />
          </div>

          {/* Optional fields - collapsible */}
          <details className="group">
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
              Additional Details (optional)
            </summary>
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Contact Name
                  </Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    className="h-7 text-xs"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Contact Phone
                  </Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="h-7 text-xs"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Contact Email
                </Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  className="h-7 text-xs"
                  placeholder="contact@vendor.com"
                />
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Website
                </Label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="h-7 text-xs"
                  placeholder="https://vendor.com"
                />
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="h-14 text-xs resize-none"
                  placeholder="Any notes..."
                />
              </div>
            </div>
          </details>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {vendor ? "Update" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
