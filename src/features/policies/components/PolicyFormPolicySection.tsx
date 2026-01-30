// src/features/policies/components/PolicyFormPolicySection.tsx

import React from "react";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewPolicyForm, PolicyStatus, PaymentFrequency } from "../../../types/policy.types";

interface PolicyFormPolicySectionProps {
  formData: NewPolicyForm;
  displayErrors: Record<string, string>;
  policyId?: string;
  annualPremium: number;
  expectedCommission: number;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const PolicyFormPolicySection: React.FC<PolicyFormPolicySectionProps> = ({
  formData,
  displayErrors,
  policyId,
  annualPremium,
  expectedCommission,
  onInputChange,
  onSelectChange,
}) => {
  return (
    <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Policy Details
        </span>
      </div>

      <div className="space-y-3">
        {/* Policy Number */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="policyNumber"
            className="text-[11px] text-muted-foreground"
          >
            Policy Number
          </Label>
          <Input
            id="policyNumber"
            type="text"
            name="policyNumber"
            value={formData.policyNumber}
            onChange={onInputChange}
            className={`h-8 text-[11px] ${displayErrors.policyNumber ? "border-destructive" : "border-input"}`}
            placeholder="POL-123456"
          />
          <span className="text-[10px] text-muted-foreground">
            Optional - leave blank if not yet assigned
          </span>
          {displayErrors.policyNumber && (
            <span className="text-[10px] text-destructive">
              {displayErrors.policyNumber}
            </span>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="submitDate"
              className="text-[11px] text-muted-foreground"
            >
              Submit Date *
            </Label>
            <Input
              id="submitDate"
              type="date"
              name="submitDate"
              value={formData.submitDate}
              onChange={onInputChange}
              className={`h-8 text-[11px] ${displayErrors.submitDate ? "border-destructive" : "border-input"}`}
            />
            {displayErrors.submitDate && (
              <span className="text-[10px] text-destructive">
                {displayErrors.submitDate}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="effectiveDate"
              className="text-[11px] text-muted-foreground"
            >
              Effective Date *
            </Label>
            <Input
              id="effectiveDate"
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={onInputChange}
              className={`h-8 text-[11px] ${displayErrors.effectiveDate ? "border-destructive" : "border-input"}`}
            />
            {displayErrors.effectiveDate && (
              <span className="text-[10px] text-destructive">
                {displayErrors.effectiveDate}
              </span>
            )}
          </div>
        </div>

        {/* Premium and Frequency */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="premium"
              className="text-[11px] text-muted-foreground"
            >
              Premium Amount *
            </Label>
            <Input
              id="premium"
              type="number"
              name="premium"
              value={formData.premium || ""}
              onChange={onInputChange}
              className={`h-8 text-[11px] ${displayErrors.premium ? "border-destructive" : "border-input"}`}
              placeholder="250.00"
              step="0.01"
              min="0"
            />
            {displayErrors.premium && (
              <span className="text-[10px] text-destructive">
                {displayErrors.premium}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="paymentFrequency"
              className="text-[11px] text-muted-foreground"
            >
              Payment Frequency *
            </Label>
            <Select
              value={formData.paymentFrequency}
              onValueChange={(value) =>
                onSelectChange("paymentFrequency", value as PaymentFrequency)
              }
            >
              <SelectTrigger
                id="paymentFrequency"
                className="h-8 text-[11px] border-input"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="status" className="text-[11px] text-muted-foreground">
            Status
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              onSelectChange("status", value as PolicyStatus)
            }
          >
            <SelectTrigger id="status" className="h-8 text-[11px] border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              {policyId && (
                <>
                  <SelectItem value="lapsed">Lapsed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Calculated Values Summary */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-zinc-100 dark:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-600">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Annual Premium:</span>
            <strong className="text-[hsl(var(--info))] font-semibold font-mono">
              ${annualPremium.toFixed(2)}
            </strong>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Commission Rate:</span>
            <strong className="text-foreground font-semibold">
              {formData.commissionPercentage.toFixed(2)}%
            </strong>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">
              Expected Advance (9 mo):
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              ${expectedCommission.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
