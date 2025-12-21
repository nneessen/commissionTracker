// src/features/settings/agency-request/components/RequestAgencyForm.tsx
// Form for agents to request agency status

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import {
  useCreateAgencyRequest,
  useIsAgencyCodeAvailable,
} from "@/hooks/agency-request";

export function RequestAgencyForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const createRequest = useCreateAgencyRequest();

  // Debounced code availability check
  const [debouncedCode, setDebouncedCode] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code.toUpperCase().trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const { data: isCodeAvailable, isLoading: isCheckingCode } = useIsAgencyCodeAvailable(
    debouncedCode,
    debouncedCode.length >= 2
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !code.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isCodeAvailable) {
      toast.error("Please choose a different agency code");
      return;
    }

    try {
      await createRequest.mutateAsync({
        proposed_name: name.trim(),
        proposed_code: code.toUpperCase().trim(),
        proposed_description: description.trim() || undefined,
      });
      toast.success("Agency request submitted successfully");
      // Reset form
      setName("");
      setCode("");
      setDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit request";
      toast.error(message);
    }
  };

  const isSubmitting = createRequest.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agency-name">Agency Name *</Label>
        <Input
          id="agency-name"
          placeholder="e.g., Johnson Insurance Group"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agency-code">Agency Code *</Label>
        <div className="relative">
          <Input
            id="agency-code"
            placeholder="e.g., JIG"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isSubmitting}
            maxLength={20}
            className="uppercase pr-10"
          />
          {debouncedCode.length >= 2 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isCheckingCode ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isCodeAvailable ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        {debouncedCode.length >= 2 && !isCheckingCode && (
          <p className={`text-xs ${isCodeAvailable ? "text-green-600" : "text-red-600"}`}>
            {isCodeAvailable ? "Code is available" : "Code is already in use"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          A unique code to identify your agency (2-20 characters)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agency-description">Description (Optional)</Label>
        <Textarea
          id="agency-description"
          placeholder="Brief description of your agency..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          maxLength={500}
        />
      </div>

      <Alert className="bg-muted/50">
        <AlertDescription className="text-sm">
          Your request will be sent to your direct upline for approval. Once approved,
          your agency will be created and your downline agents will be moved to your new agency.
        </AlertDescription>
      </Alert>

      <Button
        type="submit"
        disabled={isSubmitting || !name.trim() || !code.trim() || !isCodeAvailable}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Request"
        )}
      </Button>
    </form>
  );
}
