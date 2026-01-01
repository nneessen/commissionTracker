// src/features/recruiting/components/SendInviteDialog.tsx
// Dialog for sending self-registration invites to recruits

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useCreateRecruitWithInvitation } from "../hooks/useRecruitInvitations";

// Form validation schema
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  message: z
    .string()
    .max(500, "Message must be 500 characters or less")
    .optional(),
  upline_id: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface SendInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, send invite to existing recruit instead of creating new one */
  _existingRecruitId?: string;
  existingEmail?: string;
  existingName?: string;
  onSuccess?: () => void;
}

export function SendInviteDialog({
  open,
  onOpenChange,
  _existingRecruitId,
  existingEmail,
  existingName,
  onSuccess,
}: SendInviteDialogProps) {
  const { user } = useAuth();
  const createWithInvite = useCreateRecruitWithInvitation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch potential uplines (agents/admins/trainers who can be assigned as upline)
  const { data: potentialUplines = [] } = useQuery({
    queryKey: ["potential-uplines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .or("roles.cs.{agent},roles.cs.{admin},roles.cs.{trainer}")
        .eq("approval_status", "approved")
        .order("first_name");

      if (error) {
        console.error("Error fetching uplines:", error);
        return [];
      }
      return data || [];
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: existingEmail || "",
      first_name: existingName?.split(" ")[0] || "",
      last_name: existingName?.split(" ").slice(1).join(" ") || "",
      message: "",
      upline_id: user?.id || "",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      await createWithInvite.mutateAsync({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        message: data.message,
        upline_id: data.upline_id || user?.id,
        sendEmail: true,
      });

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error sending invite:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Registration Invite
          </DialogTitle>
          <DialogDescription>
            Send an email invitation for the recruit to fill out their own
            registration information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="recruit@example.com"
              {...register("email")}
              disabled={!!existingEmail}
              className={existingEmail ? "bg-muted" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Name (optional, for prefill) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="John"
                {...register("first_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                {...register("last_name")}
              />
            </div>
          </div>

          {/* Upline Assignment */}
          <div className="space-y-2">
            <Label htmlFor="upline_id">Assign Upline</Label>
            <Select
              value={watch("upline_id") || ""}
              onValueChange={(value) => setValue("upline_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select upline (defaults to you)" />
              </SelectTrigger>
              <SelectContent>
                {potentialUplines.map((upline) => (
                  <SelectItem key={upline.id} value={upline.id}>
                    {upline.first_name} {upline.last_name}
                    {upline.id === user?.id && " (You)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The recruit will be assigned to this person as their upline.
            </p>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note to include in the invitation email..."
              rows={3}
              {...register("message")}
              className="resize-none"
            />
            {errors.message && (
              <p className="text-xs text-red-500">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {watch("message")?.length || 0}/500 characters
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SendInviteDialog;
