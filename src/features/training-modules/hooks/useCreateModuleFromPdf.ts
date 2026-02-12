// src/features/training-modules/hooks/useCreateModuleFromPdf.ts
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import {
  extractPdf,
  transformExtraction,
  seedModule,
  type SeedProgress,
  type ModuleSeedData,
} from "../services/pdfModuleService";
import type {
  ModuleCategory,
  TrainingModule,
} from "../types/training-module.types";
import { trainingModuleKeys } from "./useTrainingModules";

interface PdfImportParams {
  file: File;
  category: ModuleCategory;
}

export function useCreateModuleFromPdf() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { imo } = useImo();
  const [progress, setProgress] = useState<SeedProgress>({
    stage: "done",
    message: "",
  });

  const mutation = useMutation<TrainingModule, Error, PdfImportParams>({
    mutationFn: async ({ file, category }) => {
      if (!user?.id || !imo?.id) {
        throw new Error("Authentication required");
      }

      // Step 1: Extract
      setProgress({
        stage: "extracting",
        message: "Uploading and extracting PDF...",
      });
      const extraction = await extractPdf(file);

      // Step 2: Transform
      setProgress({
        stage: "transforming",
        message: "Transforming content...",
      });
      const seedData: ModuleSeedData = transformExtraction(
        extraction,
        category,
      );

      // Step 3: Seed
      setProgress({
        stage: "inserting",
        message: "Creating module...",
        lessonProgress: { current: 0, total: seedData.lessons.length },
      });
      const mod = await seedModule(seedData, user.id, imo.id, setProgress);

      setProgress({ stage: "done", message: "Module created!" });
      return mod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      toast.success("Module imported from PDF");
    },
    onError: (error) => {
      setProgress({ stage: "error", message: error.message });
      toast.error("PDF import failed: " + error.message);
    },
  });

  return { mutation, progress };
}
