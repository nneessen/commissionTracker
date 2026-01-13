// src/features/underwriting/components/UnderwritingWizard.tsx

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

// Layout and step components
import { WizardDialogLayout } from "./WizardDialogLayout";
import ClientInfoStep from "./WizardSteps/ClientInfoStep";
import HealthConditionsStep from "./WizardSteps/HealthConditionsStep";
import MedicationsStep from "./WizardSteps/MedicationsStep";
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
    // Cardiovascular
    bpMedCount: 0,
    bloodThinners: false,
    heartMeds: false,
    cholesterolMedCount: 0,
    // Diabetes
    insulinUse: false,
    oralDiabetesMeds: false,
    // Mental Health
    antidepressants: false,
    antianxiety: false,
    antipsychotics: false,
    moodStabilizers: false,
    sleepAids: false,
    adhdMeds: false,
    // Pain & Neurological
    painMedications: "none",
    seizureMeds: false,
    migraineMeds: false,
    // Respiratory
    inhalers: false,
    copdMeds: false,
    // Thyroid & Hormonal
    thyroidMeds: false,
    hormonalTherapy: false,
    steroids: false,
    // Immune & Autoimmune
    immunosuppressants: false,
    biologics: false,
    dmards: false,
    // Specialty
    cancerTreatment: false,
    antivirals: false,
    osteoporosisMeds: false,
    kidneyMeds: false,
    liverMeds: false,
  },
};

const initialCoverageRequest: CoverageRequest = {
  faceAmounts: [250000, 500000, 1000000],
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
  const [selectedTermYears, setSelectedTermYears] = useState<number | null>(
    null,
  );
  // Track if data changed since last analysis to avoid unnecessary re-runs
  const [lastAnalyzedData, setLastAnalyzedData] = useState<string | null>(null);

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
      setSelectedTermYears(null);
      setLastAnalyzedData(null);
      analysisMutation.reset();
      decisionEngineMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return true;
  }, []);

  const validateCoverageRequest = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const { coverage } = formData;

    const validAmounts = coverage.faceAmounts.filter((amt) => amt >= 10000);
    if (validAmounts.length === 0) {
      newErrors.faceAmounts =
        "At least one face amount must be $10,000 or more";
    }

    if (!coverage.productTypes || coverage.productTypes.length === 0) {
      newErrors.productTypes = "Select at least one product type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateMedications = useCallback((): boolean => {
    return true;
  }, []);

  const validateStep = useCallback(
    (stepId: WizardStep): boolean => {
      switch (stepId) {
        case "client":
          return validateClientInfo();
        case "health":
          return validateHealthInfo();
        case "medications":
          return validateMedications();
        case "coverage":
          return validateCoverageRequest();
        case "review":
        case "results":
          return true;
        default:
          return true;
      }
    },
    [
      validateClientInfo,
      validateHealthInfo,
      validateMedications,
      validateCoverageRequest,
    ],
  );

  // Create a hash of form data to detect changes
  const getDataHash = useCallback(() => {
    return JSON.stringify({
      client: formData.client,
      health: formData.health,
      coverage: formData.coverage,
    });
  }, [formData]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (!validateStep(currentStep.id)) {
      return;
    }

    if (currentStep.id === "review") {
      const currentDataHash = getDataHash();

      // If data unchanged and we have results, just navigate to results
      if (lastAnalyzedData === currentDataHash && analysisResult) {
        setCurrentStepIndex((prev) => prev + 1);
        return;
      }

      const bmi = calculateBMI(
        formData.client.heightFeet,
        formData.client.heightInches,
        formData.client.weight,
      );

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
          // Use primary (first valid) face amount for AI analysis
          faceAmount:
            formData.coverage.faceAmounts.find((a) => a >= 10000) ||
            formData.coverage.faceAmounts[0] ||
            0,
          productTypes: formData.coverage.productTypes,
        },
        imoId: user?.imo_id || undefined,
      };

      const decisionInput = transformWizardToDecisionEngineInput(
        formData.client,
        formData.health,
        formData.coverage,
        user?.imo_id || "",
        selectedTermYears,
      );

      // Track what data we're analyzing
      setLastAnalyzedData(currentDataHash);

      analysisMutation.mutate(aiRequest, {
        onSuccess: (result) => setAnalysisResult(result),
        onError: () =>
          setErrors({
            submit: "AI analysis failed. Results may be incomplete.",
          }),
      });
      decisionEngineMutation.mutate(decisionInput);

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
    selectedTermYears,
    getDataHash,
    lastAnalyzedData,
    analysisResult,
  ]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setErrors({});
  }, []);

  const canNavigateToStep = useCallback(
    (stepId: WizardStep): boolean => {
      const targetIndex = WIZARD_STEPS.findIndex((s) => s.id === stepId);
      // Can go back to any previous step
      if (targetIndex < currentStepIndex) return true;
      // Can go to results if we have results and data unchanged
      if (
        stepId === "results" &&
        analysisResult &&
        lastAnalyzedData === getDataHash()
      ) {
        return true;
      }
      return false;
    },
    [currentStepIndex, analysisResult, lastAnalyzedData, getDataHash],
  );

  // Step navigation from sidebar
  const handleStepClick = useCallback(
    (stepId: WizardStep) => {
      if (!canNavigateToStep(stepId)) return;
      const targetIndex = WIZARD_STEPS.findIndex((s) => s.id === stepId);
      setCurrentStepIndex(targetIndex);
      setErrors({});
    },
    [canNavigateToStep],
  );

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

  const updateMedications = useCallback(
    (updates: Partial<HealthInfo["medications"]>) => {
      setFormData((prev) => ({
        ...prev,
        health: {
          ...prev.health,
          medications: { ...prev.health.medications, ...updates },
        },
      }));
      setErrors({});
    },
    [],
  );

  const handleTermChange = useCallback(
    (termYears: number | null) => {
      setSelectedTermYears(termYears);
      const decisionInput = transformWizardToDecisionEngineInput(
        formData.client,
        formData.health,
        formData.coverage,
        user?.imo_id || "",
        termYears,
      );
      decisionEngineMutation.mutate(decisionInput);
    },
    [formData, user?.imo_id, decisionEngineMutation],
  );

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
      requestedFaceAmounts: formData.coverage.faceAmounts,
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
      case "medications":
        return (
          <MedicationsStep
            data={formData.health.medications}
            onChange={updateMedications}
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
            selectedTermYears={selectedTermYears}
            onTermChange={handleTermChange}
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
        className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden bg-background border-0"
        hideCloseButton
      >
        <DialogTitle className="sr-only">Underwriting Wizard</DialogTitle>

        <WizardDialogLayout
          currentStep={currentStep.id}
          onStepClick={handleStepClick}
          canNavigateToStep={canNavigateToStep}
        >
          {/* Step Content */}
          <div className="p-4">
            {/* Step Title */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                {currentStep.label}
              </h3>
              {currentStep.id === "results" && (
                <span className="text-[10px] text-red-500 ml-auto">
                  BETA - Do not use for actual recommendations
                </span>
              )}
            </div>

            {/* Error display */}
            {errors.submit && (
              <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Step Form */}
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between">
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
                className="h-7 text-[11px] px-2"
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
                  className="h-7 text-[11px] px-3 bg-amber-600 hover:bg-amber-700 text-white"
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
        </WizardDialogLayout>
      </DialogContent>
    </Dialog>
  );
}
