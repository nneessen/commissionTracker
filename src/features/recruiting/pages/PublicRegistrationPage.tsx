// src/features/recruiting/pages/PublicRegistrationPage.tsx
// Public registration page for recruit self-service - accessed via invite token

import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  LinkIcon,
} from "lucide-react";
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
import {
  useInvitationByToken,
  useSubmitRegistration,
} from "../hooks/useRecruitInvitations";
import type { RegistrationFormData } from "@/types/recruiting.types";

// US States for dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

// Referral source options
const REFERRAL_SOURCES = [
  "Friend or family member",
  "Current agent",
  "Social media",
  "Online search",
  "Job board",
  "Career fair",
  "Other",
];

// Form validation schema
const registrationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  instagram_username: z.string().optional(),
  linkedin_username: z.string().optional(),
  facebook_handle: z.string().optional(),
  personal_website: z.string().optional(),
  referral_source: z.string().optional(),
});

type FormData = z.infer<typeof registrationSchema>;

export function PublicRegistrationPage() {
  const params = useParams({ strict: false }) as { token?: string };
  const token = params.token;

  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const submitRegistration = useSubmitRegistration();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      first_name: invitation?.prefilled?.first_name || "",
      last_name: invitation?.prefilled?.last_name || "",
      phone: invitation?.prefilled?.phone || "",
      city: invitation?.prefilled?.city || "",
      state: invitation?.prefilled?.state || "",
    },
  });

  // Update form when prefilled data loads
  if (invitation?.valid && invitation.prefilled) {
    const prefilled = invitation.prefilled;
    if (prefilled.first_name && !watch("first_name")) {
      setValue("first_name", prefilled.first_name);
    }
    if (prefilled.last_name && !watch("last_name")) {
      setValue("last_name", prefilled.last_name);
    }
    if (prefilled.phone && !watch("phone")) {
      setValue("phone", prefilled.phone);
    }
    if (prefilled.city && !watch("city")) {
      setValue("city", prefilled.city);
    }
    if (prefilled.state && !watch("state")) {
      setValue("state", prefilled.state);
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!token) return;

    const result = await submitRegistration.mutateAsync({
      token,
      formData: data as RegistrationFormData,
    });

    if (result.success) {
      setIsSubmitted(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Verifying your invitation...
          </p>
        </div>
      </div>
    );
  }

  // Error states
  if (error || !invitation?.valid) {
    const errorType = invitation?.error || "invitation_not_found";
    const errorMessage =
      invitation?.message || "This invitation link is invalid or has expired.";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            {errorType === "invitation_expired"
              ? "Invitation Expired"
              : errorType === "invitation_completed"
                ? "Already Registered"
                : errorType === "invitation_cancelled"
                  ? "Invitation Cancelled"
                  : "Link Not Found"}
          </h1>
          <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>

          {invitation?.inviter && (
            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Contact your recruiter:
              </p>
              <p className="text-sm font-medium text-slate-900">
                {invitation.inviter.name}
              </p>
              <a
                href={`mailto:${invitation.inviter.email}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {invitation.inviter.email}
              </a>
              {invitation.inviter.phone && (
                <p className="text-sm text-slate-600">
                  {invitation.inviter.phone}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Registration Complete!
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Thank you for completing your registration. Your recruiter will be
            in touch with next steps.
          </p>

          {invitation.inviter && (
            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Your recruiter:
              </p>
              <p className="text-sm font-medium text-slate-900">
                {invitation.inviter.name}
              </p>
              <a
                href={`mailto:${invitation.inviter.email}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {invitation.inviter.email}
              </a>
              {invitation.inviter.phone && (
                <p className="text-sm text-slate-600">
                  {invitation.inviter.phone}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Complete Your Registration
          </h1>
          <p className="text-sm text-slate-600">
            {invitation.inviter?.name} has invited you to join The Standard.
            Please fill out your information below.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Personal Information */}
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-xs">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    {...register("first_name")}
                    className="mt-1"
                    placeholder="John"
                  />
                  {errors.first_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name" className="text-xs">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    {...register("last_name")}
                    className="mt-1"
                    placeholder="Doe"
                  />
                  {errors.last_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={invitation.email || ""}
                    disabled
                    className="mt-1 bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    className="mt-1"
                    placeholder="(555) 123-4567"
                    type="tel"
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_birth" className="text-xs">
                    Date of Birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    {...register("date_of_birth")}
                    className="mt-1"
                    type="date"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                Address
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="street_address" className="text-xs">
                    Street Address
                  </Label>
                  <Input
                    id="street_address"
                    {...register("street_address")}
                    className="mt-1"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="city" className="text-xs">
                      City
                    </Label>
                    <Input
                      id="city"
                      {...register("city")}
                      className="mt-1"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-xs">
                      State
                    </Label>
                    <Select
                      value={watch("state") || ""}
                      onValueChange={(value) => setValue("state", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="State" />
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

                  <div>
                    <Label htmlFor="zip" className="text-xs">
                      ZIP Code
                    </Label>
                    <Input
                      id="zip"
                      {...register("zip")}
                      className="mt-1"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-slate-400" />
                Social Media (Optional)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagram_username" className="text-xs">
                    Instagram Username
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      @
                    </span>
                    <Input
                      id="instagram_username"
                      {...register("instagram_username")}
                      className="pl-7"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="linkedin_username" className="text-xs">
                    LinkedIn Username
                  </Label>
                  <Input
                    id="linkedin_username"
                    {...register("linkedin_username")}
                    className="mt-1"
                    placeholder="john-doe"
                  />
                </div>

                <div>
                  <Label htmlFor="facebook_handle" className="text-xs">
                    Facebook
                  </Label>
                  <Input
                    id="facebook_handle"
                    {...register("facebook_handle")}
                    className="mt-1"
                    placeholder="username or profile URL"
                  />
                </div>

                <div>
                  <Label htmlFor="personal_website" className="text-xs">
                    Personal Website
                  </Label>
                  <Input
                    id="personal_website"
                    {...register("personal_website")}
                    className="mt-1"
                    placeholder="https://yoursite.com"
                  />
                </div>
              </div>
            </div>

            {/* Referral Source */}
            <div className="p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                How did you hear about us?
              </h2>

              <Select
                value={watch("referral_source") || ""}
                onValueChange={(value) => setValue("referral_source", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting || submitRegistration.isPending}
            >
              {isSubmitting || submitRegistration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </div>

          {/* Inviter Info Footer */}
          {invitation.inviter && (
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Questions? Contact {invitation.inviter.name} at{" "}
                <a
                  href={`mailto:${invitation.inviter.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {invitation.inviter.email}
                </a>
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} The Standard HQ. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicRegistrationPage;
