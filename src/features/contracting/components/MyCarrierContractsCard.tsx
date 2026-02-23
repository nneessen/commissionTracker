// src/features/contracting/components/MyCarrierContractsCard.tsx
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Loader2, Briefcase } from "lucide-react";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import {
  useAgentContracts,
  useToggleAgentContract,
} from "../hooks/useContracts";

interface MyCarrierContractsCardProps {
  agentId: string;
}

export function MyCarrierContractsCard({
  agentId,
}: MyCarrierContractsCardProps) {
  // Fetch all active carriers for the agent's IMO
  const { data: carriers, isLoading: carriersLoading } = useQuery({
    queryKey: ["my-imo-carriers", agentId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("imo_id")
        .eq("id", agentId)
        .single();

      if (!profile?.imo_id) return [];

      const { data, error } = await supabase
        .from("carriers")
        .select("id, name")
        .eq("imo_id", profile.imo_id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!agentId,
  });

  const { data: contracts, isLoading: contractsLoading } =
    useAgentContracts(agentId);

  const toggleContract = useToggleAgentContract(agentId);

  const isLoading = carriersLoading || contractsLoading;

  const contractMap = new Map((contracts || []).map((c) => [c.carrier_id, c]));

  const handleToggle = (carrierId: string, currentlyActive: boolean) => {
    toggleContract.mutate({
      carrierId,
      active: !currentlyActive,
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
        <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          My Carrier Contracts
        </h3>
      </div>

      {isLoading ? (
        <div className="p-4 text-center">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400 mx-auto" />
        </div>
      ) : !carriers || carriers.length === 0 ? (
        <div className="p-3 text-center">
          <p className="text-[10px] text-zinc-500">
            No carriers configured for your organization
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {carriers.map((carrier) => {
            const contract = contractMap.get(carrier.id);
            const isActive = contract?.status === "approved";
            const writingNumber = contract?.writing_number;

            return (
              <div
                key={carrier.id}
                className="flex items-center justify-between px-3 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {carrier.name}
                  </p>
                  {writingNumber && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      #{writingNumber}
                    </p>
                  )}
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={() => handleToggle(carrier.id, isActive)}
                  disabled={toggleContract.isPending}
                  className="scale-75"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-[9px] text-zinc-400">
          Toggle carriers you are actively contracted with. This helps your
          downline see which carriers are available.
        </p>
      </div>
    </div>
  );
}
