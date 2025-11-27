// src/features/recruiting/components/AddRecruitDialog.tsx

import React from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRecruit } from '../hooks/useRecruitMutations';
import { useInitializeRecruitProgress } from '../hooks/useRecruitProgress';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus } from 'lucide-react';

// Default pipeline template ID (from seed migration)
const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

const createRecruitSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  instagram_username: z.string().optional(),
  instagram_url: z.string().optional(),
  linkedin_username: z.string().optional(),
  linkedin_url: z.string().optional(),
  upline_id: z.string().optional(),
  referral_source: z.string().optional(),
});

interface AddRecruitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (recruitId: string) => void;
}

export function AddRecruitDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddRecruitDialogProps) {
  const { user } = useAuth();
  const createRecruitMutation = useCreateRecruit();
  const initializeProgressMutation = useInitializeRecruitProgress();

  const form = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      instagram_username: '',
      instagram_url: '',
      linkedin_username: '',
      linkedin_url: '',
      upline_id: '',
      referral_source: '',
    },
    onSubmit: async ({ value }) => {
      if (!user?.id) return;

      const recruit = await createRecruitMutation.mutateAsync({
        first_name: value.first_name,
        last_name: value.last_name,
        email: value.email,
        phone: value.phone || undefined,
        instagram_username: value.instagram_username || undefined,
        instagram_url: value.instagram_url || undefined,
        linkedin_username: value.linkedin_username || undefined,
        linkedin_url: value.linkedin_url || undefined,
        recruiter_id: user.id,
        upline_id: value.upline_id || undefined,
        referral_source: value.referral_source || undefined,
      });

      if (recruit) {
        // Initialize phase progress for the new recruit
        try {
          await initializeProgressMutation.mutateAsync({
            userId: recruit.id,
            templateId: DEFAULT_TEMPLATE_ID,
          });
        } catch (error) {
          console.error('Failed to initialize recruit progress:', error);
          // Don't block the success flow - the recruit was created
        }

        onOpenChange(false);
        form.reset();
        onSuccess?.(recruit.id);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Recruit
          </DialogTitle>
          <DialogDescription>
            Enter recruit details to begin the onboarding process
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="first_name"
                validators={{
                  onChange: createRecruitSchema.shape.first_name,
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="first_name" className="font-semibold">
                      First Name *
                    </Label>
                    <Input
                      id="first_name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      autoFocus
                      required
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="last_name"
                validators={{
                  onChange: createRecruitSchema.shape.last_name,
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="last_name" className="font-semibold">
                      Last Name *
                    </Label>
                    <Input
                      id="last_name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="font-semibold">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Social Media */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="instagram_username">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="instagram_username">Instagram Username</Label>
                    <Input
                      id="instagram_username"
                      placeholder="@username"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="linkedin_username">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="linkedin_username">LinkedIn Username</Label>
                    <Input
                      id="linkedin_username"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Recruiting Details */}
            <form.Field name="referral_source">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="referral_source">Referral Source</Label>
                  <Input
                    id="referral_source"
                    placeholder="How did they find us?"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createRecruitMutation.isPending || initializeProgressMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRecruitMutation.isPending || initializeProgressMutation.isPending}>
              {(createRecruitMutation.isPending || initializeProgressMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {!(createRecruitMutation.isPending || initializeProgressMutation.isPending) && (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add Recruit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
