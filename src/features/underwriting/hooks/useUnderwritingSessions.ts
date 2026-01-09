// src/features/underwriting/hooks/useUnderwritingSessions.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { underwritingQueryKeys } from "./useHealthConditions";
import type {
  UnderwritingSession,
  SessionSaveData,
} from "../types/underwriting.types";

async function fetchUserSessions(
  userId: string,
): Promise<UnderwritingSession[]> {
  const { data, error } = await supabase
    .from("underwriting_sessions")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }

  return data || [];
}

async function fetchSession(sessionId: string): Promise<UnderwritingSession> {
  const { data, error } = await supabase
    .from("underwriting_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return data;
}

interface SaveSessionParams {
  imoId: string;
  agencyId: string | null;
  data: SessionSaveData;
}

async function saveSession(
  params: SaveSessionParams,
): Promise<UnderwritingSession> {
  const { imoId, agencyId, data } = params;

  const { data: session, error } = await supabase
    .from("underwriting_sessions")
    .insert({
      imo_id: imoId,
      agency_id: agencyId,
      client_name: data.clientName,
      client_age: data.clientAge,
      client_gender: data.clientGender,
      client_state: data.clientState,
      client_bmi: data.clientBmi,
      health_responses: data.healthResponses,
      conditions_reported: data.conditionsReported,
      tobacco_use: data.tobaccoUse,
      tobacco_details: data.tobaccoDetails,
      requested_face_amount: data.requestedFaceAmount,
      requested_product_types: data.requestedProductTypes,
      ai_analysis: data.aiAnalysis,
      health_tier: data.healthTier,
      risk_factors: data.riskFactors,
      recommendations: data.recommendations,
      decision_tree_id: data.decisionTreeId,
      session_duration_seconds: data.sessionDurationSeconds,
      notes: data.notes,
      status: "saved",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`);
  }

  return session;
}

/**
 * Hook to fetch the current user's underwriting sessions
 */
export function useUnderwritingSessions() {
  const { user, loading: userLoading } = useAuth();

  return useQuery({
    queryKey: underwritingQueryKeys.sessions(user?.id || ""),
    queryFn: () => fetchUserSessions(user!.id!),
    enabled: !!user?.id && !userLoading,
  });
}

/**
 * Hook to fetch a specific session by ID
 */
export function useUnderwritingSession(sessionId: string) {
  return useQuery({
    queryKey: underwritingQueryKeys.session(sessionId),
    queryFn: () => fetchSession(sessionId),
    enabled: !!sessionId,
  });
}

/**
 * Hook to save an underwriting session
 */
export function useSaveUnderwritingSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: saveSession,
    onSuccess: () => {
      // Invalidate the sessions list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: underwritingQueryKeys.sessions(user.id),
        });
      }
    },
  });
}
