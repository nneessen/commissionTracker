// src/features/underwriting/components/UnderwritingWizard.tsx

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUnderwritingAnalysis,
  useSaveUnderwritingSession,
  useDecisionEngineRecommendations,
  transformWizardToDecisionEngineInput,
} from "../hooks";
import { calculateBMI } from "../utils/bmiCalculator";
import type {
  WizardFormData,
  WizardStep,
  ClientInfo,
  HealthInfo,
  CoverageRequest,
  AIAnalysisResult,
  AIAnalysisRequest,
  SessionSaveData,
} from "../types/underwriting.types";
import { WIZARD_STEPS } from "../types/underwriting.types";

// Step components (will be implemented)
import ClientInfoStep from "./WizardSteps/ClientInfoStep";
import HealthConditionsStep from "./WizardSteps/HealthConditionsStep";
import CoverageRequestStep from "./WizardSteps/CoverageRequestStep";
import ReviewStep from "./WizardSteps/ReviewStep";
import RecommendationsStep from "./WizardSteps/RecommendationsStep";

interface UnderwritingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialClientInfo: ClientInfo = {
  name: "",
  dob: null,
  age: 0,
  gender: "",
  state: "",
  heightFeet: 5,
  heightInches: 6,
  weight: 150,
};

const initialHealthInfo: HealthInfo = {
  conditions: [],
  tobacco: {
    currentUse: false,
  },
  medications: {
    bpMedCount: 0,
    cholesterolMedCount: 0,
    insulinUse: false,
    bloodThinners: false,
    antidepressants: false,
    painMedications: "none",
  },
};

const initialCoverageRequest: CoverageRequest = {
  faceAmount: 250000,
  productTypes: ["term_life"],
};

