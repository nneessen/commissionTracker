// src/features/recruiting/hooks/useRecruitDocuments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitingService } from "@/services/recruiting";

/**
 * Validates that a string is a valid UUID format.
 * Prevents invalid IDs (like "invitation-{uuid}") from being used in database queries.
 */
const isValidUuid = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export function useRecruitDocuments(recruitId: string | undefined) {
  return useQuery({
    queryKey: ["recruits", recruitId, "documents"],
    queryFn: () => recruitingService.getRecruitDocuments(recruitId!),
    enabled: !!recruitId && isValidUuid(recruitId),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recruitId,
      file,
      documentType,
      documentName,
      uploadedBy,
      required,
      expiresAt,
    }: {
      recruitId: string;
      file: File;
      documentType: string;
      documentName: string;
      uploadedBy: string;
      required?: boolean;
      expiresAt?: string;
    }) =>
      recruitingService.uploadDocument(
        recruitId,
        file,
        documentType,
        documentName,
        uploadedBy,
        required,
        expiresAt,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruits", variables.recruitId, "documents"],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      storagePath,
    }: {
      id: string;
      storagePath: string;
      recruitId: string;
    }) => recruitingService.deleteDocument(id, storagePath),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruits", variables.recruitId, "documents"],
      });
    },
  });
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      approvalNotes,
    }: {
      id: string;
      status: "pending" | "received" | "approved" | "rejected";
      approvalNotes?: string;
      recruitId: string;
    }) => recruitingService.updateDocumentStatus(id, status, approvalNotes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruits", variables.recruitId, "documents"],
      });
    },
  });
}

export function useGetDocumentUrl(storagePath: string | null) {
  return useQuery({
    queryKey: ["document-url", storagePath],
    queryFn: () => recruitingService.getDocumentUrl(storagePath!),
    enabled: !!storagePath,
  });
}
