// src/features/settings/components/UserProfile.tsx
import React, { useState, useEffect } from "react";
import { User, Save, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../../contexts/AuthContext";
import { useUpdateUserProfile } from "../../../hooks/settings/useUpdateUserProfile";
import { supabase } from "@/services/base/supabase";

export function UserProfile() {
  const { user } = useAuth();
  const updateProfile = useUpdateUserProfile();

  const [contractLevel, setContractLevel] = useState<string>(
    user?.contractCompLevel?.toString() || "100",
  );
  const [currentUplineEmail, setCurrentUplineEmail] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Load current upline email on mount
  useEffect(() => {
    const loadUplineInfo = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("upline_id")
        .eq("id", user.id)
        .single();

      if (profile?.upline_id) {
        const { data: upline } = await supabase
          .from("user_profiles")
          .select("email, name")
          .eq("id", profile.upline_id)
          .single();

        if (upline?.email) {
          setCurrentUplineEmail(
            upline.name ? `${upline.name} (${upline.email})` : upline.email,
          );
        }
      }
    };

    loadUplineInfo();
  }, [user?.id]);

  const validateContractLevel = (value: string): boolean => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setValidationError("Contract level must be a number");
      return false;
    }
    if (num < 80 || num > 145) {
      setValidationError("Contract level must be between 80 and 145");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleContractLevelChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setContractLevel(value);
    setShowSuccess(false);
    validateContractLevel(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(false);

    if (!validateContractLevel(contractLevel)) {
      return;
    }

    try {
      await updateProfile.mutateAsync({
        contractCompLevel: parseInt(contractLevel, 10),
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update contract level:", error);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-[11px]">
            Loading user information...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* User Information Card */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              Account Information
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">
                Email
              </div>
              <div className="text-[11px] font-medium">{user.email}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">
                Name
              </div>
              <div className="text-[11px] font-medium">
                {user.name || "Not set"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Hierarchy Card (Read-only) */}
      {currentUplineEmail && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Team Hierarchy
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Upline</span>
              <span className="font-medium">{currentUplineEmail}</span>
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 mt-2">
              Contact your upline if you need to transfer to a different team.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Settings Card */}
      <Card>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Commission Settings
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Contract Level</span>
                <span className="text-[10px] text-muted-foreground">
                  (80-145)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="contractLevel"
                  type="number"
                  min="80"
                  max="145"
                  value={contractLevel}
                  onChange={handleContractLevelChange}
                  className={`w-20 px-2 py-1 text-[11px] rounded bg-background border focus:ring-1 focus:ring-primary focus:outline-none font-mono ${
                    validationError ? "border-destructive" : "border-border"
                  }`}
                />
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !!validationError}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updateProfile.isPending ? "Saving..." : "Save"}
                </Button>
                {showSuccess && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
                {updateProfile.isError && (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>

              {validationError && (
                <div className="flex items-center gap-1 text-[10px] text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {validationError}
                </div>
              )}

              <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                Higher contract levels earn higher commission percentages from
                carriers.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