export default function UnderwritingWizard({
  open,
  onOpenChange,
}: UnderwritingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    client: initialClientInfo,
    health: initialHealthInfo,
    coverage: initialCoverageRequest,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(
    null,
  );
  const [sessionStartTime] = useState<number>(Date.now());

  const { user } = useAuth();
  const analysisMutation = useUnderwritingAnalysis();
  const decisionEngineMutation = useDecisionEngineRecommendations();
  const saveSessionMutation = useSaveUnderwritingSession();

  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStepIndex(0);
      setFormData({
        client: initialClientInfo,
        health: initialHealthInfo,
        coverage: initialCoverageRequest,
      });
      setErrors({});
      setAnalysisResult(null);
      analysisMutation.reset();
      decisionEngineMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset functions are stable
  }, [open]);

  // Validation functions
  const validateClientInfo = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const { client } = formData;

    if (!client.age || client.age < 1) {
      newErrors.age = "Age is required";
    } else if (client.age < 18 || client.age > 100) {
      newErrors.age = "Age must be between 18 and 100";
    }

    if (!client.gender) {
      newErrors.gender = "Gender is required";
    }

    if (!client.state) {
      newErrors.state = "State is required";
    }

    if (!client.heightFeet || client.heightFeet < 3 || client.heightFeet > 8) {
      newErrors.height = "Invalid height";
    }

    if (!client.weight || client.weight < 50 || client.weight > 600) {
      newErrors.weight = "Weight must be between 50 and 600 lbs";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateHealthInfo = useCallback((): boolean => {
    // Health info is optional, but if conditions are selected, validate follow-ups
    // For now, just return true - validation happens in the step component
    return true;
  }, []);

  const validateCoverageRequest = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const { coverage } = formData;

    if (!coverage.faceAmount || coverage.faceAmount < 10000) {
      newErrors.faceAmount = "Face amount must be at least $10,000";
    }

    if (!coverage.productTypes || coverage.productTypes.length === 0) {
      newErrors.productTypes = "Select at least one product type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateStep = useCallback(
    (stepId: WizardStep): boolean => {
      switch (stepId) {
        case "client":
          return validateClientInfo();
        case "health":
          return validateHealthInfo();
        case "coverage":
          return validateCoverageRequest();
        case "review":
          return true;
        case "results":
          return true;
        default:
          return true;
      }
    },
    [validateClientInfo, validateHealthInfo, validateCoverageRequest],
  );

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (!validateStep(currentStep.id)) {
      return;
    }

    // If we're on review step, fire both analyses in parallel
    if (currentStep.id === "review") {
      const bmi = calculateBMI(
        formData.client.heightFeet,
        formData.client.heightInches,
        formData.client.weight,
      );

      // AI Analysis request
      const aiRequest: AIAnalysisRequest = {
        client: {
          age: formData.client.age,
          gender: formData.client.gender,
          state: formData.client.state,
          bmi,
        },
        health: {
          conditions: formData.health.conditions.map((c) => ({
            code: c.conditionCode,
            responses: c.responses,
          })),
          tobacco: formData.health.tobacco,
          medications: formData.health.medications,
        },
        coverage: {
          faceAmount: formData.coverage.faceAmount,
          productTypes: formData.coverage.productTypes,
        },
        imoId: user?.imo_id || undefined,
      };

      // Decision Engine request
      const decisionInput = transformWizardToDecisionEngineInput(
        formData.client,
        formData.health,
        formData.coverage,
        user?.imo_id || "",
      );

      // Fire both mutations in parallel (non-blocking)
      analysisMutation.mutate(aiRequest, {
        onSuccess: (result) => setAnalysisResult(result),
        onError: () =>
          setErrors({
            submit: "AI analysis failed. Results may be incomplete.",
          }),
      });
      decisionEngineMutation.mutate(decisionInput);

      // Advance to results step immediately
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    setCurrentStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [
    currentStep,
    validateStep,
    formData,
    analysisMutation,
    decisionEngineMutation,
    user,
  ]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setErrors({});
  }, []);

  // Update form data
  const updateClientInfo = useCallback((updates: Partial<ClientInfo>) => {
    setFormData((prev) => ({
      ...prev,
      client: { ...prev.client, ...updates },
    }));
    setErrors({});
  }, []);

  const updateHealthInfo = useCallback((updates: Partial<HealthInfo>) => {
    setFormData((prev) => ({
      ...prev,
      health: { ...prev.health, ...updates },
    }));
    setErrors({});
  }, []);

  const updateCoverageRequest = useCallback(
    (updates: Partial<CoverageRequest>) => {
      setFormData((prev) => ({
        ...prev,
        coverage: { ...prev.coverage, ...updates },
      }));
      setErrors({});
    },
    [],
  );

  // Save session handler
  const handleSaveSession = useCallback(async () => {
    if (!analysisResult || !user?.imo_id) return;

    const bmi = calculateBMI(
      formData.client.heightFeet,
      formData.client.heightInches,
      formData.client.weight,
    );

    const sessionData: SessionSaveData = {
      clientName: formData.client.name || undefined,
      clientAge: formData.client.age,
      clientGender: formData.client.gender,
      clientState: formData.client.state,
      clientBmi: bmi,
      healthResponses: formData.health.conditions.reduce(
        (acc, c) => {
          acc[c.conditionCode] = c;
          return acc;
        },
        {} as Record<string, (typeof formData.health.conditions)[0]>,
      ),
      conditionsReported: formData.health.conditions.map(
        (c) => c.conditionCode,
      ),
      tobaccoUse: formData.health.tobacco.currentUse,
      tobaccoDetails: formData.health.tobacco,
      requestedFaceAmount: formData.coverage.faceAmount,
      requestedProductTypes: formData.coverage.productTypes,
      aiAnalysis: analysisResult,
      healthTier: analysisResult.healthTier,
      riskFactors: analysisResult.riskFactors,
      recommendations: analysisResult.recommendations,
      sessionDurationSeconds: Math.floor(
        (Date.now() - sessionStartTime) / 1000,
      ),
    };

    try {
      await saveSessionMutation.mutateAsync({
        imoId: user.imo_id,
        agencyId: user.agency_id || null,
        data: sessionData,
      });
      onOpenChange(false);
    } catch {
      setErrors({ submit: "Failed to save session. Please try again." });
    }
  }, [
    analysisResult,
    user,
    formData,
    sessionStartTime,
    saveSessionMutation,
    onOpenChange,
  ]);

  // Render current step
  const renderStepContent = () => {
    switch (currentStep.id) {
      case "client":
        return (
          <ClientInfoStep
            data={formData.client}
            onChange={updateClientInfo}
            errors={errors}
          />
        );
      case "health":
        return (
          <HealthConditionsStep
            data={formData.health}
            onChange={updateHealthInfo}
            errors={errors}
          />
        );
      case "coverage":
        return (
          <CoverageRequestStep
            data={formData.coverage}
            onChange={updateCoverageRequest}
            errors={errors}
          />
        );
      case "review":
        return (
          <ReviewStep
            clientInfo={formData.client}
            healthInfo={formData.health}
            coverageRequest={formData.coverage}
          />
        );
      case "results":
        return (
          <RecommendationsStep
            aiResult={analysisResult}
            decisionEngineResult={decisionEngineMutation.data || null}
            isDecisionEngineLoading={decisionEngineMutation.isPending}
            isAILoading={analysisMutation.isPending}
            clientInfo={formData.client}
            healthInfo={formData.health}
            coverageRequest={formData.coverage}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const isAnalyzing =
    analysisMutation.isPending || decisionEngineMutation.isPending;
  const isSaving = saveSessionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-3 flex flex-col bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        hideCloseButton
      >
        {/* Header */}
        <div className="shrink-0 pb-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 -m-3 mb-2 p-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              The Standard Underwriting Wizard (BETA)
              <span className="text-red-500">
                DO NOT USE FOR ACTUAL PRODUCT RECOMMENDATIONS
              </span>
            </DialogTitle>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-2 mt-2">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const hasError = Object.keys(errors).some((key) => {
                if (index === 0)
                  return [
                    "age",
                    "gender",
                    "state",
                    "height",
                    "weight",
                  ].includes(key);
                if (index === 2)
                  return ["faceAmount", "productTypes"].includes(key);
                return false;
              });

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-1",
                    isActive && "font-medium text-zinc-900 dark:text-zinc-100",
                    isCompleted &&
                      !isActive &&
                      "text-zinc-500 dark:text-zinc-400",
                    !isActive &&
                      !isCompleted &&
                      "text-zinc-400 dark:text-zinc-500",
                    hasError && "text-red-600 dark:text-red-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full text-[10px]",
                      isActive && "bg-blue-600 dark:bg-blue-500 text-white",
                      isCompleted &&
                        !isActive &&
                        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                      !isActive &&
                        !isCompleted &&
                        "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400",
                      hasError &&
                        "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="text-[11px] hidden sm:inline">
                    {step.label}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <span className="text-zinc-300 dark:text-zinc-600 text-[11px] ml-1">
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error display */}
          {errors.submit && (
            <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {errors.submit}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="w-full">{renderStepContent()}</div>
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 -m-3 p-3 rounded-b-lg">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="h-7 text-[11px] px-2"
              disabled={isAnalyzing || isSaving}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0 || isAnalyzing || isSaving}
                size="sm"
                className="h-7 text-[11px] px-2 border-zinc-200 dark:border-zinc-700"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleSaveSession}
                  disabled={isSaving || !analysisResult}
                  size="sm"
                  className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? "Saving..." : "Save Session"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  size="sm"
                  disabled={isAnalyzing}
                  className="h-7 text-[11px] px-3 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {currentStep.id === "review" ? (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {isAnalyzing ? "Analyzing..." : "Get Recommendations"}
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
