// src/features/recruiting/pages/PublicRegistrationPage.tsx
// Public registration page for recruit self-service - accessed via invite token
// Redesigned with split-panel layout to match Login/PublicJoinPage

import { useState, useEffect } from "react";
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
  Shield,
  FileText,
  TrendingUp,
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
import { useSubmitRegistration } from "../hooks/useRecruitInvitations";
import { supabase } from "@/services/base/supabase";
import type {
  RegistrationFormData,
  InvitationValidationResult,
} from "@/types/recruiting.types";

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

  // Direct state management - bypassing hooks for public page reliability
  const [invitation, setInvitation] =
    useState<InvitationValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch invitation directly on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setInvitation({
        valid: false,
        error: "invitation_not_found",
        message: "No invitation token provided.",
      });
      return;
    }

    // Simple fetch without cleanup guards
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_public_invitation_by_token",
          { p_token: token },
        );

        if (rpcError) {
          setInvitation({
            valid: false,
            error: "invitation_not_found",
            message: rpcError.message || "Failed to validate invitation.",
          });
        } else {
          setInvitation(data as InvitationValidationResult);
        }
      } catch {
        setInvitation({
          valid: false,
          error: "invitation_not_found",
          message: "An error occurred.",
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  console.log("[PublicRegistrationPage] State:", {
    isLoading,
    invitation: invitation ? "present" : "null",
  });

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
      first_name: "",
      last_name: "",
      phone: "",
      city: "",
      state: "",
    },
  });

  // Update form when prefilled data loads
  useEffect(() => {
    if (invitation?.valid && invitation.prefilled) {
      const prefilled = invitation.prefilled;
      if (prefilled.first_name) setValue("first_name", prefilled.first_name);
      if (prefilled.last_name) setValue("last_name", prefilled.last_name);
      if (prefilled.phone) setValue("phone", prefilled.phone);
      if (prefilled.city) setValue("city", prefilled.city);
      if (prefilled.state) setValue("state", prefilled.state);
    }
  }, [invitation, setValue]);

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

  // Left Panel Component (reused for loading/error/success states)
  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[50%] bg-foreground relative overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Animated glow orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 w-full h-full">
        {/* Logo */}
        <div className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-xl group-hover:bg-amber-500/30 transition-all duration-500" />
            <img
              src="/logos/Light Letter Logo .png"
              alt="The Standard"
              className="relative h-14 w-14 drop-shadow-2xl dark:hidden"
            />
            <img
              src="/logos/LetterLogo.png"
              alt="The Standard"
              className="relative h-14 w-14 drop-shadow-2xl hidden dark:block"
            />
          </div>
          <div className="flex flex-col">
            <span
              className="text-white dark:text-black text-2xl font-bold tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THE STANDARD
            </span>
            <span className="text-amber-400 text-[10px] uppercase tracking-[0.3em] font-medium">
              Financial Group
            </span>
          </div>
        </div>

        {/* Main messaging */}
        <div className="space-y-4">
          <div>
            <h1
              className="text-4xl xl:text-5xl font-bold leading-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span className="text-white dark:text-black">Welcome to</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-clip-text text-transparent">
                The Team
              </span>
            </h1>
            <p className="text-white/80 dark:text-black/70 text-sm max-w-md leading-relaxed">
              Complete your registration to get started with your insurance
              career. We&apos;re excited to have you join our growing team.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid gap-2 max-w-md">
            <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs">
                Comprehensive training & mentorship
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs">
                Industry-leading commission structure
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs">Full support from day one</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-white/50 dark:text-black/50 text-xs">
          &copy; {new Date().getFullYear()} The Standard Financial Group
        </div>
      </div>
    </div>
  );

  // Mobile Logo Component
  const MobileLogo = () => (
    <div className="lg:hidden flex flex-col items-center mb-6">
      <div className="flex items-center gap-3">
        <img
          src="/logos/LetterLogo.png"
          alt="The Standard"
          className="h-10 w-10 dark:hidden"
        />
        <img
          src="/logos/Light Letter Logo .png"
          alt="The Standard"
          className="h-10 w-10 hidden dark:block"
        />
        <div className="flex flex-col">
          <span
            className="text-foreground text-xl font-bold tracking-wide"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            THE STANDARD
          </span>
          <span className="text-amber-500 text-[9px] uppercase tracking-[0.25em] font-medium">
            Financial Group
          </span>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              Verifying your invitation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (!invitation?.valid) {
    const errorType = invitation?.error || "invitation_not_found";
    const errorMessage =
      invitation?.message || "This invitation link is invalid or has expired.";

    return (
      <div className="min-h-screen flex bg-background">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <MobileLogo />
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl p-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                {errorType === "invitation_expired"
                  ? "Invitation Expired"
                  : errorType === "invitation_completed"
                    ? "Already Registered"
                    : errorType === "invitation_cancelled"
                      ? "Invitation Cancelled"
                      : "Link Not Found"}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {errorMessage}
              </p>

              {invitation?.inviter && (
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Contact your recruiter:
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {invitation.inviter.name}
                  </p>
                  <a
                    href={`mailto:${invitation.inviter.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {invitation.inviter.email}
                  </a>
                  {invitation.inviter.phone && (
                    <p className="text-sm text-muted-foreground">
                      {invitation.inviter.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex bg-background">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <MobileLogo />
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl p-6 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Registration Complete!
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Thank you for completing your registration. Your recruiter will
                be in touch with next steps.
              </p>

              {invitation.inviter && (
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Your recruiter:
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {invitation.inviter.name}
                  </p>
                  <a
                    href={`mailto:${invitation.inviter.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {invitation.inviter.email}
                  </a>
                  {invitation.inviter.phone && (
                    <p className="text-sm text-muted-foreground">
                      {invitation.inviter.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex bg-background">
      <LeftPanel />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 pt-8 lg:p-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          <MobileLogo />

          {/* Header */}
          <div className="mb-3 text-center lg:text-left">
            <h2
              className="text-lg font-bold text-foreground mb-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Complete Your Registration
            </h2>
            <p className="text-xs text-muted-foreground">
              {invitation.inviter?.name} has invited you to join The Standard.
            </p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl overflow-hidden">
              {/* Personal Information */}
              <div className="p-4 border-b border-border/50">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="first_name" className="text-[10px]">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      {...register("first_name")}
                      className="mt-1 h-8 text-xs"
                      placeholder="John"
                    />
                    {errors.first_name && (
                      <p className="text-[10px] text-destructive mt-0.5">
                        {errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="last_name" className="text-[10px]">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      {...register("last_name")}
                      className="mt-1 h-8 text-xs"
                      placeholder="Doe"
                    />
                    {errors.last_name && (
                      <p className="text-[10px] text-destructive mt-0.5">
                        {errors.last_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-[10px]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={invitation.email || ""}
                      disabled
                      className="mt-1 h-8 text-xs bg-muted/50"
                    />
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-[10px]">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      className="mt-1 h-8 text-xs"
                      placeholder="(555) 123-4567"
                      type="tel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date_of_birth" className="text-[10px]">
                      Date of Birth
                    </Label>
                    <Input
                      id="date_of_birth"
                      {...register("date_of_birth")}
                      className="mt-1 h-8 text-xs"
                      type="date"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="p-4 border-b border-border/50">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Address
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="street_address" className="text-[10px]">
                      Street Address
                    </Label>
                    <Input
                      id="street_address"
                      {...register("street_address")}
                      className="mt-1 h-8 text-xs"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="city" className="text-[10px]">
                        City
                      </Label>
                      <Input
                        id="city"
                        {...register("city")}
                        className="mt-1 h-8 text-xs"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-[10px]">
                        State
                      </Label>
                      <Select
                        value={watch("state") || ""}
                        onValueChange={(value) => setValue("state", value)}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
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
                      <Label htmlFor="zip" className="text-[10px]">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        {...register("zip")}
                        className="mt-1 h-8 text-xs"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="p-4 border-b border-border/50">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Social Media (Optional)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="instagram_username" className="text-[10px]">
                      Instagram Username
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        @
                      </span>
                      <Input
                        id="instagram_username"
                        {...register("instagram_username")}
                        className="h-8 text-xs pl-6"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="linkedin_username" className="text-[10px]">
                      LinkedIn Username
                    </Label>
                    <Input
                      id="linkedin_username"
                      {...register("linkedin_username")}
                      className="mt-1 h-8 text-xs"
                      placeholder="john-doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="facebook_handle" className="text-[10px]">
                      Facebook
                    </Label>
                    <Input
                      id="facebook_handle"
                      {...register("facebook_handle")}
                      className="mt-1 h-8 text-xs"
                      placeholder="username or profile URL"
                    />
                  </div>

                  <div>
                    <Label htmlFor="personal_website" className="text-[10px]">
                      Personal Website
                    </Label>
                    <Input
                      id="personal_website"
                      {...register("personal_website")}
                      className="mt-1 h-8 text-xs"
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
              </div>

              {/* Referral Source */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  How did you hear about us?
                </h3>

                <Select
                  value={watch("referral_source") || ""}
                  onValueChange={(value) => setValue("referral_source", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
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
            <div className="mt-4">
              <Button
                type="submit"
                className="w-full h-9 text-sm"
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
          </form>

          {/* Footer */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Questions? Contact {invitation.inviter?.name} at{" "}
            <a
              href={`mailto:${invitation.inviter?.email}`}
              className="text-primary hover:underline"
            >
              {invitation.inviter?.email}
            </a>
          </p>

          {/* Mobile footer */}
          <p className="lg:hidden mt-4 text-center text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} The Standard Financial Group
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicRegistrationPage;
