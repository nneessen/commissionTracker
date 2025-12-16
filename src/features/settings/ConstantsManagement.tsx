// src/features/settings/ConstantsManagement.tsx
import React, { useState } from "react";
import {
  useConstants,
  useUpdateConstant,
} from "../../hooks/expenses/useConstants";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Settings,
  DollarSign,
  Save,
} from "lucide-react";

export const ConstantsManagement: React.FC = () => {
  const { data: constants, isLoading } = useConstants();
  const updateConstant = useUpdateConstant();

  const [formData, setFormData] = useState({
    avgAP: constants?.avgAP || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Update form when constants load
  React.useEffect(() => {
    if (constants) {
      setFormData({
        avgAP: constants.avgAP,
      });
    }
  }, [constants]);

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number,
  ) => {
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSuccessMessage("");
  };

  const validateAndSave = async (field: "avgAP") => {
    const value = formData[field];

    // Validation
    if (value < 0) {
      setErrors((prev) => ({ ...prev, [field]: "Value cannot be negative" }));
      return;
    }

    try {
      await updateConstant.mutateAsync({ field, value });
      setSuccessMessage("Saved!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [field]: error instanceof Error ? error.message : "Failed to update",
      }));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-[11px]">
            Loading constants...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase">
            System Constants
          </span>
        </div>

        {/* Average Annual Premium */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium">
              Average Annual Premium Override
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Optional: Override the calculated average annual premium for
            targets. Leave at 0 to use automatic calculations.
          </p>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={formData.avgAP}
              onChange={(e) => handleInputChange("avgAP", e.target.value)}
              min={0}
              step={100}
              className={`w-32 h-7 text-[11px] font-mono ${errors.avgAP ? "border-destructive" : ""}`}
            />
            <Button
              onClick={() => validateAndSave("avgAP")}
              disabled={updateConstant.isPending}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Save className="h-3 w-3 mr-1" />
              {updateConstant.isPending ? "Saving..." : "Save"}
            </Button>
            {successMessage && (
              <div className="flex items-center gap-1 text-[10px] text-success">
                <CheckCircle2 className="h-3 w-3" />
                {successMessage}
              </div>
            )}
          </div>

          {errors.avgAP && (
            <div className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.avgAP}
            </div>
          )}

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
            Set a value only if you want to override automatic calculation.
            Useful for planning around different policy types or expected
            premium changes.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
