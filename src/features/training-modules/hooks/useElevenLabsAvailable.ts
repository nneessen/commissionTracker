// src/features/training-modules/hooks/useElevenLabsAvailable.ts
import { useQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import { useImo } from "@/contexts/ImoContext";

/**
 * Returns true if ElevenLabs TTS is configured and active for the current IMO.
 * Uses a SECURITY DEFINER RPC to avoid exposing the api_key to learners.
 */
export function useElevenLabsAvailable(): boolean {
  const { imo } = useImo();

  const { data } = useQuery({
    queryKey: ["elevenlabs-available", imo?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_elevenlabs_available", {
        p_imo_id: imo!.id,
      });
      if (error) return false;
      return !!data;
    },
    enabled: !!imo?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return data ?? false;
}
