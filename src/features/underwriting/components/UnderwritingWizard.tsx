// src/features/underwriting/components/UnderwritingWizard.tsx

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Save, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUnderwritingAnalysis,
  useSaveUnderwritingSession,
  useDecisionEngineRecommendations,
  transformWizardToDecisionEngineInput,
  useUWWizardUsage,
  getUsageStatus,
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
  UnderwritingSession,
  ConditionResponse,
  TobaccoInfo,
  ProductType,
} from "../types/underwriting.types";
import { WIZARD_STEPS } from "../types/underwriting.types";
import { safeParseJsonObject, safeParseJsonArray } from "../utils/formatters";

// Layout and step components
import { WizardDialogLayout } from "./WizardDialogLayout";
import { WizardSessionHistory } from "./SessionHistory";
import { UWLimitReachedDialog } from "./UWLimitReachedDialog";
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
  // Session history view toggle
  const [showingHistory, setShowingHistory] = useState(false);
  // Limit reached dialog
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const { user } = useAuth();
  const analysisMutation = useUnderwritingAnalysis();
  const decisionEngineMutation = useDecisionEngineRecommendations();
  const saveSessionMutation = useSaveUnderwritingSession();

  // Usage tracking for quota limits
  const { data: usageData, refetch: refetchUsage } = useUWWizardUsage();
  const usageStatus = getUsageStatus(usageData);

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
      setShowingHistory(false);
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
    const newErrors: Record<string, string> = {};

    // Check if any selected conditions have required follow-up questions that are unanswered
    for (const condition of formData.health.conditions) {
      // Find the condition definition to get its follow-up schema
      // We'll need to access the conditions from the query
      const _hasUnansweredRequired =
        condition.responses === undefined ||
        Object.keys(condition.responses).length === 0;

      // For now, we'll allow proceeding - the detailed validation happens
      // when we have access to the full condition schema
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.health.conditions]);

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

      // Check usage limit before running analysis
      if (usageData && usageData.runs_remaining <= 0) {
        setShowLimitDialog(true);
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
        onSuccess: (result) => {
          setAnalysisResult(result);
          // Refetch usage to update the badge after a run
          refetchUsage();
        },
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

    // Get top 3 rate table recommendations (from decision engine, not AI)
    const decisionEngineRecs =
      decisionEngineMutation.data?.recommendations || [];
    const topRateTableRecs = decisionEngineRecs.slice(0, 3).map((rec) => ({
      carrierName: rec.carrierName,
      productName: rec.productName,
      termYears: rec.termYears ?? null,
      healthClass: rec.healthClassResult,
      monthlyPremium: rec.monthlyPremium ?? 0,
      faceAmount: rec.maxCoverage,
      reason: rec.reason || "best_value",
    }));

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
      // Store top 3 rate table recommendations instead of AI analysis
      aiAnalysis: null,
      healthTier: analysisResult.healthTier,
      riskFactors: analysisResult.riskFactors,
      recommendations: topRateTableRecs,
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
    decisionEngineMutation.data,
    user,
    formData,
    sessionStartTime,
    saveSessionMutation,
    onOpenChange,
  ]);

  // Load a previous session into the form for editing
  const handleLoadSession = useCallback(
    (session: UnderwritingSession) => {
      // Parse height from total inches (if stored) or from BMI calculation
      const totalHeightInches = session.client_height_inches || 66; // default 5'6"
      const heightFeet = Math.floor(totalHeightInches / 12);
      const heightInches = totalHeightInches % 12;

      // Parse health responses from JSON
      const healthResponses = safeParseJsonObject<
        Record<string, ConditionResponse>
      >(session.health_responses);

      // Convert health responses back to array format
      const conditions: ConditionResponse[] = Object.values(healthResponses);

      // Parse tobacco details
      const tobaccoDetails = session.tobacco_details as TobaccoInfo | null;

      // Parse product types
      const productTypes = safeParseJsonArray<ProductType>(
        session.requested_product_types,
      );

      // Build the form data from session
      const loadedFormData: WizardFormData = {
        client: {
          name: session.client_name || "",
          dob: session.client_dob || null,
          age: session.client_age || 0,
          gender: (session.client_gender as ClientInfo["gender"]) || "",
          state: session.client_state || "",
          heightFeet,
          heightInches,
          weight: session.client_weight_lbs || 150,
        },
        health: {
          conditions,
          tobacco: tobaccoDetails || {
            currentUse: session.tobacco_use || false,
          },
          // Medications aren't stored in session - use defaults
          medications: initialHealthInfo.medications,
        },
        coverage: {
          // Session stores single face amount, convert to array with common options
          faceAmounts: session.requested_face_amount
            ? [
                session.requested_face_amount,
                session.requested_face_amount * 2,
                session.requested_face_amount * 4,
              ].filter((amt) => amt <= 5000000)
            : [250000, 500000, 1000000],
          productTypes: productTypes.length > 0 ? productTypes : ["term_life"],
        },
      };

      // Update form state
      setFormData(loadedFormData);

      // Reset analysis state since we're editing
      setAnalysisResult(null);
      setLastAnalyzedData(null);
      setSelectedTermYears(null);
      analysisMutation.reset();
      decisionEngineMutation.reset();

      // Navigate to first step and close history
      setCurrentStepIndex(0);
      setShowingHistory(false);
      setErrors({});
    },
    [analysisMutation, decisionEngineMutation],
  );

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
      <DialogContent className="max-w-7xl w-[98vw] p-0 gap-0 overflow-hidden bg-background border-0">
        <DialogTitle className="sr-only">Underwriting Wizard</DialogTitle>

        <WizardDialogLayout
          currentStep={currentStep.id}
          onStepClick={handleStepClick}
          canNavigateToStep={canNavigateToStep}
          onHistoryClick={() => setShowingHistory(!showingHistory)}
          showingHistory={showingHistory}
        >
          {showingHistory ? (
            /* Session History View */
            <WizardSessionHistory
              onClose={() => setShowingHistory(false)}
              onLoadSession={handleLoadSession}
            />
          ) : (
            <>
              {/* Step Content Container - Flex column to allow step to fill height */}
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* Step Title */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-semibold text-foreground">
                    {currentStep.label}
                  </h3>

                  {/* Usage Badge */}
                  {usageData && (
                    <Badge
                      variant={
                        usageStatus.status === "exceeded"
                          ? "destructive"
                          : usageStatus.status === "critical"
                            ? "destructive"
                            : usageStatus.status === "warning"
                              ? "outline"
                              : "secondary"
                      }
                      className={`ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 ${
                        usageStatus.status === "warning"
                          ? "border-amber-500 text-amber-600 dark:text-amber-400"
                          : ""
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      {usageData.runs_used}/{usageData.runs_limit}
                    </Badge>
                  )}

                  {currentStep.id === "results" && (
                    <span className="text-xs text-red-500">
                      BETA - Do not use for actual recommendations
                    </span>
                  )}
                </div>

                {/* Error display */}
                {errors.submit && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex-shrink-0">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.submit}
                    </p>
                  </div>
                )}

                {/* Step Form - Fills remaining height */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {renderStepContent()}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-muted/50 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  className="h-8 text-xs px-3"
                  disabled={isAnalyzing || isSaving}
                >
                  Cancel
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStepIndex === 0 || isAnalyzing || isSaving}
                    size="sm"
                    className="h-8 text-xs px-3"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Back
                  </Button>

                  {isLastStep ? (
                    <Button
                      onClick={handleSaveSession}
                      disabled={isSaving || !analysisResult}
                      size="sm"
                      className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {isSaving ? "Saving..." : "Save Session"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      size="sm"
                      disabled={isAnalyzing}
                      className="h-8 text-xs px-4 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {currentStep.id === "review" ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          {isAnalyzing ? "Analyzing..." : "Get Recommendations"}
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </WizardDialogLayout>
      </DialogContent>

      {/* Limit Reached Dialog */}
      <UWLimitReachedDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        usage={usageData ?? null}
      />
    </Dialog>
  );
}
