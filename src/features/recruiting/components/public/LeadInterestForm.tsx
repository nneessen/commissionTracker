// src/features/recruiting/components/public/LeadInterestForm.tsx
// Public interest form for recruiting funnel

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSubmitLead } from "../../hooks/useLeads";
import {
  US_STATES,
  INCOME_GOAL_OPTIONS,
  type LeadAvailability,
  type LeadInsuranceExperience,
} from "@/types/leads.types";

// Validation schema
const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s\-().+]+$/, "Please enter a valid phone number"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  availability: z.enum(["full_time", "part_time", "exploring"]),
  incomeGoals: z.string().optional(),
  whyInterested: z
    .string()
    .min(
      50,
      "Please tell us more about why you're interested (at least 50 characters)",
    ),
  insuranceExperience: z.enum([
    "none",
    "less_than_1_year",
    "1_to_3_years",
    "3_plus_years",
  ]),
});

// Type kept for documentation purposes
type _LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadInterestFormProps {
  recruiterSlug: string;
  onSuccess: (leadId: string) => void;
}

// Helper to extract error message from Zod error
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
const getErrorMessage = (errors: any[]): string => {
  if (!errors || errors.length === 0) return "";
  return errors
    .map((err) => (typeof err === "string" ? err : err?.message || String(err)))
    .join(", ");
};

export function LeadInterestForm({
  recruiterSlug,
  onSuccess,
}: LeadInterestFormProps) {
  const submitLeadMutation = useSubmitLead();
  const [honeypot, setHoneypot] = useState("");

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      availability: "exploring" as LeadAvailability,
      incomeGoals: "",
      whyInterested: "",
      insuranceExperience: "none" as LeadInsuranceExperience,
    },
    onSubmit: async ({ value }) => {
      // Honeypot check - if filled, it's likely a bot
      if (honeypot) {
        console.warn("Honeypot triggered");
        return;
      }

      // Get UTM params from URL
      const urlParams = new URLSearchParams(window.location.search);

      const result = await submitLeadMutation.mutateAsync({
        recruiterSlug,
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        city: value.city,
        state: value.state,
        availability: value.availability,
        incomeGoals: value.incomeGoals || undefined,
        whyInterested: value.whyInterested,
        insuranceExperience: value.insuranceExperience,
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
        referrerUrl: document.referrer || undefined,
      });

      if (result.success && result.lead_id) {
        onSuccess(result.lead_id);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Honeypot field - hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Name Row */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="firstName"
          validators={{ onChange: leadFormSchema.shape.firstName }}
        >
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-[11px] font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                className="h-8 text-[12px]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-[10px] text-red-500">
                    {getErrorMessage(field.state.meta.errors)}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="lastName"
          validators={{ onChange: leadFormSchema.shape.lastName }}
        >
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-[11px] font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                className="h-8 text-[12px]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-[10px] text-red-500">
                    {getErrorMessage(field.state.meta.errors)}
                  </p>
                )}
            </div>
          )}
        </form.Field>
      </div>

      {/* Email */}
      <form.Field
        name="email"
        validators={{ onChange: leadFormSchema.shape.email }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-medium">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              className="h-8 text-[12px]"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-[10px] text-red-500">
                {getErrorMessage(field.state.meta.errors)}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Phone */}
      <form.Field
        name="phone"
        validators={{ onChange: leadFormSchema.shape.phone }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-[11px] font-medium">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              className="h-8 text-[12px]"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-[10px] text-red-500">
                {getErrorMessage(field.state.meta.errors)}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Location Row */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="city"
          validators={{ onChange: leadFormSchema.shape.city }}
        >
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="city" className="text-[11px] font-medium">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="New York"
                className="h-8 text-[12px]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-[10px] text-red-500">
                    {getErrorMessage(field.state.meta.errors)}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="state"
          validators={{ onChange: leadFormSchema.shape.state }}
        >
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="state" className="text-[11px] font-medium">
                State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {US_STATES.map((state) => (
                    <SelectItem
                      key={state.value}
                      value={state.value}
                      className="text-[12px]"
                    >
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-[10px] text-red-500">
                    {getErrorMessage(field.state.meta.errors)}
                  </p>
                )}
            </div>
          )}
        </form.Field>
      </div>

      {/* Availability */}
      <form.Field
        name="availability"
        validators={{ onChange: leadFormSchema.shape.availability }}
      >
        {(field) => (
          <div className="space-y-2">
            <Label className="text-[11px] font-medium">
              Availability <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={field.state.value}
              onValueChange={(value) =>
                field.handleChange(value as LeadAvailability)
              }
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_time" id="full_time" />
                <Label htmlFor="full_time" className="text-[12px] font-normal">
                  Full-time
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="part_time" id="part_time" />
                <Label htmlFor="part_time" className="text-[12px] font-normal">
                  Part-time
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exploring" id="exploring" />
                <Label htmlFor="exploring" className="text-[12px] font-normal">
                  Just exploring
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </form.Field>

      {/* Income Goals */}
      <form.Field name="incomeGoals">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="incomeGoals" className="text-[11px] font-medium">
              Income Goals (Optional)
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select income goal (optional)" />
              </SelectTrigger>
              <SelectContent>
                {INCOME_GOAL_OPTIONS.filter((opt) => opt.value !== "").map(
                  (option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-[12px]"
                    >
                      {option.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {/* Insurance Experience */}
      <form.Field
        name="insuranceExperience"
        validators={{ onChange: leadFormSchema.shape.insuranceExperience }}
      >
        {(field) => (
          <div className="space-y-2">
            <Label className="text-[11px] font-medium">
              Insurance Experience <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={field.state.value}
              onValueChange={(value) =>
                field.handleChange(value as LeadInsuranceExperience)
              }
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="exp_none" />
                <Label htmlFor="exp_none" className="text-[12px] font-normal">
                  No experience
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="less_than_1_year" id="exp_less_1" />
                <Label htmlFor="exp_less_1" className="text-[12px] font-normal">
                  Less than 1 year
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1_to_3_years" id="exp_1_3" />
                <Label htmlFor="exp_1_3" className="text-[12px] font-normal">
                  1-3 years
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3_plus_years" id="exp_3_plus" />
                <Label htmlFor="exp_3_plus" className="text-[12px] font-normal">
                  3+ years
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </form.Field>

      {/* Why Interested */}
      <form.Field
        name="whyInterested"
        validators={{ onChange: leadFormSchema.shape.whyInterested }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="whyInterested" className="text-[11px] font-medium">
              Why are you interested in a career in insurance?{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="whyInterested"
              placeholder="Tell us a bit about yourself and what draws you to this opportunity..."
              className="min-h-[100px] text-[12px] resize-none"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <div className="flex justify-between items-center">
              {field.state.meta.errors.length > 0 ? (
                <p className="text-[10px] text-red-500">
                  {getErrorMessage(field.state.meta.errors)}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-zinc-400">
                {field.state.value.length}/50 min
              </span>
            </div>
          </div>
        )}
      </form.Field>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-10"
        disabled={submitLeadMutation.isPending}
      >
        {submitLeadMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Submit Your Interest"
        )}
      </Button>

      <p className="text-[10px] text-zinc-400 text-center">
        By submitting, you agree to be contacted about career opportunities.
      </p>
    </form>
  );
}
