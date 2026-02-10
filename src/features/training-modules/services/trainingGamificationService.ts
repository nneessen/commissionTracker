// src/features/training-modules/services/trainingGamificationService.ts
import { supabase } from "@/services/base";
import type {
  TrainingUserStats,
  TrainingXpEntry,
  TrainingBadge,
  TrainingUserBadge,
  LeaderboardEntry,
  SkillRadarData,
  TrainingCertification,
  TrainingUserCertification,
  TrainingChallenge,
  TrainingChallengeParticipant,
} from "../types/training-module.types";

export const trainingGamificationService = {
  async getUserStats(userId: string): Promise<TrainingUserStats | null> {
    const { data, error } = await supabase
      .from("training_user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as TrainingUserStats | null;
  },

  async getXpHistory(
    userId: string,
    limit: number,
  ): Promise<TrainingXpEntry[]> {
    const { data, error } = await supabase
      .from("training_xp_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as TrainingXpEntry[];
  },

  async listBadges(imoId: string): Promise<TrainingBadge[]> {
    const { data, error } = await supabase
      .from("training_badges")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data as TrainingBadge[];
  },

  async getUserBadges(userId: string): Promise<TrainingUserBadge[]> {
    const { data, error } = await supabase
      .from("training_user_badges")
      .select("*, badge:training_badges(*)")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });
    if (error) throw error;
    return data as unknown as TrainingUserBadge[];
  },

  async getLeaderboard(
    agencyId: string,
    period: string,
  ): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.rpc("get_training_leaderboard", {
      p_agency_id: agencyId,
      p_period: period,
    });
    if (error) throw error;
    return data as LeaderboardEntry[];
  },

  async getSkillRadarData(userId?: string): Promise<SkillRadarData[]> {
    const { data, error } = await supabase.rpc("get_skill_radar_data", {
      ...(userId ? { p_user_id: userId } : {}),
    });
    if (error) throw error;
    return data as SkillRadarData[];
  },

  async listCertifications(imoId: string): Promise<TrainingCertification[]> {
    const { data, error } = await supabase
      .from("training_certifications")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true);
    if (error) throw error;
    return data as TrainingCertification[];
  },

  async getUserCertifications(
    userId: string,
  ): Promise<TrainingUserCertification[]> {
    const { data, error } = await supabase
      .from("training_user_certifications")
      .select("*, certification:training_certifications(*)")
      .eq("user_id", userId);
    if (error) throw error;
    return data as unknown as TrainingUserCertification[];
  },

  async listChallenges(agencyId?: string): Promise<TrainingChallenge[]> {
    let query = supabase
      .from("training_challenges")
      .select("*")
      .eq("is_active", true)
      .order("end_date");
    if (agencyId) {
      query = query.eq("agency_id", agencyId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as TrainingChallenge[];
  },

  async joinChallenge(
    challengeId: string,
    userId: string,
    imoId: string,
    agencyId: string,
  ): Promise<TrainingChallengeParticipant> {
    const { data, error } = await supabase
      .from("training_challenge_participants")
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        imo_id: imoId,
        agency_id: agencyId,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingChallengeParticipant;
  },
};
