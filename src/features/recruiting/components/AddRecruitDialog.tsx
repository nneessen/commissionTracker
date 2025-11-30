// src/features/recruiting/components/AddRecruitDialog.tsx

import React, { useState } from 'react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCreateRecruit } from '../hooks/useRecruitMutations';
import { useInitializeRecruitProgress } from '../hooks/useRecruitProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import { Loader2, UserPlus } from 'lucide-react';
import type { RoleName } from '@/types/permissions.types';

// Default pipeline template ID (from seed migration)
const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

// US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Helper function to auto-prepend https:// to URLs
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

// Helper to extract error message from Zod error
const getErrorMessage = (errors: any[]): string => {
  if (!errors || errors.length === 0) return '';
  return errors.map((err) => (typeof err === 'string' ? err : err?.message || String(err))).join(', ');
};

// Validation schema
const createRecruitSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional().refine((val) => {
    if (!val) return true; // Optional
    const date = new Date(val);
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 18;
  }, 'Must be at least 18 years old'),

  // Address
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),

  // Professional
  resident_state: z.string().optional(),
  license_number: z.string().optional(),
  npn: z.string().optional(),
  license_expiration: z.string().optional(),

  // Social Media
  instagram_username: z.string().optional(),
  instagram_url: z.string().optional(),
  linkedin_username: z.string().optional(),
  linkedin_url: z.string().optional(),
  facebook_handle: z.string().optional(),
  personal_website: z.string().optional(),

  // Assignment
  upline_id: z.string().optional(),

  // Referral
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
  const [activeTab, setActiveTab] = useState('basic');

  // Fetch potential uplines (users with agent, admin, trainer, or upline_manager roles)
  const { data: potentialUplines } = useQuery({
    queryKey: ['potential-uplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, roles')
        .order('first_name', { ascending: true });

      if (error) throw error;

      // Filter users who have agent, admin, trainer, or upline_manager roles
      return (data || []).filter((u: any) => {
        const roles = u.roles as RoleName[];
        return roles && (
          roles.includes('agent' as RoleName) ||
          roles.includes('admin' as RoleName) ||
          roles.includes('trainer' as RoleName) ||
          roles.includes('upline_manager' as RoleName)
        );
      });
    },
    enabled: open, // Only fetch when dialog is open
  });

  const form = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      street_address: '',
      city: '',
      state: '',
      zip: '',
      resident_state: '',
      license_number: '',
      npn: '',
      license_expiration: '',
      instagram_username: '',
      instagram_url: '',
      linkedin_username: '',
      linkedin_url: '',
      facebook_handle: '',
      personal_website: '',
      upline_id: '',
      referral_source: '',
    },
    onSubmit: async ({ value }) => {
      if (!user?.id) return;

      // Check for duplicate email
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', value.email)
        .maybeSingle();

      if (existingUser) {
        alert(`A user with email ${value.email} already exists.`);
        return;
      }

      // Normalize URL fields (auto-prepend https://)
      const normalizedWebsite = value.personal_website ? normalizeUrl(value.personal_website) : undefined;

      const recruit = await createRecruitMutation.mutateAsync({
        first_name: value.first_name,
        last_name: value.last_name,
        email: value.email,
        phone: value.phone || undefined,
        date_of_birth: value.date_of_birth || undefined,
        street_address: value.street_address || undefined,
        city: value.city || undefined,
        state: value.state || undefined,
        zip: value.zip || undefined,
        resident_state: value.resident_state || undefined,
        license_number: value.license_number || undefined,
        npn: value.npn || undefined,
        license_expiration: value.license_expiration || undefined,
        instagram_username: value.instagram_username || undefined,
        instagram_url: value.instagram_url || undefined,
        linkedin_username: value.linkedin_username || undefined,
        linkedin_url: value.linkedin_url || undefined,
        facebook_handle: value.facebook_handle || undefined,
        personal_website: normalizedWebsite,
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
        setActiveTab('basic'); // Reset to first tab
        onSuccess?.(recruit.id);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <UserPlus className="h-4 w-4" />
            Add New Recruit
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Enter recruit details to begin onboarding. Only basic info required initially.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-7">
              <TabsTrigger value="basic" className="text-[10px] px-1">Basic</TabsTrigger>
              <TabsTrigger value="address" className="text-[10px] px-1">Address</TabsTrigger>
              <TabsTrigger value="professional" className="text-[10px] px-1">Professional</TabsTrigger>
              <TabsTrigger value="assignment" className="text-[10px] px-1">Assignment</TabsTrigger>
              <TabsTrigger value="social" className="text-[10px] px-1">Social/Referral</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-2 py-2">
              <div className="grid grid-cols-2 gap-2">
                <form.Field
                  name="first_name"
                  validators={{
                    onChange: createRecruitSchema.shape.first_name,
                  }}
                >
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="first_name" className="text-[11px] font-semibold">
                        First Name *
                      </Label>
                      <Input id="first_name" className="h-7 text-[11px]"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        autoFocus
                        required
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-[10px] text-destructive">
                          {getErrorMessage(field.state.meta.errors)}
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
                    <div className="grid gap-1">
                      <Label htmlFor="last_name" className="text-[11px] font-semibold">
                        Last Name *
                      </Label>
                      <Input id="last_name" className="h-7 text-[11px]"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        required
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-[10px] text-destructive">
                          {getErrorMessage(field.state.meta.errors)}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <form.Field
                  name="email"
                  validators={{
                    onChange: createRecruitSchema.shape.email,
                  }}
                >
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="email" className="text-[11px] font-semibold">
                        Email *
                      </Label>
                      <Input id="email" type="email" className="h-7 text-[11px]"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        required
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-[10px] text-destructive">
                          {getErrorMessage(field.state.meta.errors)}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="phone">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="phone" className="text-[11px]">Phone</Label>
                      <Input id="phone" type="tel" className="h-7 text-[11px]"
                        placeholder="(555) 555-5555"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field
                name="date_of_birth"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined; // Optional field
                    const date = new Date(value);
                    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    return age < 18 ? 'Must be at least 18 years old' : undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="date_of_birth" className="text-[11px]">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" className="h-7 text-[11px]"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-[10px] text-destructive">
                        {getErrorMessage(field.state.meta.errors)}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-2 py-2">
              <form.Field name="street_address">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="street_address" className="text-[11px]">Street Address</Label>
                    <Input id="street_address" className="h-7 text-[11px]"
                      placeholder="123 Main St"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-3 gap-2">
                <form.Field name="city">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="city" className="text-[11px]">City</Label>
                      <Input id="city" className="h-7 text-[11px]"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="state">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="state" className="text-[11px]">State</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value)}
                      >
                        <SelectTrigger id="state" className="h-7 text-[11px]">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="zip">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="zip" className="text-[11px]">ZIP Code</Label>
                      <Input id="zip" className="h-7 text-[11px]"
                        placeholder="12345"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </TabsContent>

            {/* Professional Tab */}
            <TabsContent value="professional" className="space-y-2 py-2">
              <form.Field name="resident_state">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="resident_state" className="text-[11px]">Resident State (Primary Licensed State)</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger id="resident_state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-2">
                <form.Field name="license_number">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="license_number" className="text-[11px]">License Number</Label>
                      <Input className="h-7 text-[11px]"
                        id="license_number"
                        placeholder="If already licensed"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="npn">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="npn" className="text-[11px]">NPN (National Producer Number)</Label>
                      <Input className="h-7 text-[11px]"
                        id="npn"
                        placeholder="If has NPN"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="license_expiration">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="license_expiration" className="text-[11px]">License Expiration Date</Label>
                    <Input className="h-7 text-[11px]"
                      id="license_expiration"
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </TabsContent>

            {/* Assignment Tab */}
            <TabsContent value="assignment" className="space-y-2 py-2">
              <form.Field name="upline_id">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="upline_id" className="text-[11px]">Assign Upline/Trainer</Label>
                    <Select
                      value={field.state.value || undefined}
                      onValueChange={(value) => field.handleChange(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger id="upline_id">
                        <SelectValue placeholder="Select upline (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {potentialUplines?.map((upline: any) => (
                          <SelectItem key={upline.id} value={upline.id}>
                            {upline.first_name} {upline.last_name} ({upline.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Upline/trainer who will manage this recruit's onboarding. Leave blank to assign later.
                    </p>
                  </div>
                )}
              </form.Field>
            </TabsContent>

            {/* Social/Referral Tab */}
            <TabsContent value="social" className="space-y-2 py-2">
              <div className="grid grid-cols-2 gap-2">
                <form.Field name="instagram_username">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="instagram_username" className="text-[11px]">Instagram Username</Label>
                      <Input className="h-7 text-[11px]"
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
                    <div className="grid gap-1">
                      <Label htmlFor="linkedin_username" className="text-[11px]">LinkedIn Username</Label>
                      <Input className="h-7 text-[11px]"
                        id="linkedin_username"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <form.Field name="facebook_handle">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="facebook_handle" className="text-[11px]">Facebook Handle</Label>
                      <Input className="h-7 text-[11px]"
                        id="facebook_handle"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="personal_website"
                >
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="personal_website" className="text-[11px]">Personal Website</Label>
                      <Input className="h-7 text-[11px]"
                        id="personal_website"
                        type="text"
                        placeholder="example.com (https:// added automatically)"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="referral_source">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="referral_source" className="text-[11px]">Referral Source</Label>
                    <Textarea
                      id="referral_source"
                      placeholder="How did they find us?"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={3}
                    />
                  </div>
                )}
              </form.Field>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-3 gap-1">
            <Button type="button" variant="outline" className="h-6 text-[10px]"
              onClick={() => {
                onOpenChange(false);
                setActiveTab('basic');
              }}
              disabled={createRecruitMutation.isPending || initializeProgressMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-6 text-[10px]" disabled={createRecruitMutation.isPending || initializeProgressMutation.isPending}>
              {(createRecruitMutation.isPending || initializeProgressMutation.isPending) && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              {!(createRecruitMutation.isPending || initializeProgressMutation.isPending) && (
                <UserPlus className="mr-1 h-3 w-3" />
              )}
              Add Recruit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
