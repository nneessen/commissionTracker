// src/features/contracting/components/ContractLevelDisplay.tsx
// Display contract level and available products for a recruit-carrier pair

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ContractLevelDisplayProps {
  recruitId: string;
  carrierId: string;
}

export function ContractLevelDisplay({ recruitId, carrierId }: ContractLevelDisplayProps) {
  // Fetch recruit's contract level
  const { data: recruit } = useQuery({
    queryKey: ['recruit-contract-level', recruitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('contract_level, first_name, last_name')
        .eq('id', recruitId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch carrier's commission structure
  const { data: carrier } = useQuery({
    queryKey: ['carrier-commission-structure', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select('name, commission_structure')
        .eq('id', carrierId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (!recruit || !carrier) {
    return <div className="text-xs text-muted-foreground">Loading contract level...</div>;
  }

  const contractLevel = recruit.contract_level;
  const commissionStructure = carrier.commission_structure as any;

  // Handle missing contract level
  if (!contractLevel) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-xs">
          Contract level not set for {recruit.first_name} {recruit.last_name}.
          Contact admin to assign a commission tier.
        </AlertDescription>
      </Alert>
    );
  }

  // Parse commission structure (defensive)
  const getProductsForLevel = (level: number) => {
    if (!commissionStructure?.tiers) {
      return { available: [], unavailable: [] };
    }

    const available: string[] = [];
    const unavailable: string[] = [];

    commissionStructure.tiers.forEach((tier: any) => {
      const minLevel = tier.min_level || 0;
      const maxLevel = tier.max_level || 999;
      const products = tier.products || [];

      if (level >= minLevel && level <= maxLevel) {
        available.push(...products);
      } else if (level < minLevel) {
        unavailable.push(...products.map((p: string) => `${p} (requires ${minLevel}+)`));
      }
    });

    return { available: [...new Set(available)], unavailable: [...new Set(unavailable)] };
  };

  const { available, unavailable } = getProductsForLevel(contractLevel);

  return (
    <div className="space-y-4">
      {/* Contract Level Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold">Contract Level:</span>
        <Badge variant="secondary" className="text-sm font-mono">
          {contractLevel}
        </Badge>
      </div>

      {/* Available Products */}
      {available.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-success flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Available Products at This Level
          </h4>
          <ul className="space-y-1 pl-4">
            {available.map((product) => (
              <li key={product} className="text-xs text-foreground">
                • {product}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unavailable Products */}
      {unavailable.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Unavailable (Higher Level Required)
          </h4>
          <ul className="space-y-1 pl-4">
            {unavailable.map((product) => (
              <li key={product} className="text-xs text-muted-foreground">
                • {product}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback for missing structure */}
      {!commissionStructure?.tiers && (
        <Alert className="border-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No commission structure data available for {carrier.name}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
